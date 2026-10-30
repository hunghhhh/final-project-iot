import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { Server } from "socket.io";
import { createServer } from "http";
import { PrismaClient } from "@prisma/client";

// ─── Interfaces ────────────────────────────────────────────────────────────
interface SensorPacket {
  deviceId: string;
  timestamp: number;
  metrics: {
    temperature: number;
    vibration_x: number;
    vibration_y: number;
    vibration_z: number;
    current: number;
    rpm: number;
  };
  fault?: {
    injected: boolean;
    type: "spike" | "drift" | "jam" | "flatline" | "critical";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
  anomalyScore?: number;
}

// ─── Init ──────────────────────────────────────────────────────────────────
export const prisma = new PrismaClient();
const fastify = Fastify({ logger: false });

async function bootstrap() {
  await fastify.register(fastifyCors, {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });

  // Health check
  fastify.get("/health", async () => ({
    status: "ok",
    service: "iot-motor-backend",
    timestamp: new Date().toISOString(),
  }));

  // Device routes
  fastify.get("/api/devices", async () => {
    return prisma.device.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  // ─── Socket.IO WebSocket Hub ────────────────────────────────────────────────
  const httpServer = createServer(fastify.server);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/ws",
  });

  // Emergency reset endpoint
  fastify.post("/api/emergency/reset", async () => {
    console.log("[GATEWAY] Reset command received from HTTP, broadcasting to all...");
    io.emit("simulator:reset", { timestamp: Date.now() });
    io.emit("system:reset", { timestamp: Date.now() });
    return { success: true, message: "System emergency state reset successfully." };
  });

  io.on("connection", (socket) => {
    // 1. Telemetry stream from IoT Simulator
    socket.on("sensor:data", async (packet: SensorPacket) => {
      try {
        await prisma.sensorReading.create({
          data: {
            deviceId: packet.deviceId,
            temperature: packet.metrics.temperature,
            vibrationX: packet.metrics.vibration_x,
            vibrationY: packet.metrics.vibration_y,
            vibrationZ: packet.metrics.vibration_z,
            current: packet.metrics.current,
            rpm: packet.metrics.rpm,
            faultInjected: packet.fault?.injected ?? false,
            faultType: packet.fault?.type ?? null,
          },
        });

        // Broadcast to React frontend
        io.emit("dashboard:update", packet);
      } catch {
        // Ignored in stream throughput
      }
    });

    // 2. Fault injection command from CLI tool (inject_fault.py)
    socket.on("simulator:fault_command", (data: { type: string; duration: number }) => {
      console.log(`[GATEWAY] Dispatching fault command to simulator: ${data.type}`);
      io.emit("simulator:trigger_fault", data);
    });

    // 3. Reset command from Web UI button
    socket.on("system:reset_request", () => {
      console.log("[GATEWAY] Operator pressed Reset on Web Dashboard. Clearing all faults!");
      io.emit("simulator:reset", { timestamp: Date.now() });
      io.emit("system:reset", { timestamp: Date.now() });
    });
  });

  // ─── Start Server ──────────────────────────────────────────────────────────
  const PORT = Number(process.env.PORT) || 3001;

  await fastify.ready();
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 IoT Backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket hub ready on ws://localhost:${PORT}/ws`);
    console.log(`🗄️  Database: SQLite (prisma/dev.db)\n`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
