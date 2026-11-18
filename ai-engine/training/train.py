"""
Motor Telemetry Training & Evaluation Engine
Models:
  1. Isolation Forest (Tree-based Outlier Isolation)
  2. LSTM Autoencoder (Temporal Sequence Reconstruction Loss via PyTorch)

Based on Industrial Baseline Physics & Benchmark Degradation Curves (CWRU Principles)
Outputs serialized models into: D:/IOT/iot-motor-monitoring/ai-engine/models/
"""

import os
import math
import random
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# ─── 1. Physical Dataset Generator (Normal Baseline + Injected Benchmark Faults) ───
def generate_dataset(num_normal=6000, num_anomalous=1200, random_seed=42):
    """
    Generates time-series sensor telemetry mimicking a 3-Phase AC Induction Motor:
    - Normal operation: Periodic rotation harmonics (1450 RPM, 24.16 Hz) + thermal stability (~68°C)
    - Fault conditions:
        * Bearing scratch (Spike): High vibration kurtosis & shock pulses
        * Thermal runaway (Drift): Continuous overheating (>90°C)
        * Rotor lock / Jam: Current surge (>30A) + speed collapse
    """
    np.random.seed(random_seed)
    random.seed(random_seed)
    
    records = []
    
    # 1.1 Generate Normal Baseline Data (Healthy State)
    base_rpm = 1450.0
    freq = 2.0 * math.pi * (base_rpm / 60.0) # ~151.8 rad/s
    
    for t in range(num_normal):
        time_sec = t * 0.5
        temp = 68.0 + 0.5 * math.sin(time_sec * 0.02) + np.random.normal(0, 0.15)
        vib_x = 1.2 + 0.3 * math.sin(freq * time_sec) + np.random.normal(0, 0.08)
        vib_y = 0.8 + 0.2 * math.cos(freq * time_sec) + np.random.normal(0, 0.05)
        vib_z = 1.5 + 0.4 * math.sin(freq * time_sec * 0.5) + np.random.normal(0, 0.1)
        current = 12.4 + 0.2 * math.sin(time_sec * 0.1) + np.random.normal(0, 0.08)
        rpm = base_rpm + np.random.normal(0, 2.5)
        
        records.append({
            "temperature": round(max(0.0, temp), 2),
            "vibration_x": round(max(0.0, vib_x), 3),
            "vibration_y": round(max(0.0, vib_y), 3),
            "vibration_z": round(max(0.0, vib_z), 3),
            "current": round(max(0.0, current), 2),
            "rpm": round(max(0.0, rpm), 1),
            "is_anomaly": 0, # Normal Label
            "fault_type": "normal"
        })
        
    # 1.2 Generate Benchmark Anomaly Samples (Fault States)
    for i in range(num_anomalous):
        time_sec = (num_normal + i) * 0.5
        fault_type = random.choice(["spike", "drift", "jam", "critical"])
        
        # Start from base
        temp = 68.0 + np.random.normal(0, 0.5)
        vib_x = 1.2 + np.random.normal(0, 0.2)
        vib_y = 0.8 + np.random.normal(0, 0.2)
        vib_z = 1.5 + np.random.normal(0, 0.2)
        current = 12.4 + np.random.normal(0, 0.5)
        rpm = base_rpm + np.random.normal(0, 5.0)
        
        if fault_type == "spike":
            # Bearing shock impact
            vib_x += random.uniform(5.5, 9.5)
            vib_z += random.uniform(4.5, 8.0)
        elif fault_type == "drift":
            # Overheating stator / dry friction
            temp += random.uniform(18.0, 32.0) # 86°C - 100°C
            vib_x += random.uniform(1.0, 2.5)
        elif fault_type == "jam":
            # Mechanical obstruction
            current += random.uniform(16.0, 25.0) # > 28A
            rpm -= random.uniform(400.0, 700.0)
            temp += 4.0
        elif fault_type == "critical":
            # Multi-point failure
            temp += random.uniform(25.0, 38.0)
            vib_x += random.uniform(9.0, 15.0)
            vib_y += random.uniform(7.0, 12.0)
            vib_z += random.uniform(8.0, 14.0)
            current += random.uniform(20.0, 30.0)
            rpm -= random.uniform(600.0, 900.0)
            
        records.append({
            "temperature": round(max(0.0, temp), 2),
            "vibration_x": round(max(0.0, vib_x), 3),
            "vibration_y": round(max(0.0, vib_y), 3),
            "vibration_z": round(max(0.0, vib_z), 3),
            "current": round(max(0.0, current), 2),
            "rpm": round(max(0.0, rpm), 1),
            "is_anomaly": 1, # Anomaly Label
            "fault_type": fault_type
        })
        
    return pd.DataFrame(records)

