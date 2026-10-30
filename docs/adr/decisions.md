# ADR-001: Chọn kiến trúc AI Engine
**Ngày:** 2026-10-30  
**Trạng thái:** Đã chấp thuận

## Quyết định
Chạy AI Engine như một **Python FastAPI microservice riêng biệt** thay vì nhúng ONNX.js vào Node.js backend.

## Lý do
- Tận dụng được GPU RTX 3050/3060 của laptop thông qua CUDA + TensorFlow.
- Scikit-learn và Keras có ecosystem mạnh hơn, dễ train và debug hơn ONNX.js.
- Tách biệt hoàn toàn → dễ thay đổi model mà không ảnh hưởng backend.

---

# ADR-002: Chọn giao thức IoT Simulator
**Ngày:** 2026-10-30  
**Trạng thái:** Đã chấp thuận

## Quyết định
Dùng **WebSocket thuần** (Socket.IO) thay vì MQTT broker (Mosquitto/EMQX).

## Lý do
- Cắt bỏ 1 Docker container (MQTT broker) → nhẹ hơn ~200MB RAM.
- Demo cho hội đồng không cần giải thích thêm MQTT protocol.
- Vẫn đảm bảo real-time y chang MQTT.

---

# ADR-003: Chọn Database
**Ngày:** 2026-10-30  
**Trạng thái:** Đã chấp thuận

## Quyết định
Dùng **SQLite** cho môi trường dev/demo. Cấu hình sẵn để migrate sang PostgreSQL khi cần.

## Lý do
- Không cần Docker container riêng cho DB → tiết kiệm tài nguyên.
- Prisma hỗ trợ đổi provider chỉ bằng 1 dòng config.
