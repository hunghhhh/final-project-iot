import React from 'react';
import {
  AlertOctagon,
  Power,
  RotateCcw,
  Thermometer,
  Activity,
  Zap,
  Gauge,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import type { SensorPacket } from '../types/iot';

interface EmergencyPageProps {
  packet: SensorPacket | null;
  onReset: () => void;
}

export const EmergencyPage: React.FC<EmergencyPageProps> = ({ packet, onReset }) => {
  const m = packet?.metrics;
  const score = packet?.anomalyScore ?? 0.98;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-rose-700 to-red-950 text-white p-6 sm:p-10 flex flex-col justify-between select-none">
      {/* ─── Emergency Header ────────────────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-red-400/40 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white text-red-600 rounded-2xl shadow-2xl shadow-black/40 animate-bounce">
              <AlertOctagon className="h-10 w-10" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white backdrop-blur-md tracking-widest uppercase mb-1 border border-white/30">
                <Flame className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                AUTOMATED SAFETY INTERLOCK TRIPPED
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                EMERGENCY MOTOR SHUTDOWN
              </h1>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-right">
            <div className="text-xs font-bold text-red-200 uppercase tracking-widest">
              AI Risk Index
            </div>
            <div className="text-4xl sm:text-5xl font-black text-amber-300 drop-shadow">
              {(score * 100).toFixed(1)}%
            </div>
            <div className="text-[11px] text-red-200/80 font-medium">Critical Interlock Threshold: &ge;85%</div>
          </div>
        </div>

        {/* ─── AI Diagnostic Explanation Box ─────────────────────────── */}
        <div className="mt-8 bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border-4 border-red-500">
          <div className="flex items-center justify-between gap-2 text-red-700 font-extrabold text-sm uppercase tracking-wider mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              CWRU Real-Time AI Diagnostic &amp; Root Cause Analysis
            </div>
            {packet?.aiDiagnostics?.latencyMs && (
              <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold">
                Inference Latency: {packet.aiDiagnostics.latencyMs} ms
              </span>
            )}
          </div>
          <p className="text-slate-900 text-base leading-relaxed font-bold bg-red-50 p-4 rounded-xl border border-red-200">
            {packet?.aiDiagnostics?.rootCause ??
              "Severe multi-variate mechanical anomaly detected by Dual-Tier AI (Isolation Forest + PyTorch LSTM Autoencoder). Sensor readings breached safe operational thresholds."}
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-red-700">1. Bearing Mechanical Shock</div>
              <div className="text-slate-600 mt-1">Tri-axial vibration peaked above ISO 10816 Class II damage limits.</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-red-700">2. Stator Thermal Breakdown</div>
              <div className="text-slate-600 mt-1">Temperature trajectory indicates insulation degradation or severe overload.</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-red-700">3. Current Surge / Rotor Slip</div>
              <div className="text-slate-600 mt-1">Substantial current rise coupled with rotational deceleration.</div>
            </div>
          </div>
        </div>

        {/* ─── Telemetry Snapshot at Failure Moment ───────────────────── */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div className="flex items-center justify-between text-red-100 text-xs font-semibold">
              <span>Stator Temperature</span>
              <Thermometer className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              {m ? m.temperature.toFixed(1) : '98.5'} <span className="text-lg">°C</span>
            </div>
            <div className="text-[11px] text-amber-300 font-semibold mt-1">Normal: ~68.0 °C</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div className="flex items-center justify-between text-red-100 text-xs font-semibold">
              <span>Peak Vibration (X)</span>
              <Activity className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              {m ? m.vibration_x.toFixed(2) : '12.45'} <span className="text-lg">mm/s</span>
            </div>
            <div className="text-[11px] text-amber-300 font-semibold mt-1">ISO Limit: 2.8 mm/s</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div className="flex items-center justify-between text-red-100 text-xs font-semibold">
              <span>Motor Current</span>
              <Zap className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              {m ? m.current.toFixed(1) : '34.2'} <span className="text-lg">A</span>
            </div>
            <div className="text-[11px] text-amber-300 font-semibold mt-1">Rated FLC: 15.0 A</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div className="flex items-center justify-between text-red-100 text-xs font-semibold">
              <span>Shaft Velocity</span>
              <Gauge className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              {m ? m.rpm.toFixed(0) : '650'} <span className="text-lg">RPM</span>
            </div>
            <div className="text-[11px] text-amber-300 font-semibold mt-1">Nominal: 1797 RPM</div>
          </div>
        </div>
      </div>

      {/* ─── Emergency Control Actions ─────────────────────────────────── */}
      <div className="mt-10 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-red-100">
          <Power className="h-6 w-6 text-amber-300 animate-pulse" />
          <span className="font-medium">
            Emergency trip signal latched. Simulated motor drive circuit has been safely isolated.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider bg-white hover:bg-slate-100 text-red-700 shadow-2xl shadow-black/50 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-5 w-5 text-red-600" />
            ACKNOWLEDGE &amp; RESET SYSTEM
          </button>
        </div>
      </div>
    </div>
  );
};
