# Project Constitution: IIoT Motor Monitoring System
<!-- Spec-Driven Development (SDD) standard adopted from github/spec-kit -->

## 1. Core Principles
- **Spec-Driven Integrity:** Never write production code before updating the specification document (`.specify/specs/`). Every architectural change, model choice, or protocol switch must originate from an approved spec.
- **Industrial Safety Priority:** The system controls simulated physical machinery. Safety interlocks (Emergency Stop, Trip Relays) override any telemetry, streaming, or logging throughput.
- **Physical Accuracy & Interpretability:** AI models cannot be "black boxes" with arbitrary numbers. Every anomaly score must correspond to quantifiable physical units:
  - Thermal runaway: Stator Temperature > 90°C (Class F insulation limit)
  - Bearing mechanical shock: ISO 10816 Class II limits (> 2.8 mm/s Warning, > 7.1 mm/s Danger)
  - Rotor lock: Phase Current > 250% of Rated Full Load Current (15.0 A)

## 2. Architecture Constraints
- **IoT Edge Simulation:** Runs via Python (`simulator/`), maintains a constant sampling rate (default: 500ms, 2 Hz), and emulates realistic physical dynamics (rotation harmonics $\omega = 2\pi f$ + Gaussian noise $\mathcal{N}(0, \sigma^2)$).
- **Gateway & Data Persistence:** Node.js Fastify backend (`backend/`), bidirectional Socket.IO, and Prisma ORM targeting SQLite for demo efficiency, designed for zero-config PostgreSQL migration.
- **SCADA Web Dashboard:** React 18 (`frontend/`), TypeScript, and TailwindCSS v4 with a clean, high-contrast industrial palette (Crisp White background, Industrial Blue & Amber Warning accents).
- **AI Brain Subsystem:** Decoupled Python microservice (`ai-engine/`) executing multi-variate unsupervised anomaly detection (Isolation Forest for transient spikes, LSTM Autoencoder for temporal drift).

## 3. Ground Truth & Anomaly Verification Protocol
- All synthetic faults injected via the CLI (`simulator/inject_fault.py`) must carry explicit metadata (`injected: true`, `type`, `severity`).
- These ground truth labels must be retained alongside raw readings in the time-series storage to compute formal benchmark metrics (Precision, Recall, F1-Score, Confusion Matrix).

## 4. Documentation Standard
- All specifications, comments, API contracts, and user interfaces must use clear, formal English suitable for academic defense and open-source publication.
