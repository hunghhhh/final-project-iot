# Project Agent Configuration
> Theo chuẩn mattpocock/skills — setup-matt-pocock-skills

## Project Overview
**Tên dự án:** IoT Motor Monitoring System  
**Đề tài:** Xây dựng hệ thống IoT giám sát và phát hiện sớm bất thường cho động cơ công nghiệp ứng dụng học máy  
**Đối tượng:** Động cơ điện công nghiệp (Industrial Induction Motor)

## Domain Glossary (Từ điển thuật ngữ)
- **Anomaly / Dị biệt:** Điểm dữ liệu lệch khỏi hành vi bình thường đã được học
- **Sliding Window:** Cửa sổ trượt — tập hợp N giá trị cảm biến gần nhất dùng để dự đoán
- **Reconstruction Error:** Sai số tái tạo của LSTM Autoencoder — cao = dị biệt
- **Anomaly Score:** Điểm bất thường (0–1) trả về từ Isolation Forest
- **Drift Fault:** Lỗi biến đổi chậm — nhiệt độ tăng từ từ do hao mòn
- **Spike Fault:** Lỗi đột biến — rung động vọt lên trong 1-2 giây
- **Ground Truth:** Nhãn lỗi thật do Simulator gán, dùng để tính Precision/Recall
- **IIoT:** Industrial IoT — IoT ứng dụng trong công nghiệp

## AI Models trong hệ thống
| Model | Vai trò | Tầng |
|---|---|---|
| Isolation Forest | Phát hiện Spike/Outlier nhanh | IoT |
| LSTM Autoencoder | Phát hiện Drift theo chuỗi thời gian | IoT |
| Isolation Forest (Web) | Phát hiện tấn công DDoS/Brute-force | Security |
| NLP Classifier (TF-IDF) | Phát hiện SQLi / XSS trong payload | Security |

## Data Contract — Cấu trúc gói tin IoT
```json
{
  "deviceId": "MOTOR_INDUCTION_01",
  "timestamp": 1729840000000,
  "metrics": {
    "temperature": 68.5,
    "vibration_x": 1.2,
    "vibration_y": 0.8,
    "vibration_z": 1.5,
    "current": 12.4,
    "rpm": 1450
  }
}
```

## Tech Stack
- **Frontend:** React 18 + TypeScript + TailwindCSS v4 + Recharts + Socket.IO-client
- **Backend:** Node.js + Fastify + Prisma + SQLite + Socket.IO
- **AI Engine:** Python 3.11 + FastAPI + scikit-learn + TensorFlow/Keras
- **Simulator:** Python 3.11 (sinh dữ liệu cảm biến giả)
- **Deployment:** Docker Compose

## Issue Labels (Triage)
- `feat/iot` — Tính năng liên quan đến IoT & Simulator
- `feat/ai` — Tính năng liên quan đến AI/ML models
- `feat/web` — Tính năng liên quan đến Frontend
- `feat/security` — Tính năng bảo mật
- `bug` — Lỗi
- `docs` — Tài liệu
