"""
Real-Time AI Anomaly Detection Microservice (FastAPI)
Dual-Tier Machine Learning Engine for Industrial Motor Telemetry:
  1. Isolation Forest: Point Anomaly & Rapid Vibration Shock
  2. PyTorch LSTM Autoencoder: Sequential Degradation & Reconstruction Drift
Trained on official CWRU (Case Western Reserve University) Bearing Dataset.
"""

import os
import time
from collections import deque
from typing import Dict, List, Optional

import joblib
import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ─── Model Definition ──────────────────────────────────────────────────────────
class LSTMAutoencoder(nn.Module):
    def __init__(self, seq_len: int = 10, n_features: int = 6, embedding_dim: int = 16):
        super(LSTMAutoencoder, self).__init__()
        self.seq_len = seq_len
        self.n_features = n_features
        self.encoder_lstm = nn.LSTM(
            input_size=n_features, hidden_size=embedding_dim, num_layers=1, batch_first=True
        )
        self.decoder_lstm = nn.LSTM(
            input_size=embedding_dim, hidden_size=embedding_dim, num_layers=1, batch_first=True
        )
        self.output_layer = nn.Linear(embedding_dim, n_features)

    def forward(self, x):
        _, (hidden, _) = self.encoder_lstm(x)
        repeat_hidden = hidden[-1].unsqueeze(1).repeat(1, self.seq_len, 1)
        decoded, _ = self.decoder_lstm(repeat_hidden)
        return self.output_layer(decoded)


# ─── Schemas ──────────────────────────────────────────────────────────────────
class SensorMetric(BaseModel):
    temperature: float = Field(..., description="Stator temperature in deg C")
    vibration_x: float = Field(..., description="Vibration RMS on X axis in mm/s")
    vibration_y: float = Field(..., description="Vibration RMS on Y axis in mm/s")
    vibration_z: float = Field(..., description="Vibration RMS on Z axis in mm/s")
    current: float = Field(..., description="Motor load current in Amperes")
    rpm: float = Field(..., description="Rotational speed in RPM")


class PredictRequest(BaseModel):
    deviceId: str = Field(default="motor-ind-001", description="Device identifier")
    timestamp: Optional[int] = None
    metrics: SensorMetric
    window: Optional[List[SensorMetric]] = None


class PredictResponse(BaseModel):
    deviceId: str
    anomalyScore: float
    isAnomaly: bool
    severity: str
    faultType: Optional[str]
    rootCause: str
    latencyMs: float
    details: Dict[str, float]


# ─── App Initialization ────────────────────────────────────────────────────────
app = FastAPI(
    title="IIoT Predictive Maintenance AI Engine",
    description="Real-Time Machine Learning Inference API for Motor Anomaly Detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models and buffers
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

scaler = None
iso_model = None
lstm_model = None
lstm_threshold: float = 0.95665

# Calibration baselines for Isolation Forest on CWRU
ISO_MIN_BASELINE = -0.7541
ISO_MAX_BASELINE = -0.3737

# Sliding window buffer per device (holds up to 10 latest readings)
device_buffers: Dict[str, deque] = {}


@app.on_event("startup")
def load_models():
    global scaler, iso_model, lstm_model, lstm_threshold
    print("[AI-ENGINE] Loading serialized models from:", MODELS_DIR)

    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    iso_path = os.path.join(MODELS_DIR, "isolation_forest.joblib")
    lstm_path = os.path.join(MODELS_DIR, "lstm_autoencoder.pt")

    if not all(os.path.exists(p) for p in [scaler_path, iso_path, lstm_path]):
        raise RuntimeError("Model files not found in ai-engine/models/. Run training first.")

    scaler = joblib.load(scaler_path)
    iso_model = joblib.load(iso_path)

    lstm_chk = torch.load(lstm_path, map_location="cpu")
    lstm_model = LSTMAutoencoder(
        seq_len=lstm_chk.get("seq_len", 10),
        n_features=lstm_chk.get("n_features", 6),
        embedding_dim=16,
    )
    lstm_model.load_state_dict(lstm_chk["model_state_dict"])
    lstm_model.eval()
    lstm_threshold = float(lstm_chk.get("threshold", 0.95665))

    print(f"[AI-ENGINE] Models loaded successfully! LSTM Threshold: {lstm_threshold:.5f}")


# ─── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-engine-inference",
        "models": {
            "isolation_forest": "loaded" if iso_model else "unloaded",
            "lstm_autoencoder": "loaded" if lstm_model else "unloaded",
            "scaler": "loaded" if scaler else "unloaded",
            "threshold": lstm_threshold,
        },
        "dataset": "CWRU Bearing Data Center (Case Western Reserve University, USA)",
    }


@app.post("/api/reset")
def reset_buffers(device_id: Optional[str] = None):
    """Clear sliding window buffers on operator reset."""
    if device_id and device_id in device_buffers:
        device_buffers[device_id].clear()
    else:
        device_buffers.clear()
    return {"status": "ok", "message": "Inference buffers reset successfully."}


