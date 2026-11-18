"""
Retrain Isolation Forest and PyTorch LSTM Autoencoder on Official CWRU Bearing Dataset
Inputs: D:/IOT/iot-motor-monitoring/ai-engine/data/cwru_full_dataset.csv
Outputs: Updated serialized models (.joblib, .pt) in ai-engine/models/
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix, accuracy_score

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

class LSTMAutoencoder(nn.Module):
    def __init__(self, seq_len=10, n_features=6, embedding_dim=16):
        super(LSTMAutoencoder, self).__init__()
        self.seq_len = seq_len
        self.n_features = n_features
        self.encoder_lstm = nn.LSTM(input_size=n_features, hidden_size=embedding_dim, num_layers=1, batch_first=True)
        self.decoder_lstm = nn.LSTM(input_size=embedding_dim, hidden_size=embedding_dim, num_layers=1, batch_first=True)
        self.output_layer = nn.Linear(embedding_dim, n_features)

    def forward(self, x):
        _, (hidden, _) = self.encoder_lstm(x)
        repeat_hidden = hidden[-1].unsqueeze(1).repeat(1, self.seq_len, 1)
        decoded, _ = self.decoder_lstm(repeat_hidden)
        return self.output_layer(decoded)

def main():
    print("=" * 70)
    print("  TRAINING AI ENGINE ON REAL CWRU BEARING DATASET (USA BENCHMARK)")
    print("=" * 70)

    data_path = "D:/IOT/iot-motor-monitoring/ai-engine/data/cwru_full_dataset.csv"
    output_dir = "D:/IOT/iot-motor-monitoring/ai-engine/models"
    os.makedirs(output_dir, exist_ok=True)

    df = pd.read_csv(data_path)
    features = ["temperature", "vibration_x", "vibration_y", "vibration_z", "current", "rpm"]
    
    print(f"Loaded Real CWRU Dataset: {len(df)} samples")
    print(f"Normal (Healthy): {len(df[df['is_anomaly'] == 0])} | Faulty: {len(df[df['is_anomaly'] == 1])}")

    # Split Normal Data: 80% Train, 20% Val
    df_normal = df[df["is_anomaly"] == 0]
    train_size = int(len(df_normal) * 0.8)
    
    df_train = df_normal.iloc[:train_size]
    df_val_normal = df_normal.iloc[train_size:]
    
    # Test set: remaining normal + all real CWRU faults
    df_test = pd.concat([df_val_normal, df[df["is_anomaly"] == 1]]).sample(frac=1.0, random_state=42).reset_index(drop=True)

    # 1. Standard Scaler on Normal Bearing Physics
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(df_train[features])
    X_test_scaled = scaler.transform(df_test[features])
    
    scaler_path = os.path.join(output_dir, "scaler.joblib")
    joblib.dump(scaler, scaler_path)
    print(f"[1/4] Fitted & Saved StandardScaler: {scaler_path}")

    # 2. Train Isolation Forest
    print("\n[2/4] Training Isolation Forest on CWRU Baseline...")
    iso_model = IsolationForest(
        n_estimators=150,
        contamination=0.02,
        random_state=42,
        n_jobs=-1
    )
    iso_model.fit(X_train_scaled)

    raw_scores = iso_model.score_samples(X_test_scaled)
    iso_scores = 1.0 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-6)
    iso_preds = (iso_scores > 0.65).astype(int)
    y_test = df_test["is_anomaly"].values

    p_iso, r_iso, f1_iso, _ = precision_recall_fscore_support(y_test, iso_preds, average="binary")
    acc_iso = accuracy_score(y_test, iso_preds)
    cm_iso = confusion_matrix(y_test, iso_preds)

    print(f"  -> CWRU Isolation Forest Metrics:")
    print(f"     * Accuracy: {acc_iso*100:.2f}% | Precision: {p_iso*100:.2f}% | Recall: {r_iso*100:.2f}% | F1: {f1_iso*100:.2f}%")
    print(f"     * Confusion Matrix: TN={cm_iso[0,0]}, FP={cm_iso[0,1]}, FN={cm_iso[1,0]}, TP={cm_iso[1,1]}")

    iso_path = os.path.join(output_dir, "isolation_forest.joblib")
    joblib.dump(iso_model, iso_path)
    print(f"  -> Saved CWRU Isolation Forest: {iso_path}")

    # 3. Train PyTorch LSTM Autoencoder on CWRU Time Sequences
    print("\n[3/4] Training PyTorch LSTM Autoencoder on CWRU Sequences...")
    seq_len = 10
    def create_seq(data, length):
        return np.array([data[i:i+length] for i in range(len(data)-length+1)])

    X_train_seq = create_seq(X_train_scaled, seq_len)
    X_test_seq = create_seq(X_test_scaled, seq_len)
    y_test_seq = y_test[seq_len - 1:]

    train_loader = DataLoader(TensorDataset(torch.tensor(X_train_seq, dtype=torch.float32)), batch_size=32, shuffle=True)
    lstm_model = LSTMAutoencoder(seq_len=seq_len, n_features=len(features), embedding_dim=16)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.003)

    epochs = 15
    lstm_model.train()
    for ep in range(epochs):
        total_loss = 0.0
        for batch in train_loader:
            x_b = batch[0]
            optimizer.zero_grad()
            out = lstm_model(x_b)
            loss = criterion(out, x_b)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        if (ep + 1) % 5 == 0 or ep == 0:
            print(f"     Epoch [{ep+1:02d}/{epochs}] - Loss (MSE): {total_loss / len(train_loader):.5f}")

    # Evaluate LSTM Autoencoder
    lstm_model.eval()
    with torch.no_grad():
        train_recon = lstm_model(torch.tensor(X_train_seq, dtype=torch.float32))
        train_mse = torch.mean((torch.tensor(X_train_seq, dtype=torch.float32) - train_recon) ** 2, dim=(1, 2)).numpy()
        threshold = np.percentile(train_mse, 95) # 95th percentile threshold

        test_in = torch.tensor(X_test_seq, dtype=torch.float32)
        test_out = lstm_model(test_in)
        test_mse = torch.mean((test_in - test_out) ** 2, dim=(1, 2)).numpy()

    lstm_preds = (test_mse > threshold).astype(int)
    p_lstm, r_lstm, f1_lstm, _ = precision_recall_fscore_support(y_test_seq, lstm_preds, average="binary")
    acc_lstm = accuracy_score(y_test_seq, lstm_preds)
    cm_lstm = confusion_matrix(y_test_seq, lstm_preds)

    print(f"  -> CWRU LSTM Autoencoder Metrics:")
    print(f"     * Determined Reconstruction Threshold: {threshold:.5f}")
    print(f"     * Accuracy: {acc_lstm*100:.2f}% | Precision: {p_lstm*100:.2f}% | Recall: {r_lstm*100:.2f}% | F1: {f1_lstm*100:.2f}%")
    print(f"     * Confusion Matrix: TN={cm_lstm[0,0]}, FP={cm_lstm[0,1]}, FN={cm_lstm[1,0]}, TP={cm_lstm[1,1]}")

    lstm_path = os.path.join(output_dir, "lstm_autoencoder.pt")
    torch.save({
        "model_state_dict": lstm_model.state_dict(),
        "seq_len": seq_len,
        "n_features": len(features),
        "threshold": float(threshold)
    }, lstm_path)
    print(f"  -> Saved CWRU LSTM Autoencoder: {lstm_path}")

    # 4. Generate CWRU Benchmark Report
    print("\n[4/4] Updating Benchmark Report with Official CWRU Results...")
    report_csv = os.path.join(output_dir, "cwru_benchmark_metrics.csv")
    metrics_df = pd.DataFrame([
        {
            "Dataset": "CWRU Bearing Data Center (USA)",
            "Model": "Isolation Forest",
            "Accuracy": f"{acc_iso*100:.2f}%",
            "Precision": f"{p_iso*100:.2f}%",
            "Recall": f"{r_iso*100:.2f}%",
            "F1-Score": f"{f1_iso*100:.2f}%",
            "Target Faults": "Inner/Outer Race Spikes & Impacts"
        },
        {
            "Dataset": "CWRU Bearing Data Center (USA)",
            "Model": "LSTM Autoencoder",
            "Accuracy": f"{acc_lstm*100:.2f}%",
            "Precision": f"{p_lstm*100:.2f}%",
            "Recall": f"{r_lstm*100:.2f}%",
            "F1-Score": f"{f1_lstm*100:.2f}%",
            "Target Faults": "Sequential Degradation & Wear"
        }
    ])
    metrics_df.to_csv(report_csv, index=False)
    print(metrics_df.to_string(index=False))
    print("\n" + "=" * 70)
    print("  OFFICIAL CWRU TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
