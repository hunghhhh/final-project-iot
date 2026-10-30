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
        self.active_fault = None  # None | "spike" | "drift" | "jam"
        self.fault_duration = 0
        self.drift_offset = 0.0

    def trigger_fault(self, fault_type: str, duration_sec: int = 10):
        """Simulate a physical motor fault for evaluation & testing."""
        print(f"\n[FAULT INJECTED] Activating: {fault_type.upper()} for {duration_sec}s")
        self.active_fault = fault_type
        self.fault_duration = int(duration_sec / SAMPLING_INTERVAL)

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
            fault_metadata = {
                "injected": True,
                "type": self.active_fault,
                "severity": "HIGH"
            }

            if self.active_fault == "spike":
                # Bearing scratch / mechanical impact (instantaneous 4-5x vibration burst)
                vib_x += random.uniform(5.0, 9.0)
                vib_z += random.uniform(4.0, 7.5)
            
            elif self.active_fault == "drift":
                # Bearing dry friction / Stator winding overheating (gradual thermal runaway)
                self.drift_offset += 0.35
                temperature += self.drift_offset
                vib_x += 0.05 * self.drift_offset

            elif self.active_fault == "jam":
                # Mechanical jamming / Overload (current surges 2.5x, RPM collapses)
                current += random.uniform(15.0, 22.0)
                rpm -= random.uniform(300.0, 500.0)
                temperature += 2.0

            if self.fault_duration <= 0:
                print("[FAULT CLEARED] Motor returning to nominal baseline.\n")
                self.active_fault = None
                self.drift_offset = 0.0

        # Clamp physically impossible negative values
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
            "fault": fault_metadata
        }

# ─── Socket.IO Events ─────────────────────────────────────────────────────────
@sio.event
def connect():
    print(f"[IoT Edge] Connected to Backend Gateway ({SERVER_URL})")

@sio.event
def disconnect():
    print("[IoT Edge] Disconnected from Gateway")

@sio.event
def connect_error(data):
    print(f"[IoT Edge] Connection error: {data}")

# ─── Main Streaming Loop ──────────────────────────────────────────────────────
def main():
    print("=" * 65)
    print("Industrial IoT Motor Edge Simulator Starting...")
    print(f"Device ID: {DEVICE_ID} (3-Phase Induction Motor)")
    print(f"Sampling Rate: {SAMPLING_INTERVAL}s (2 readings/sec)")
    print(f"Target Gateway: {SERVER_URL}{SOCKET_PATH}")
    print("=" * 65)

    simulator = MotorSimulator(DEVICE_ID)

    try:
        sio.connect(SERVER_URL, socketio_path=SOCKET_PATH, wait_timeout=5)
    except Exception as e:
        print(f"[Error] Failed to reach backend at {SERVER_URL}: {e}")
        print("Hint: Ensure backend is running (npm run dev in backend folder).")
        sys.exit(1)

    packet_count = 0
    try:
        while True:
            packet = simulator.step()
            sio.emit("sensor:data", packet)
            packet_count += 1

            m = packet["metrics"]
            fault_tag = f" [ALERT: {packet['fault']['type'].upper()}]" if packet.get("fault") else ""
            print(
                f"[{packet_count:04d}] Temp: {m['temperature']:5.1f}C | "
                f"Vib: X={m['vibration_x']:5.2f} Y={m['vibration_y']:5.2f} Z={m['vibration_z']:5.2f} | "
                f"Curr: {m['current']:4.1f}A | RPM: {m['rpm']:6.1f}{fault_tag}"
            )

            # Auto-demo: Inject a fault after 20 healthy packets (~10 seconds)
            if packet_count == 20:
                simulator.trigger_fault("spike", duration_sec=4)
            elif packet_count == 45:
                simulator.trigger_fault("drift", duration_sec=8)

            time.sleep(SAMPLING_INTERVAL)

    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
    finally:
        sio.disconnect()

if __name__ == "__main__":
    main()
