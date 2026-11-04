# SPEC-001: IIoT Motor Edge-to-SCADA Core Telemetry & Emergency Interlock
<!-- Spec-Driven Development Specification under github/spec-kit -->

## 1. Context & Business Intent
Industrial induction motors represent the workhorse of manufacturing plants. Unplanned motor failures lead to catastrophic downtime. This specification establishes the end-to-end edge-to-SCADA data pipeline and the automatic safety interlock system that halts simulated machinery when multi-variate anomaly indices breach safety thresholds.

## 2. System Actors & Data Contracts

### 2.1 Sensor Stream Packet (Edge -> Gateway -> SCADA)
```typescript
interface SensorPacket {
  deviceId: string;       // Default: "MOTOR_INDUCTION_01"
  timestamp: number;      // Unix Epoch Milliseconds
  metrics: {
    temperature: number;  // Stator Winding (°C)
    vibration_x: number;  // Horizontal Bearing Housing (mm/s)
    vibration_y: number;  // Vertical Bearing Housing (mm/s)
    vibration_z: number;  // Axial Bearing Housing (mm/s)
    current: number;      // Phase Current Draw (A)
    rpm: number;          // Shaft Rotations Per Minute
  };
  fault?: {
    injected: boolean;
    type: "spike" | "drift" | "jam" | "flatline" | "critical";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
  anomalyScore?: number;  // Normalized [0.00, 1.00]
}
```

## 3. Functional Requirements

### 3.1 Edge Telemetry Ingestion (FR-01)
- The IoT Edge node MUST stream packets every 500ms via WebSocket (`/ws`) to Fastify.
- The Gateway MUST persist each reading in SQLite (`sensor_readings` table) and broadcast `dashboard:update` events.

### 3.2 CLI Fault Injection Tool (FR-02)
- Operators MUST be able to inject simulated faults on demand via `python inject_fault.py --type <type>`.
- Supported fault patterns:
  - `spike`: Instantaneous mechanical vibration burst (X/Z vibration > 5.5 mm/s).
  - `drift`: Gradual thermal runaway (+0.5°C/step).
  - `jam`: Rotor lock (Current > 20A, RPM collapses < 1000).
  - `critical`: Catastrophic multi-variate failure tripping automated safety interlocks.

### 3.3 Automated Emergency Interlock (FR-03)
- When `anomalyScore >= 0.85`, the frontend MUST immediately switch view from the Normal Dashboard to the `EmergencyPage`.
- The Emergency View MUST display:
  - Root cause diagnostics explaining multi-variate threshold breaches.
  - Snapshot of sensor values at the failure instant.
  - An **Acknowledge & Reset System** control button.
- Clicking Reset MUST emit `system:reset_request` over WebSocket, commanding the simulator to clear faults and returning the UI to normal operation.

## 4. Verification & Testing Evidence
- [x] End-to-end telemetry verified at 2 Hz streaming rate.
- [x] CLI fault injection dispatch verified across 4 fault profiles.
- [x] Emergency Interlock automated trigger and bidirectional reset verified.
