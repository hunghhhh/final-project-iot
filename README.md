# IoT Motor Monitoring System

Hệ thống IoT giám sát và phát hiện sớm bất thường cho động cơ công nghiệp ứng dụng học máy.

## Kiến trúc

```
simulator/     → Script Python giả lập cảm biến động cơ
backend/       → Fastify + Prisma + Socket.IO WebSocket Hub
ai-engine/     → Python FastAPI chạy 4 mô hình AI
frontend/      → React 18 + TypeScript + TailwindCSS Dashboard
docs/          → Tài liệu & cấu hình agent (theo chuẩn mattpocock/skills)
```

## Khởi chạy nhanh (sau khi cài đặt xong)

```bash
# Chạy toàn bộ hệ thống bằng Docker
docker compose up --build

# Hoặc chạy từng service riêng (dev mode)
cd simulator   && python main.py
cd backend     && pnpm dev
cd ai-engine   && uvicorn main:app --reload
cd frontend    && pnpm dev
```

## 4 Mô hình AI
| # | Model | Mục tiêu |
|---|---|---|
| 1 | Isolation Forest | Bắt lỗi đột biến cảm biến (Spike) |
| 2 | LSTM Autoencoder | Bắt lỗi hao mòn từ từ (Drift) |
| 3 | Isolation Forest (request logs) | Chống DDoS / Brute-force |
| 4 | TF-IDF + Logistic Regression | Chống SQLi / XSS |

## Tài liệu
- [Cấu hình agent & domain glossary](docs/agents/project.md)
- [Các quyết định kiến trúc (ADR)](docs/adr/decisions.md)
