import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { Server } from "socket.io";
import { createServer } from "http";
import { PrismaClient } from "@prisma/client";

// ─── Interfaces ────────────────────────────────────────────────────────────
interface SensorMetrics {
  temperature: number;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  current: number;
  rpm: number;
}

interface InjectedFault {
  injected: boolean;
  type: "spike" | "drift" | "jam" | "flatline" | "critical";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

interface FeatureExtractionItem {
  name: string;
  sensor: string;
  unit: string;
  raw: number;
  mean: number;
  std: number;
  zScore: number;
  status: "NOMINAL" | "WARNING" | "CRITICAL";
}

interface AIDiagnostics {
  isAnomaly: boolean;
  severity: "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  faultType?: string | null;
  rootCause: string;
  latencyMs: number;
  features?: FeatureExtractionItem[];
  details?: Record<string, number>;
}

interface SensorPacket {
  deviceId: string;
  timestamp: number;
  metrics: SensorMetrics;
  fault?: InjectedFault;
  anomalyScore?: number;
  aiDiagnostics?: AIDiagnostics;
}

interface AIPredictResponse {
  deviceId: string;
  anomalyScore: number;
  isAnomaly: boolean;
  severity: "NORMAL" | "MEDIUM" | "HIGH" | "CRITICAL";
  faultType?: string | null;
  rootCause: string;
  latencyMs: number;
  features?: FeatureExtractionItem[];
  details?: Record<string, number>;
}

// ─── Init & AI Client ──────────────────────────────────────────────────────
export const prisma = new PrismaClient();
const fastify = Fastify({ logger: false });

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";
const lastAlertTime: Record<string, number> = {};

/**
 * Real-time HTTP Query to Python AI Inference Microservice (FastAPI Port 8000)
 * Evaluates both Isolation Forest (Point Shocks) & LSTM Autoencoder (Sequential Drift)
 */
async function queryAIEngine(packet: SensorPacket): Promise<AIPredictResponse | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 250); // 250ms timeout

    const res = await fetch(`${AI_ENGINE_URL}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: packet.deviceId,
        timestamp: packet.timestamp,
        metrics: packet.metrics,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return (await res.json()) as AIPredictResponse;
    }
  } catch {
    // If AI engine is offline or timeout, graceful fallback
  }
  return null;
}

/**
 * Reset AI Engine sliding window buffers on operator reset
 */
async function resetAIEngine(deviceId?: string) {
  try {
    await fetch(`${AI_ENGINE_URL}/api/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    });
  } catch {
    // Graceful ignore
  }
}

// ─── Bootstrap Fastify & WebSocket Hub ─────────────────────────────────────
async function bootstrap() {
  await fastify.register(fastifyCors, {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });

  // Health check
  fastify.get("/health", async () => ({
    status: "ok",
    service: "iot-motor-backend",
    aiEngineUrl: AI_ENGINE_URL,
    timestamp: new Date().toISOString(),
  }));

  // Device routes
  fastify.get("/api/devices", async () => {
    return prisma.device.findMany({
      orderBy: { createdAt: "desc" },
    });
  });

  // Alert history route
  fastify.get("/api/alerts", async () => {
    return prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
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
    await resetAIEngine();
    io.emit("simulator:reset", { timestamp: Date.now() });
    io.emit("system:reset", { timestamp: Date.now() });
    return { success: true, message: "System emergency state reset successfully." };
  });

  io.on("connection", (socket) => {
    // 1. Telemetry stream from IoT Simulator
    socket.on("sensor:data", async (packet: SensorPacket) => {
      try {
        // Query Real-Time AI Engine for actual Anomaly Score & Diagnostic Root Cause
        const aiResult = await queryAIEngine(packet);
        if (aiResult) {
          packet.anomalyScore = aiResult.anomalyScore;
          packet.aiDiagnostics = {
            isAnomaly: aiResult.isAnomaly,
            severity: aiResult.severity,
            faultType: aiResult.faultType,
            rootCause: aiResult.rootCause,
            latencyMs: aiResult.latencyMs,
            features: aiResult.features,
            details: aiResult.details,
          };

          // If AI detects critical/high anomaly, persist Alert to database (rate-limited to 1 per 3s)
          if (aiResult.isAnomaly && aiResult.anomalyScore >= 0.80) {
            const now = Date.now();
            const lastTime = lastAlertTime[packet.deviceId] || 0;
            if (now - lastTime > 3000) {
              lastAlertTime[packet.deviceId] = now;
              prisma.alert.create({
                data: {
                  deviceId: packet.deviceId,
                  modelName: "IsolationForest+LSTMAutoencoder",
                  anomalyScore: aiResult.anomalyScore,
                  severity: aiResult.severity,
                  faultType: aiResult.faultType,
                  message: aiResult.rootCause,
                },
              }).catch(() => {});
              console.log(
                `[AI-INTERLOCK] 🚨 CRITICAL FAULT DETECTED: Score=${(aiResult.anomalyScore * 100).toFixed(1)}% | ${aiResult.rootCause}`
              );
            }
          }
        }

        // Persist time-series reading to database
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

        // Broadcast enriched packet (with real AI score) to React frontend
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
    socket.on("system:reset_request", async () => {
      console.log("[GATEWAY] Operator pressed Reset on Web Dashboard. Clearing all faults!");
      await resetAIEngine();
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
    console.log(`🤖 AI Engine Connected: ${AI_ENGINE_URL}`);
    console.log(`🗄️  Database: SQLite (prisma/dev.db)\n`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
