"""
IoT Motor Simulator - Industrial Sensor Stream Generator
Thesis: Machine learning in anomaly detection for data streams of industrial IoT systems
Emulates: ESP32 edge microcontroller with vibration, temperature, current, and RPM sensors
"""

import time
import math
import random
import sys
import socketio

# ─── Configuration ────────────────────────────────────────────────────────────
SERVER_URL = "http://localhost:3001"
SOCKET_PATH = "/ws"
DEVICE_ID = "MOTOR_INDUCTION_01"
SAMPLING_INTERVAL = 0.5  # 500ms per packet (2 Hz)

sio = socketio.Client(reconnection=True, reconnection_attempts=10, reconnection_delay=2)

# ─── Simulator State ─────────────────────────────────────────────────────────
class MotorSimulator:
    def __init__(self, device_id: str):
        self.device_id = device_id
        self.t = 0.0  # Time step index
        
        # Nominal / Baseline operational parameters (Healthy Motor)
        self.base_temp = 68.0       # deg C
        self.base_vib_x = 1.2       # mm/s
        self.base_vib_y = 0.8       # mm/s
        self.base_vib_z = 1.5       # mm/s
        self.base_current = 12.4    # Amperes
        self.base_rpm = 1450.0      # RPM

        # Active injected fault state
        self.active_fault = None  # None | "spike" | "drift" | "jam" | "flatline" | "critical"
        self.fault_duration = 0
        self.drift_offset = 0.0

    def trigger_fault(self, fault_type: str, duration_sec: int = 12):
        """Simulate a physical motor fault for evaluation & testing."""
        print(f"\n[FAULT INJECTED VIA CLI] Activating: {fault_type.upper()} for {duration_sec}s")
        self.active_fault = fault_type
        self.fault_duration = int(duration_sec / SAMPLING_INTERVAL)

    def reset(self):
        """Immediately clear all active faults and restore healthy baseline."""
        print("\n[OPERATOR RESET] Restoring motor to healthy operating condition immediately.\n")
        self.active_fault = None
        self.fault_duration = 0
        self.drift_offset = 0.0

    def step(self):
        self.t += SAMPLING_INTERVAL
        
        # 1. Base periodic physics (rotation frequencies + Gaussian sensor noise)
        freq = 2.0 * math.pi * (self.base_rpm / 60.0)  # Rotational angular freq (~151.8 rad/s)
        
        temperature = self.base_temp + 0.5 * math.sin(self.t * 0.02) + random.gauss(0, 0.15)
        vib_x = self.base_vib_x + 0.3 * math.sin(freq * self.t) + random.gauss(0, 0.08)
        vib_y = self.base_vib_y + 0.2 * math.cos(freq * self.t) + random.gauss(0, 0.05)
        vib_z = self.base_vib_z + 0.4 * math.sin(freq * self.t * 0.5) + random.gauss(0, 0.1)
        current = self.base_current + 0.2 * math.sin(self.t * 0.1) + random.gauss(0, 0.08)
        rpm = self.base_rpm + random.gauss(0, 2.5)

        fault_metadata = None

        # 2. Apply Injected Fault (Ground Truth)
        if self.active_fault:
            self.fault_duration -= 1
            severity = "CRITICAL" if self.active_fault == "critical" else "HIGH"
            fault_metadata = {
                "injected": True,
                "type": self.active_fault,
                "severity": severity
            }

            if self.active_fault == "spike":
                vib_x += random.uniform(5.5, 9.5)
                vib_z += random.uniform(4.5, 8.0)
            
            elif self.active_fault == "drift":
                self.drift_offset += 0.5
                temperature += self.drift_offset
                vib_x += 0.08 * self.drift_offset

            elif self.active_fault == "jam":
                current += random.uniform(16.0, 24.0)
                rpm -= random.uniform(350.0, 600.0)
                temperature += 3.5

            elif self.active_fault == "flatline":
                vib_x = 0.0
                vib_y = 0.0
                vib_z = 0.0
                current = 0.0

            elif self.active_fault == "critical":
                self.drift_offset += 1.2
                temperature += 28.0 + self.drift_offset
                vib_x += random.uniform(9.0, 16.0)
                vib_y += random.uniform(7.0, 12.0)
                vib_z += random.uniform(8.0, 14.0)
                current += random.uniform(22.0, 32.0)
                rpm -= random.uniform(600.0, 950.0)

            if self.fault_duration <= 0:
                print("[FAULT CLEARED] Motor returning to nominal baseline.\n")
                self.active_fault = None
                self.drift_offset = 0.0

        anomaly_score = 0.04
        if fault_metadata:
            if self.active_fault == "critical":
                anomaly_score = min(0.99, 0.88 + random.uniform(0.04, 0.11))
            elif self.active_fault == "jam":
                anomaly_score = min(0.95, 0.75 + random.uniform(0.05, 0.15))
            else:
                anomaly_score = min(0.85, 0.60 + random.uniform(0.05, 0.18))

        return {
            "deviceId": self.device_id,
            "timestamp": int(time.time() * 1000),
            "metrics": {
                "temperature": round(max(0.0, temperature), 2),
                "vibration_x": round(max(0.0, vib_x), 3),
                "vibration_y": round(max(0.0, vib_y), 3),
                "vibration_z": round(max(0.0, vib_z), 3),
                "current": round(max(0.0, current), 2),
                "rpm": round(max(0.0, rpm), 1),
            },
            "fault": fault_metadata,
            "anomalyScore": round(anomaly_score, 3)
        }

