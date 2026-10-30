# Research Benchmark & Project Gap Analysis
## Machine Learning Anomaly Detection for Industrial IoT Sensor Data Streams

---

## 1. Global Benchmark Projects & Industry Standards
Survey of open-source repositories (GitHub), academic publications (IEEE/NeurIPS), and engineering forums (Zhihu/CSDN China, Qiita/Zenn Japan):

### Key Projects Found:
1. **`Ankitnotnani/Smart-Industrial-Machine-Monitoring`**: ESP32 edge processing with hardware FFT for vibration frequency analysis, Isolation Forest for unsupervised anomaly detection, and React Three Fiber 3D Digital Twin.
2. **`Leosuziqi/Fault-Prediction-for-Industrial-Motors`**: Induction motor anomaly detection with Autoencoders for reconstruction loss and CNNs for bearing fault classification.
3. **`Mejri-Mehdi/PredictiveMotorAI`**: TinyML deployed on STM32 microcontrollers for real-time edge vibration anomaly scoring.

### Standard Datasets Used in Top Theses:
* **CWRU Bearing Dataset (Case Western Reserve University)**: Gold standard benchmark for motor bearing faults (ball, inner race, outer race).
* **NASA CMAPSS**: Turbofan engine degradation and Remaining Useful Life (RUL) estimation.
* **SWaT (Secure Water Treatment)**: Industrial ICS/SCADA cyber-physical attack dataset.

---

## 2. Project Gap Analysis: What is Missing in Our Project?

| Component | Current State | What is Missing (Required for Top Grade) |
|---|---|---|
| **AI Engine** | Anomaly score is computed heuristically in simulator | Standalone Python FastAPI microservice with pre-trained models (.joblib / .keras) |
| **Vibration Analysis** | Raw time-series waveform (mm/s vs. time) | Fast Fourier Transform (FFT) spectrum analysis (frequency domain: 1x, 2x harmonics) |
| **Incident Logging** | Saved in SQLite, but no Web UI to review history | Alert History & Audit Log table page on frontend |
| **Scientific Validation** | Visual demonstration only | Quantitative evaluation table: Precision, Recall, F1-Score, Confusion Matrix |
| **Security Layer** | Architecture specified in README | Fastify middleware logging IP and inspecting SQLi/XSS payloads |

---

## 3. Recommended Implementation Next Steps:
1. **Phase 1 (AI Brain):** Implement Python FastAPI in `ai-engine/` with actual Scikit-Learn Isolation Forest and PyTorch/Keras LSTM Autoencoder.
2. **Phase 2 (Frontend History):** Add an "Audit & Alert History" tab to view past anomalies from SQLite.
3. **Phase 3 (Evaluation & Metrics):** Generate a confusion matrix and benchmark table against CWRU dataset for the thesis documentation.
