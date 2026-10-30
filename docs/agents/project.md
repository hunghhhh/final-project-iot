# Project Agent Configuration
> Following mattpocock/skills — setup convention

## Project Overview

**Project Name:** IoT Motor Monitoring System  
**Thesis Title:** Machine Learning in Anomaly Detection for Data Streams of Industrial IoT Systems  
**Target Device:** Industrial Induction Motor (3-phase AC motor)  
**Domain:** Industrial IoT (IIoT) + Predictive Maintenance + Web Security AI

---

## Domain Glossary

| Term | Definition |
|------|-----------|
| **Anomaly / Fault** | A data point or sequence that deviates from the learned normal operational pattern of a motor |
| **Sliding Window** | A fixed-size rolling buffer of the most recent N sensor readings fed into the AI model for inference |
| **Reconstruction Error** | The difference between the LSTM Autoencoder's input and output — high error signals an anomaly |
| **Anomaly Score** | A float in [0, 1] returned by Isolation Forest — higher = more anomalous |
| **Drift Fault** | A slow, gradual deviation (e.g., temperature slowly rising due to bearing wear) — hard to detect with static thresholds |
| **Spike Fault** | A sudden, sharp outlier in one or more sensor channels (e.g., vibration spike from a foreign object) |
| **Ground Truth Label** | The exact fault injection timestamp recorded by the Simulator — used to compute Precision/Recall/F1 |
| **IIoT** | Industrial Internet of Things — IoT applications in industrial/manufacturing environments |
| **Predictive Maintenance** | Detecting equipment degradation before failure occurs, reducing unplanned downtime |
| **Data Contract** | The agreed-upon JSON schema that all system layers (Simulator, Backend, AI Engine, Frontend) must follow |

---

## Data Contract — IoT Sensor Packet Schema

Every packet emitted by the IoT Simulator must conform to this schema:

```typescript
interface SensorPacket {
  deviceId: string;        // e.g. "MOTOR_INDUCTION_01"
  timestamp: number;       // Unix ms timestamp
  metrics: {
    temperature: number;   // °C — stator winding temperature
    vibration_x: number;   // mm/s — vibration along X-axis
    vibration_y: number;   // mm/s — vibration along Y-axis
    vibration_z: number;   // mm/s — vibration along Z-axis
    current: number;       // Ampere — phase current draw
    rpm: number;           // Rotations per minute
  };
  fault?: {
    injected: boolean;     // true when Simulator injects a fault (Ground Truth)
    type: "spike" | "drift" | "flatline" | "contextual";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
}
```

---

## AI Models

| # | Model | Library | Input | Output | Task |
|---|-------|---------|-------|--------|------|
| 1 | Isolation Forest | scikit-learn | Sliding window of sensor metrics | Anomaly Score [0,1] | Detect spike / point outliers in sensor stream |
| 2 | LSTM Autoencoder | TensorFlow/Keras | Time-series window (shape: [T, features]) | Reconstruction Error | Detect slow drift faults via learned normal patterns |
| 3 | Isolation Forest (security) | scikit-learn | HTTP request metadata (IP, freq, size, UA) | Risk Score [0,1] | Detect DDoS / brute-force attack behavior |
| 4 | TF-IDF + Logistic Regression | scikit-learn | Raw URL params & JSON body string | Binary label (safe/malicious) | Detect SQL Injection & XSS payloads in API requests |

---

## Tech Stack Reference

- **Frontend:** React 18 (TypeScript), TailwindCSS v4, Recharts, Socket.IO-client, Zustand, React Query
- **Backend:** Node.js, Fastify, Prisma ORM, SQLite → PostgreSQL, Socket.IO
- **AI Engine:** Python 3.11, FastAPI, scikit-learn, TensorFlow/Keras, Pandas, NumPy
- **Simulator:** Python 3.11 — generates synthetic sensor data with configurable fault injection
- **Deployment:** Docker Compose (4 containers: frontend, backend, ai-engine, simulator)

---

## Issue Labels (Triage)

| Label | Scope |
|-------|-------|
| `feat/iot` | IoT Simulator, sensor protocol, data contract |
| `feat/ai` | ML model training, inference API, anomaly scoring |
| `feat/web` | React dashboard, charts, real-time hooks |
| `feat/security` | AI-powered WAF middleware, payload inspection |
| `bug` | Defects across any layer |
| `docs` | Documentation, ADR, diagrams |
| `perf` | Performance optimization (latency, throughput) |