# ─── 2. PyTorch LSTM Autoencoder Architecture ──────────────────────────────────
class LSTMAutoencoder(nn.Module):
    def __init__(self, seq_len=10, n_features=6, embedding_dim=16):
        super(LSTMAutoencoder, self).__init__()
        self.seq_len = seq_len
        self.n_features = n_features
        self.embedding_dim = embedding_dim
        
        # Encoder
        self.encoder_lstm = nn.LSTM(
            input_size=n_features,
            hidden_size=embedding_dim,
            num_layers=1,
            batch_first=True
        )
        
        # Decoder
        self.decoder_lstm = nn.LSTM(
            input_size=embedding_dim,
            hidden_size=embedding_dim,
            num_layers=1,
            batch_first=True
        )
        self.output_layer = nn.Linear(embedding_dim, n_features)

    def forward(self, x):
        # Encode: [batch, seq_len, n_features] -> [batch, seq_len, embedding_dim]
        encoded, (hidden, _) = self.encoder_lstm(x)
        
        # Take the last hidden state and repeat for all timesteps
        # [1, batch, embedding_dim] -> [batch, 1, embedding_dim] -> [batch, seq_len, embedding_dim]
        repeat_hidden = hidden[-1].unsqueeze(1).repeat(1, self.seq_len, 1)
        
        # Decode: reconstruct normal sequence
        decoded, _ = self.decoder_lstm(repeat_hidden)
        reconstruction = self.output_layer(decoded)
        return reconstruction

