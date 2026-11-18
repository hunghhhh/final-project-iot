# Scientific Benchmark Report: Industrial Motor Anomaly Detection

**Thesis:** Smart Predictive Maintenance System for Industrial Motors Using Machine Learning and Real-Time Telemetry  
**Generated On:** 2026-11-18 17:12:54  
**Evaluation Dataset:** 1,133 physical CWRU Bearing samples (190 unseen Normal + 943 Faulty)

---

## 1. Quantitative Performance Comparison

| Metric | Isolation Forest | LSTM Autoencoder | Industrial Significance |
|---|---|---|---|
| **Accuracy** | **100.00%** | 83.27% | Overall proportion of correct diagnoses |
| **Precision** | **100.00%** | 83.27% | Avoids False Alarms (Critical to prevent false plant shutdowns) |
| **Recall (Sensitivity)** | 100.00% | **100.00%** | Catches every actual fault (Prevents machine burnout) |
| **F1-Score** | **100.00%** | 90.87% | Harmonic balance between Precision and Recall |
| **Average Latency (per-sample)** | **8.204 ms** | 0.436 ms | Both operate well below the 500ms real-time threshold |

---

## 2. Visual Confusion Matrix Analysis

![Confusion Matrices](confusion_matrices.png)

### Key Findings:
1. **Isolation Forest (Top Precision):**
   - Achieved **100.00% Precision** with nearly zero False Positives (0 instances).
   - Highly effective at isolating immediate, instantaneous spikes (bearing impact cracks).
2. **LSTM Autoencoder (Top Recall):**
   - Achieved **100.00% Recall**, completely identifying every continuous fault sequence.
   - Ideal as the second line of defense to flag gradual thermal drift and bearing wear over time.

---

## 3. Latency & Resource Utilization

![Model Comparison](model_comparison.png)

* **Isolation Forest Inference Speed:** ~8.20 ms/sample (Ultra-low compute).
* **LSTM Autoencoder Inference Speed:** ~0.44 ms/sequence (Easily runs in real-time under 500ms cycle).
* **Verdict:** Combining both models in a dual-tier setup provides both instant response and deep temporal coverage without saturating edge or server resources.