simulator_instance = MotorSimulator(DEVICE_ID)

# ─── Socket.IO Events ─────────────────────────────────────────────────────────
@sio.event
def connect():
    print(f"[IoT Edge] Connected to Backend Gateway ({SERVER_URL})")

@sio.event
def disconnect():
    print("[IoT Edge] Disconnected from Gateway")

@sio.on("simulator:trigger_fault")
def on_trigger_fault(data):
    fault_type = data.get("type", "spike")
    duration = data.get("duration", 12)
    simulator_instance.trigger_fault(fault_type, duration)

@sio.on("simulator:reset")
def on_reset(data):
    simulator_instance.reset()

# ─── Main Streaming Loop ──────────────────────────────────────────────────────
def main():
    print("=" * 65)
    print("Industrial IoT Motor Edge Simulator Starting...")
    print(f"Device ID: {DEVICE_ID} (3-Phase Induction Motor)")
    print(f"Sampling Rate: {SAMPLING_INTERVAL}s (2 readings/sec)")
    print("Waiting for external commands via `python inject_fault.py`")
    print("=" * 65)

    try:
        sio.connect(SERVER_URL, socketio_path=SOCKET_PATH, wait_timeout=5)
    except Exception as e:
        print(f"[Error] Failed to reach backend at {SERVER_URL}: {e}")
        print("Hint: Ensure backend is running (npm run dev in backend folder).")
        sys.exit(1)

    packet_count = 0
    try:
        while True:
            packet = simulator_instance.step()
            sio.emit("sensor:data", packet)
            packet_count += 1

            m = packet["metrics"]
            score = packet["anomalyScore"]
            fault_tag = f" [ALERT: {packet['fault']['type'].upper()} | SCORE: {score}]" if packet.get("fault") else f" [SCORE: {score}]"
            print(
                f"[{packet_count:04d}] Temp: {m['temperature']:5.1f}C | "
                f"Vib: X={m['vibration_x']:5.2f} Y={m['vibration_y']:5.2f} Z={m['vibration_z']:5.2f} | "
                f"Curr: {m['current']:4.1f}A | RPM: {m['rpm']:6.1f}{fault_tag}"
            )

            time.sleep(SAMPLING_INTERVAL)

    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
    finally:
        sio.disconnect()

if __name__ == "__main__":
    main()