@app.post("/api/predict", response_model=PredictResponse)
def predict_anomaly(req: PredictRequest):
    t0 = time.perf_counter()

    if scaler is None or iso_model is None or lstm_model is None:
        raise HTTPException(status_code=503, detail="Models are not loaded yet.")

    device_id = req.deviceId
    if device_id not in device_buffers:
        device_buffers[device_id] = deque(maxlen=10)

    # Current single metric array
    curr = req.metrics
    raw_reading = np.array([
        curr.temperature,
        curr.vibration_x,
        curr.vibration_y,
        curr.vibration_z,
        curr.current,
        curr.rpm,
    ])

    device_buffers[device_id].append(raw_reading)

    # Prepare 10-step sequence for LSTM
    buf = device_buffers[device_id]
    if len(buf) < 10:
        # Pad by repeating the latest reading
        needed = 10 - len(buf)
        seq_list = [raw_reading] * needed + list(buf)
    else:
        seq_list = list(buf)

    seq_arr = np.array(seq_list)  # shape (10, 6)

    # Scale data
    try:
        seq_scaled = scaler.transform(seq_arr)
        curr_scaled = seq_scaled[-1:].reshape(1, -1)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Scaling error: {str(e)}")

    # 1. Isolation Forest Inference
    iso_raw = float(iso_model.score_samples(curr_scaled)[0])
    if iso_raw >= -0.60:
        iso_score = 0.02 + 0.23 * max(0.0, (-0.3737 - iso_raw) / (-0.3737 - (-0.60)))
    else:
        iso_score = 0.70 + 0.30 * min(1.0, max(0.0, (-0.60 - iso_raw) / (-0.60 - (-0.7541))))
    iso_score = float(np.clip(iso_score, 0.0, 1.0))

    # 2. LSTM Autoencoder Inference
    t_seq = torch.tensor(seq_scaled.reshape(1, 10, 6), dtype=torch.float32)
    with torch.no_grad():
        recon = lstm_model(t_seq)
        mse_loss = float(torch.mean((t_seq - recon) ** 2).item())

    # Map MSE loss to [0.0, 1.0] score
    # Healthy operational reconstruction MSE is <= 5.0; CWRU mechanical faults exceed 1,000+
    effective_threshold = max(lstm_threshold, 5.0)
    if mse_loss <= effective_threshold:
        lstm_score = 0.02 + 0.23 * min(1.0, max(0.0, mse_loss / effective_threshold))
    else:
        lstm_score = 0.75 + 0.24 * min(1.0, max(0.0, (mse_loss - effective_threshold) / 100.0))
    lstm_score = float(np.clip(lstm_score, 0.0, 1.0))

    # 3. Dual-Tier Ensemble Fusion
    # During initial warm-up (< 10 readings), rely on Isolation Forest to prevent false warm-up alarms
    if len(device_buffers[device_id]) < 10:
        final_score = round(iso_score, 3)
    else:
        final_score = round(max(iso_score, lstm_score), 3)

    # 4. Severity & Root-Cause Classification
    if final_score >= 0.85:
        severity = "CRITICAL"
        is_anomaly = True
    elif final_score >= 0.65:
        severity = "HIGH"
        is_anomaly = True
    elif final_score >= 0.40:
        severity = "MEDIUM"
        is_anomaly = False
    else:
        severity = "NORMAL"
        is_anomaly = False

    # Root-cause diagnostic heuristics based on physical readings
    fault_type = None
    if is_anomaly:
        max_vib = max(curr.vibration_x, curr.vibration_y, curr.vibration_z)
        if max_vib > 4.5:
            fault_type = "bearing_defect"
            root_cause = (
                f"Severe vibration shock ({max_vib:.2f} mm/s). "
                "CWRU pattern indicates inner/outer race fatigue crack."
            )
        elif curr.temperature > 85.0:
            fault_type = "thermal_overload"
            root_cause = (
                f"Stator temperature ({curr.temperature:.1f} °C) exceeds thermal threshold. "
                "Cooling degradation or persistent over-current."
            )
        elif curr.current > 25.0 and curr.rpm < 1200.0:
            fault_type = "rotor_jam"
            root_cause = (
                f"High draw ({curr.current:.1f} A) with reduced speed ({curr.rpm:.0f} RPM). "
                "Mechanical rotor jamming or excessive load torque."
            )
        else:
            fault_type = "general_mechanical_wear"
            root_cause = "Multivariate telemetry pattern deviating significantly from nominal baseline."
    else:
        root_cause = "All telemetry metrics within nominal operational bounds."

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    return PredictResponse(
        deviceId=device_id,
        anomalyScore=final_score,
        isAnomaly=is_anomaly,
        severity=severity,
        faultType=fault_type,
        rootCause=root_cause,
        latencyMs=latency_ms,
        details={
            "iso_raw_score": round(iso_raw, 4),
            "iso_anomaly_score": round(iso_score, 3),
            "lstm_reconstruction_error": round(mse_loss, 4),
            "lstm_threshold": round(lstm_threshold, 4),
            "lstm_anomaly_score": round(lstm_score, 3),
        },
    )


if __name__ == "__main__":
    import uvicorn
    print("[AI-ENGINE] Starting FastAPI server on port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