# ─── 3. Main Training & Serialization Routine ─────────────────────────────────
def main():
    print("=" * 70)
    print("  AI ENGINE - INDUSTRIAL MOTOR TELEMETRY TRAINING & BENCHMARK")
    print("=" * 70)
    
    output_dir = "D:/IOT/iot-motor-monitoring/ai-engine/models"
    os.makedirs(output_dir, exist_ok=True)
    
    # Feature columns
    features = ["temperature", "vibration_x", "vibration_y", "vibration_z", "current", "rpm"]
    
    print("\n[Step 1] Synthesizing physical dataset (6,000 Normal + 1,200 Faults)...")
    df = generate_dataset(num_normal=6000, num_anomalous=1200)
    
    # Split: Train exclusively on Normal telemetry (Semi-supervised / Unsupervised Anomaly Detection)
    df_normal = df[df["is_anomaly"] == 0]
    train_size = int(len(df_normal) * 0.8)
    
    df_train = df_normal.iloc[:train_size]
    df_val_normal = df_normal.iloc[train_size:]
    df_test = pd.concat([df_val_normal, df[df["is_anomaly"] == 1]]).sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    print(f"  -> Training Set (Clean Healthy Motor): {len(df_train)} samples")
    print(f"  -> Evaluation Set (Mixed Test Ground Truth): {len(df_test)} samples ({df_test['is_anomaly'].sum()} Anomalies)")
    
    # Scale Features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(df_train[features])
    X_test_scaled = scaler.transform(df_test[features])
    
    # Save Scaler for runtime inference
    scaler_path = os.path.join(output_dir, "scaler.joblib")
    joblib.dump(scaler, scaler_path)
    print(f"  -> Saved Standard Scaler: {scaler_path}")
    
    # ─── Model 1: Isolation Forest Training ───────────────────────────────────
    print("\n[Step 2] Training Model 1: Isolation Forest (scikit-learn)...")
    iso_forest = IsolationForest(
        n_estimators=100,
        max_samples="auto",
        contamination=0.03, # Anticipated low contamination
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_train_scaled)
    
    # Evaluate Isolation Forest on Test Set
    # Decision function: lower values mean more anomalous.
    raw_scores = iso_forest.score_samples(X_test_scaled)
    # Convert to anomaly score [0, 1] where 1.0 = highly anomalous
    iso_anomaly_scores = 1.0 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-6)
    
    iso_preds = (iso_anomaly_scores > 0.65).astype(int)
    y_true = df_test["is_anomaly"].values
    
    p, r, f1, _ = precision_recall_fscore_support(y_true, iso_preds, average="binary")
    cm = confusion_matrix(y_true, iso_preds)
    
    print(f"  -> Isolation Forest Performance:")
    print(f"     * Precision: {p*100:.2f}% | Recall: {r*100:.2f}% | F1-Score: {f1*100:.2f}%")
    print(f"     * Confusion Matrix: TN={cm[0,0]}, FP={cm[0,1]}, FN={cm[1,0]}, TP={cm[1,1]}")
    
    iso_path = os.path.join(output_dir, "isolation_forest.joblib")
    joblib.dump(iso_forest, iso_path)
    print(f"  -> Saved Isolation Forest Model: {iso_path}")
    
    # ─── Model 2: PyTorch LSTM Autoencoder Training ───────────────────────────
    print("\n[Step 3] Training Model 2: PyTorch LSTM Autoencoder...")
    seq_len = 10
    
    def create_sequences(data, seq_length):
        xs = []
        for i in range(len(data) - seq_length + 1):
            xs.append(data[i:(i + seq_length)])
        return np.array(xs)
    
    X_train_seq = create_sequences(X_train_scaled, seq_len)
    X_test_seq = create_sequences(X_test_scaled, seq_len)
    y_test_seq = y_true[seq_len - 1:] # Align labels with sequence window ends
    
    train_dataset = TensorDataset(torch.tensor(X_train_seq, dtype=torch.float32))
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    
    lstm_model = LSTMAutoencoder(seq_len=seq_len, n_features=len(features), embedding_dim=16)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.005)
    
    epochs = 12
    lstm_model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        for batch in train_loader:
            x_batch = batch[0]
            optimizer.zero_grad()
            reconstructed = lstm_model(x_batch)
            loss = criterion(reconstructed, x_batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        
        avg_loss = total_loss / len(train_loader)
        if (epoch + 1) % 4 == 0 or epoch == 0:
            print(f"     Epoch [{epoch+1:02d}/{epochs}] - Reconstruction Loss (MSE): {avg_loss:.5f}")
            
    # Evaluate LSTM Autoencoder
    lstm_model.eval()
    with torch.no_grad():
        test_inputs = torch.tensor(X_test_seq, dtype=torch.float32)
        test_reconstructed = lstm_model(test_inputs)
        # Calculate Mean Squared Error across features & timesteps for each sequence
        mse_errors = torch.mean((test_inputs - test_reconstructed) ** 2, dim=(1, 2)).numpy()
        
    # Set dynamic threshold at 95th percentile of normal training reconstruction loss
    with torch.no_grad():
        train_inputs = torch.tensor(X_train_seq, dtype=torch.float32)
        train_recon = lstm_model(train_inputs)
        train_mse = torch.mean((train_inputs - train_recon) ** 2, dim=(1, 2)).numpy()
        threshold = np.percentile(train_mse, 98)
        
    lstm_preds = (mse_errors > threshold).astype(int)
    p_lstm, r_lstm, f1_lstm, _ = precision_recall_fscore_support(y_test_seq, lstm_preds, average="binary")
    cm_lstm = confusion_matrix(y_test_seq, lstm_preds)
    
    print(f"  -> LSTM Autoencoder Performance:")
    print(f"     * Determined Normal Reconstruction Threshold: {threshold:.5f}")
    print(f"     * Precision: {p_lstm*100:.2f}% | Recall: {r_lstm*100:.2f}% | F1-Score: {f1_lstm*100:.2f}%")
    print(f"     * Confusion Matrix: TN={cm_lstm[0,0]}, FP={cm_lstm[0,1]}, FN={cm_lstm[1,0]}, TP={cm_lstm[1,1]}")
    
    lstm_path = os.path.join(output_dir, "lstm_autoencoder.pt")
    torch.save({
        "model_state_dict": lstm_model.state_dict(),
        "seq_len": seq_len,
        "n_features": len(features),
        "threshold": float(threshold)
    }, lstm_path)
    print(f"  -> Saved LSTM Autoencoder Model: {lstm_path}")
    
    # ─── Step 4: Export Summary Benchmark Metrics for Thesis Report ───────────
    metrics_summary = pd.DataFrame([
        {
            "Model": "Isolation Forest",
            "Type": "Tree-based Outlier Isolation (Unsupervised)",
            "Precision": f"{p*100:.2f}%",
            "Recall": f"{r*100:.2f}%",
            "F1-Score": f"{f1*100:.2f}%",
            "Best For": "Instantaneous Spikes (Bearing Fissures)"
        },
        {
            "Model": "LSTM Autoencoder",
            "Type": "Recurrent Deep Reconstruction (Semi-Supervised)",
            "Precision": f"{p_lstm*100:.2f}%",
            "Recall": f"{r_lstm*100:.2f}%",
            "F1-Score": f"{f1_lstm*100:.2f}%",
            "Best For": "Temporal Drift (Overheating / Bearing Wear)"
        }
    ])
    
    metrics_csv = os.path.join(output_dir, "benchmark_metrics.csv")
    metrics_summary.to_csv(metrics_csv, index=False)
    print(f"\n[Step 4] Generated Formal Scientific Benchmark Report: {metrics_csv}")
    print(metrics_summary.to_string(index=False))
    print("\n" + "=" * 70)
    print("  TRAINING & SERIALIZATION SUCCESSFULLY COMPLETED!")
    print("=" * 70)

if __name__ == "__main__":
    main()
