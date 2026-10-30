import { useWebSocket } from './hooks/useWebSocket';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Gauge,
  Thermometer,
  Zap,
  RotateCw,
  AlertTriangle,
  Radio,
  Server,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const { isConnected, latestPacket, streamHistory } = useWebSocket();

  // Transform stream history into Recharts data points
  const chartData = streamHistory.map((packet, idx) => ({
    name: new Date(packet.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    index: idx,
    temperature: packet.metrics.temperature,
    vibX: packet.metrics.vibration_x,
    vibY: packet.metrics.vibration_y,
    vibZ: packet.metrics.vibration_z,
    current: packet.metrics.current,
    rpm: packet.metrics.rpm,
    fault: packet.fault?.injected ? 1 : 0,
  }));

  const metrics = latestPacket?.metrics;
  const fault = latestPacket?.fault;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6 font-sans">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-7 w-7 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              IIoT Anomaly Detection SCADA Platform
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Condition Monitoring &amp; Predictive Maintenance for Induction Motors
          </p>
        </div>

        {/* System Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                : 'bg-rose-950/60 text-rose-400 border-rose-700/60 animate-pulse'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {isConnected ? 'GATEWAY CONNECTED' : 'GATEWAY OFFLINE'}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300">
            <Server className="h-3.5 w-3.5 text-blue-400" />
            Port: 3001 (Fastify + SQLite)
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            AI Guard: Standby
          </div>
        </div>
      </header>

      {/* ─── Active Alarm Banner (Conditional) ───────────────────────────── */}
      {fault?.injected && (
        <div className="bg-rose-950/70 border border-rose-600 rounded-xl p-4 flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
            <div>
              <h3 className="font-semibold text-rose-200">
                CRITICAL ANOMALY DETECTED: {fault.type.toUpperCase()} FAULT
              </h3>
              <p className="text-xs text-rose-300">
                Abnormal deviation observed in motor telemetry stream. Inspection recommended.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded bg-rose-600 text-white text-xs font-bold uppercase tracking-wider">
            {fault.severity} SEVERITY
          </span>
        </div>
      )}

      {/* ─── Device Overview & KPI Tiles ──────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Temperature */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Stator Temp</span>
            <Thermometer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {metrics ? metrics.temperature.toFixed(1) : '--.-'}
            </span>
            <span className="text-sm font-semibold text-slate-400">°C</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Nominal baseline: ~68.0 °C</div>
        </div>

        {/* Metric 2: Primary Vibration (X-Axis) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Vibration (X-Axis)</span>
            <Gauge className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold ${
                metrics && metrics.vibration_x > 3.0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {metrics ? metrics.vibration_x.toFixed(2) : '--.--'}
            </span>
            <span className="text-sm font-semibold text-slate-400">mm/s</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            ISO 10816 Zone A Limit: 2.8 mm/s
          </div>
        </div>

        {/* Metric 3: Phase Current */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Motor Current</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold ${
                metrics && metrics.current > 18.0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {metrics ? metrics.current.toFixed(1) : '--.-'}
            </span>
            <span className="text-sm font-semibold text-slate-400">A</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Rated Full-Load Current: 15.0 A</div>
        </div>

        {/* Metric 4: Shaft Speed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Shaft Velocity</span>
            <RotateCw className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {metrics ? metrics.rpm.toFixed(0) : '----'}
            </span>
            <span className="text-sm font-semibold text-slate-400">RPM</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Synchronous Speed: 1500 RPM</div>
        </div>
      </section>

      {/* ─── Real-time Time Series Telemetry Charts ─────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: 3-Axis Vibration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Tri-Axial Bearing Vibration Stream
              </h2>
              <p className="text-xs text-slate-400">
                High-frequency mechanical oscillation (X, Y, Z channels)
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-1 bg-slate-800 rounded text-slate-300">
              Sampling: 500ms
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="vibX"
                  name="Vib X (Horizontal)"
                  stroke="#38bdf8"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibY"
                  name="Vib Y (Vertical)"
                  stroke="#34d399"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibZ"
                  name="Vib Z (Axial)"
                  stroke="#a78bfa"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Thermal & Current Dynamics */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Thermal &amp; Electrical Load Signature
              </h2>
              <p className="text-xs text-slate-400">
                Stator winding temperature vs. input phase current
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-1 bg-slate-800 rounded text-slate-300">
              Dual-Channel
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  stroke="#f59e0b"
                  domain={[50, 'auto']}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  domain={[0, 'auto']}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="current"
                  name="Current (A)"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>Device ID: MOTOR_INDUCTION_01 | Location: Factory Floor A, Zone 1</div>
        <div>Machine Learning Anomaly Detection for Industrial IoT Systems</div>
      </footer>
    </div>
  );
}
