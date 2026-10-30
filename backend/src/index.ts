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
    type: "spike" | "drift" | "flatline" | "contextual";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
}

// ─── Init ──────────────────────────────────────────────────────────────────
export const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

async function bootstrap() {
  // ─── CORS ──────────────────────────────────────────────────────────────────
  await fastify.register(fastifyCors, {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });

  // ─── Routes ────────────────────────────────────────────────────────────────
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
      include: {
        _count: { select: { readings: true, alerts: true } },
      },
    });
  });

  fastify.get("/api/devices/:id/readings", async (req) => {
    const { id } = req.params as { id: string };
    return prisma.sensorReading.findMany({
      where: { deviceId: id },
      orderBy: { timestamp: "desc" },
      take: 200, // Last 200 readings for chart
    });
  });

  fastify.get("/api/alerts", async () => {
    return prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { device: { select: { name: true, location: true } } },
    });
  });

  // ─── Socket.IO WebSocket Hub ────────────────────────────────────────────────
  const httpServer = createServer(fastify.server);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/ws",
  });

  io.on("connection", (socket) => {
    fastify.log.info(`[WS] Client connected: ${socket.id}`);

    // IoT Simulator connects here and sends sensor data
    socket.on("sensor:data", async (packet: SensorPacket) => {
      fastify.log.info(`[IoT] Received from ${packet.deviceId}`);

      try {
        // 1. Save to database
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

        // 2. Broadcast to all dashboard clients in real-time
        io.emit("dashboard:update", packet);

        // 3. Forward to AI Engine for anomaly detection (Will plug in later)
      } catch (error) {
        fastify.log.error(error, "Failed to persist sensor reading");
      }
    });

    socket.on("disconnect", () => {
      fastify.log.info(`[WS] Client disconnected: ${socket.id}`);
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
