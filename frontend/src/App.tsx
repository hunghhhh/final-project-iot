import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { EmergencyPage } from './components/EmergencyPage';
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
  Terminal,
  Info,
} from 'lucide-react';

export default function App() {
  const { isConnected, latestPacket, streamHistory } = useWebSocket();
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);

  // Monitor AI anomaly score - if it exceeds critical threshold (>0.85), switch to Emergency Page
  useEffect(() => {
    if (latestPacket?.anomalyScore && latestPacket.anomalyScore >= 0.85) {
      setIsEmergencyActive(true);
    }
  }, [latestPacket]);

  // Handle operator acknowledge and reset back to normal dashboard
  const handleResetEmergency = async () => {
    try {
      await fetch('http://localhost:3001/api/emergency/reset', { method: 'POST' });
    } catch {
      // ignore
    }
    setIsEmergencyActive(false);
  };

  // If catastrophic condition triggered, render the dedicated Emergency Interlock Page
  if (isEmergencyActive) {
    return <EmergencyPage packet={latestPacket} onReset={handleResetEmergency} />;
  }

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
    score: (packet.anomalyScore ?? 0.05) * 100,
  }));

  const metrics = latestPacket?.metrics;
  const fault = latestPacket?.fault;
  const score = latestPacket?.anomalyScore ?? 0.04;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 flex flex-col gap-6 font-sans">
      {/* ─── Header: Crisp White Background with Blue & Yellow Accents ──── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 shadow-sm rounded-2xl p-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                IIoT Anomaly Detection SCADA Platform
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-Time Condition Monitoring for Industrial Induction Motors
              </p>
            </div>
          </div>
        </div>

        {/* System Status Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {isConnected ? 'GATEWAY CONNECTED' : 'GATEWAY OFFLINE'}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
            <Server className="h-3.5 w-3.5 text-blue-600" />
            Port: 3001
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            AI Score: {(score * 100).toFixed(0)}%
          </div>
        </div>
      </header>

      {/* ─── Active Anomaly Notice (Yellow / Warning style) ─────────────── */}
      {fault?.injected && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm">
                ACTIVE EXPERIMENTAL FAULT INJECTED: {fault.type.toUpperCase()}
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Telemetry signals exhibiting synthetic mechanical stress. AI inference actively tracking deviation.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider">
            {fault.severity} IMPACT
          </span>
        </div>
      )}

      {/* ─── KPI Metric Cards: White Cards, Blue Highlights, Yellow Warnings ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Temperature */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Stator Temp</span>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Thermometer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics ? metrics.temperature.toFixed(1) : '--.-'}
            </span>
            <span className="text-sm font-semibold text-slate-500">°C</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Nominal baseline: ~68.0 °C</div>
        </div>

        {/* Card 2: Vibration X */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Vibration (X-Axis)</span>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Gauge className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold ${
                metrics && metrics.vibration_x > 3.0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {metrics ? metrics.vibration_x.toFixed(2) : '--.--'}
            </span>
            <span className="text-sm font-semibold text-slate-500">mm/s</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">ISO 10816 Limit: 2.8 mm/s</div>
        </div>

        {/* Card 3: Motor Current */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Motor Current</span>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold ${
                metrics && metrics.current > 18.0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {metrics ? metrics.current.toFixed(1) : '--.-'}
            </span>
            <span className="text-sm font-semibold text-slate-500">A</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Rated FLC: 15.0 A</div>
        </div>

        {/* Card 4: Shaft RPM */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Shaft Velocity</span>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <RotateCw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics ? metrics.rpm.toFixed(0) : '----'}
            </span>
            <span className="text-sm font-semibold text-slate-500">RPM</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Synchronous: 1500 RPM</div>
        </div>
      </section>

      {/* ─── Real-time Charts: Clean White Surfaces ───────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tri-Axial Vibration */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tri-Axial Bearing Vibration Stream
              </h2>
              <p className="text-xs text-slate-500">
                Continuous mechanical oscillations along X, Y, and Z orthogonal vectors
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Sampling: 500ms
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="vibX"
                  name="Vib X (Horizontal)"
                  stroke="#2563eb" // Blue
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibY"
                  name="Vib Y (Vertical)"
                  stroke="#d97706" // Yellow/Amber
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibZ"
                  name="Vib Z (Axial)"
                  stroke="#0284c7" // Sky Blue
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Temperature & Current */}
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Thermal &amp; Electrical Load Correlation
              </h2>
              <p className="text-xs text-slate-500">
                Stator winding heat dissipation versus phase current consumption
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
              Dual Axis
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  stroke="#d97706"
                  domain={[50, 'auto']}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#2563eb"
                  domain={[0, 'auto']}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#d97706" // Amber / Warm
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="current"
                  name="Current (A)"
                  stroke="#2563eb" // Blue
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ─── Interactive CLI Cheat-sheet for Thesis Defense ───────────────── */}
      <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
          <Terminal className="h-4 w-4 text-blue-600" />
          Thesis Defense Demo: Trigger Anomaly Commands via Terminal
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Run these CLI commands in your terminal to demonstrate how the AI detects various mechanical faults and triggers safety procedures:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-slate-400 font-sans text-[11px] mb-1">1. Bearing Scratch (Spike)</div>
            <code className="text-blue-600">python inject_fault.py --type spike</code>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-slate-400 font-sans text-[11px] mb-1">2. Overheating (Drift)</div>
            <code className="text-amber-600">python inject_fault.py --type drift</code>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-slate-400 font-sans text-[11px] mb-1">3. Mechanical Jam (Load)</div>
            <code className="text-blue-600">python inject_fault.py --type jam</code>
          </div>
          <div className="p-3 bg-slate-50 border border-rose-200 rounded-xl">
            <div className="text-rose-600 font-sans text-[11px] mb-1">4. Critical Trip (Interlock)</div>
            <code className="text-rose-600 font-bold">python inject_fault.py --type critical</code>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-blue-600" />
          <span>Device: MOTOR_INDUCTION_01 | Zone: Factory Floor A</span>
        </div>
        <div>Machine Learning Anomaly Detection for Industrial IoT Systems</div>
      </footer>
    </div>
  );
}
