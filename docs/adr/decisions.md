# Architecture Decision Records (ADR)

> Decisions log for the IoT Motor Monitoring System.  
> Each ADR documents a key architectural choice, the alternatives considered, and the rationale.

---

## ADR-001: AI Engine as a Separate Python Microservice (vs. ONNX.js in Node.js)

**Date:** 2026-10-30  
**Status:** Accepted

### Decision
Run the AI Engine as a **standalone Python 3.11 + FastAPI microservice**, rather than embedding ONNX.js models directly into the Node.js backend.

### Alternatives Considered
- **ONNX.js in Node.js:** Embed exported ONNX models into the Fastify backend, removing the need for a separate Python process.
- **Python sidecar (chosen):** Run Python FastAPI as a dedicated service, called over HTTP from the Node.js backend.

### Rationale
- The development machine (Acer Nitro AN515-57) has an NVIDIA RTX 3050/3060 GPU. TensorFlow with CUDA support allows the LSTM Autoencoder to train on GPU, providing 5–10× speedup. ONNX.js runs on CPU only, wasting available GPU resources.
- scikit-learn, Keras, and Pandas have a significantly richer ecosystem for model development, debugging, and evaluation than the ONNX.js runtime.
- Keeping AI inference decoupled from the API layer means models can be swapped or retrained without touching the Node.js codebase.

---

## ADR-002: WebSocket (Socket.IO) over MQTT for IoT Simulation

**Date:** 2026-10-30  
**Status:** Accepted

### Decision
Use **Socket.IO (WebSocket)** as the IoT communication protocol for the simulator, instead of MQTT with a dedicated broker (Mosquitto or EMQX).

### Alternatives Considered
- **MQTT + Mosquitto broker:** Industry-standard lightweight IoT protocol. Requires an additional Docker container.
- **WebSocket via Socket.IO (chosen):** Bidirectional real-time protocol running directly over the existing Node.js backend.

### Rationale
- Removes one Docker container (~200 MB RAM overhead) from the development stack, keeping resource usage manageable on a laptop.
- Simplifies the demo setup — no need to explain or configure an MQTT broker during thesis defense.
- Real-time data delivery quality is equivalent to MQTT for this use case (low device count, LAN environment).
- If real hardware integration is needed in the future, MQTT can be added as an adapter layer without restructuring the backend.

---

## ADR-003: SQLite for Development, PostgreSQL-ready via Prisma

**Date:** 2026-10-30  
**Status:** Accepted

### Decision
Use **SQLite** as the development and demo database, with the Prisma schema pre-configured to migrate to **PostgreSQL** in production via a single config change.

### Alternatives Considered
- **PostgreSQL from the start:** Full production-grade relational database. Requires a separate Docker container.
- **SQLite (chosen):** Embedded file-based database, zero infrastructure overhead.

### Rationale
- Eliminates a PostgreSQL Docker container for local dev and thesis demo, reducing total memory footprint.
- Prisma's provider abstraction (`provider = "sqlite"` → `provider = "postgresql"`) means switching databases requires changing exactly one line in `schema.prisma` and running `prisma migrate deploy`.
- SQLite is sufficient for demo-scale workloads: a single motor simulator pushing ~2 readings/second generates well under 1 GB of data per week.

---

## ADR-004: 4-Model AI Architecture (2 IoT + 2 Security)

**Date:** 2026-10-30  
**Status:** Accepted

### Decision
Deploy exactly **4 AI models** split into two subsystems: IoT anomaly detection and web security.

### Rationale
- **Isolation Forest (IoT):** Fast, unsupervised, no labels required. Best at detecting sudden point anomalies (spikes). Acts as the first line of defense in the anomaly pipeline.
- **LSTM Autoencoder (IoT):** Learns temporal patterns in the sensor stream. Superior at detecting slow drift faults that Isolation Forest misses. Provides the deep learning perspective for academic comparison.
- **Isolation Forest (Security):** Reuses the same algorithm on HTTP request metadata to detect behavioral anomalies (DDoS patterns, brute-force login attempts). Demonstrates algorithm versatility.
- **TF-IDF + Logistic Regression (Security):** Lightweight NLP classifier on API request payloads. Sub-2ms inference. Detects SQL Injection and XSS strings without regex rule maintenance.

This split gives the thesis a strong comparative evaluation story: **statistical ML vs. deep learning** (IoT layer) and **behavioral anomaly detection vs. content analysis** (security layer).
