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
} from 'lucide-react';
import type { SensorPacket } from '../types/iot';

interface EmergencyPageProps {
  packet: SensorPacket | null;
  onReset: () => void;
}

export const EmergencyPage: React.FC<EmergencyPageProps> = ({ packet, onReset }) => {
  const m = packet?.metrics;
  const score = packet?.anomalyScore ?? 0.96;

  return (
    <div className="min-h-screen bg-rose-50 text-slate-900 p-6 sm:p-10 flex flex-col justify-between">
      {/* ─── Emergency Header ────────────────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-rose-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-600/30 animate-pulse">
              <AlertOctagon className="h-9 w-9" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-800 tracking-wider uppercase mb-1">
                Automated Safety Interlock Active
              </div>
              <h1 className="text-3xl font-extrabold text-rose-950 tracking-tight">
                CATASTROPHIC MOTOR ANOMALY DETECTED
              </h1>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-widest">
              AI Anomaly Index
            </div>
            <div className="text-4xl font-black text-rose-700">
              {(score * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-rose-800 font-medium">Critical Failure Threshold: &gt;80%</div>
          </div>
        </div>

        {/* ─── AI Diagnostic Explanation Box ─────────────────────────── */}
        <div className="mt-8 bg-white border-2 border-rose-400 rounded-2xl p-6 shadow-xl shadow-rose-200/50">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm uppercase tracking-wider mb-2">
            <ShieldAlert className="h-5 w-5" />
            AI Root Cause Diagnostic &amp; Safety Reasoning
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">
            The multi-variate anomaly detection model (LSTM Autoencoder + Isolation Forest) observed severe, non-linear deviations across multiple physical dimensions simultaneously. Reconstruction error surpassed the ISO 10816 Class II mechanical safety envelope. Motor telemetry indicates imminent rotor seizure, extreme thermal breakdown, and high mechanical risk.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="font-semibold text-rose-900">1. Bearing Mechanical Shock</div>
              <div className="text-slate-600 mt-0.5">Tri-axial vibration peaked above 10.0 mm/s. Severe structural harmonics.</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="font-semibold text-rose-900">2. Thermal Runaway</div>
              <div className="text-slate-600 mt-0.5">Stator temperature crossed thermal insulation Class F safe operating zone.</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="font-semibold text-rose-900">3. Current Surge / Jam</div>
              <div className="text-slate-600 mt-0.5">Phase current surged &gt;250% over rated full-load limit, indicating rotor lock.</div>
            </div>
          </div>
        </div>

        {/* ─── Telemetry Snapshot at Failure Moment ───────────────────── */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Stator Temperature</span>
              <Thermometer className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {m ? m.temperature.toFixed(1) : '98.5'} °C
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">Hazard: Exceeds 90°C</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Peak Vibration (X)</span>
              <Activity className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {m ? m.vibration_x.toFixed(2) : '12.45'} mm/s
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">Limit: 2.8 mm/s</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Phase Current</span>
              <Zap className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {m ? m.current.toFixed(1) : '34.2'} A
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">Overcurrent trip limit: 20A</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Shaft RPM</span>
              <Gauge className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {m ? m.rpm.toFixed(0) : '650'} RPM
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">Severe Speed Collapse</div>
          </div>
        </div>
      </div>

      {/* ─── Emergency Control Actions ─────────────────────────────────── */}
      <div className="mt-10 pt-6 border-t border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Power className="h-5 w-5 text-rose-600" />
          <span>Physical safety relay tripped. Drive power severed to protect industrial plant.</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Acknowledge &amp; Reset System
          </button>
        </div>
      </div>
    </div>
  );
};
