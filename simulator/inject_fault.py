"""
CLI Tool: Inject Physical Anomalies into Running Motor IoT Simulator
Usage:
  python inject_fault.py --type spike      (Instant bearing vibration burst)
  python inject_fault.py --type drift      (Gradual overheating / dry friction)
  python inject_fault.py --type jam        (Mechanical jamming / current surge)
  python inject_fault.py --type flatline   (Sensor hardware failure / cable disconnect)
  python inject_fault.py --type critical   (Catastrophic failure - triggers Web Emergency Page)
"""

import argparse
import sys
import socketio

SERVER_URL = "http://localhost:3001"
SOCKET_PATH = "/ws"

def main():
    parser = argparse.ArgumentParser(description="Inject anomaly into IoT Motor System")
    parser.add_argument(
        "--type",
        choices=["spike", "drift", "jam", "flatline", "critical"],
        default="critical",
        help="Type of industrial fault to inject"
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=12,
        help="Duration of the fault in seconds (default: 12)"
    )
    args = parser.parse_args()

    sio = socketio.Client()

    try:
        sio.connect(SERVER_URL, socketio_path=SOCKET_PATH, wait_timeout=3)
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        print("Make sure backend is running (cd backend && npm run dev)")
        sys.exit(1)

    print("=" * 60)
    print(" INDUSTRIAL IOT FAULT INJECTION CONTROLLER")
    print("=" * 60)
    print(f">> Target Fault Type: {args.type.upper()}")
    print(f">> Duration:          {args.duration} seconds")

    # Emit fault command to backend, backend broadcasts to simulator & web
    sio.emit("simulator:fault_command", {
        "type": args.type,
        "duration": args.duration
    })

    print(f">> Command dispatched successfully to IoT Gateway!")
    print(">> Watch your Web Dashboard update in real-time.")
    print("=" * 60)

    sio.disconnect()

if __name__ == "__main__":
    main()
