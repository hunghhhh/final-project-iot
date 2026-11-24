import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import type { SensorPacket, AlertRecord } from '../types/iot';

interface AIFeatureInspectorProps {
  packet: SensorPacket | null;
}

export const AIFeatureInspector: React.FC<AIFeatureInspectorProps> = ({ packet }) => {
  const [activeTab, setActiveTab] = useState<'features' | 'models' | 'history'>('features');
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

  const diag = packet?.aiDiagnostics;
  const features = diag?.features || [];
  const details = diag?.details || {};

  // Fetch recent alerts from backend
  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const res = await fetch('http://localhost:3001/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // Backend might be offline
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAlerts();
    }
  }, [activeTab]);

  return (
    <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-6 flex flex-col gap-5">
      {/* ─── Header: AI Inspector ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                AI Neural Pipeline &amp; Feature Extraction Inspector
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time decomposition of 500ms sensor telemetry into normalized Z-scores and dual-model inference
              </p>
            </div>
          </div>
        </div>

        {/* Tabs & Model Badges */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('features')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'features' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Feature Vectors
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'models' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Dual-Model State
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              Alert History
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: Feature Extraction Table ─────────────────────────────── */}
      {activeTab === 'features' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>6 extracted physical dimensions</strong> normalized against official CWRU baseline (StandardScaler)
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Nominal (&le;2&sigma;)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Elevated (2&ndash;3.5&sigma;)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical (&gt;3.5&sigma;)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Physical Dimension</th>
                  <th className="py-3 px-4">Sensor Source</th>
                  <th className="py-3 px-4">Real-Time Reading</th>
                  <th className="py-3 px-4">CWRU Baseline (&mu; &plusmn; &sigma;)</th>
                  <th className="py-3 px-4">Normalized Z-Score</th>
                  <th className="py-3 px-4 text-center">Safety Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {features.length > 0 ? (
                  features.map((item, idx) => {
                    const isCritical = item.status === 'CRITICAL';
                    const isWarning = item.status === 'WARNING';

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isCritical
                            ? 'bg-rose-50/70 font-semibold'
                            : isWarning
                            ? 'bg-amber-50/50'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-sans">
                          {item.sensor}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          {item.raw.toFixed(item.unit === 'mm/s' ? 3 : 2)}{' '}
                          <span className="text-[10px] text-slate-400 font-normal font-sans">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {item.mean.toFixed(item.unit === 'mm/s' ? 3 : 2)} &plusmn;{' '}
                          {item.std.toFixed(3)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-xs ${
                              isCritical
                                ? 'bg-rose-600 text-white'
                                : isWarning
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.zScore > 0 ? `+${item.zScore.toFixed(2)}` : item.zScore.toFixed(2)}&sigma;
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              CRITICAL SPIKE
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              ELEVATED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              NOMINAL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      Waiting for AI telemetry stream packet...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Dual-Model State Decomposition ──────────────────────── */}
      {activeTab === 'models' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Isolation Forest */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Model 1: Isolation Forest
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                  Point Shock Detector
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                Constructs 150 randomized decision isolation trees to measure path length of the current 6D vector. Point anomalies require significantly fewer splits.
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60 font-mono">
                  <span className="text-slate-500 font-sans">Raw Tree Decision Score:</span>
                  <span className="font-bold text-slate-800">
                    {details.iso_raw_score !== undefined ? details.iso_raw_score.toFixed(4) : '--'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60 font-mono">
                  <span className="text-slate-500 font-sans">Isolation Threshold:</span>
                  <span className="text-slate-600">-0.6000 (Nominal baseline: &gt;-0.60)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60 font-mono">
                  <span className="text-slate-500 font-sans">Normalized Risk Index:</span>
                  <span className="font-bold text-blue-700">
                    {details.iso_anomaly_score !== undefined ? `${(details.iso_anomaly_score * 100).toFixed(1)}%` : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs flex items-center justify-between text-slate-500">
              <span>Latency: &lt;2.0 ms</span>
              <span className="font-semibold text-emerald-600">Specialty: Bearing Crack Spikes</span>
            </div>
          </div>

          {/* Card 2: PyTorch LSTM Autoencoder */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-600"></div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Model 2: PyTorch LSTM Autoencoder
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                  Temporal Sequence Reconstruction
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                Compresses a sliding sequence of 10 consecutive vectors into 16 latent dimensions and measures Mean Squared Error (MSE) during waveform reconstruction.
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60 font-mono">
                  <span className="text-slate-500 font-sans">Reconstruction MSE Error:</span>
                  <span className="font-bold text-slate-800">
                    {details.lstm_reconstruction_error !== undefined ? details.lstm_reconstruction_error.toFixed(4) : '--'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60 font-mono">
                  <span className="text-slate-500 font-sans">MSE Damage Threshold:</span>
                  <span className="text-slate-600">
                    {details.lstm_threshold !== undefined ? details.lstm_threshold.toFixed(4) : '5.000'} (CWRU 95th %ile)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60 font-mono">
                  <span className="text-slate-500 font-sans">Sequential Anomaly Score:</span>
                  <span className="font-bold text-amber-700">
                    {details.lstm_anomaly_score !== undefined ? `${(details.lstm_anomaly_score * 100).toFixed(1)}%` : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs flex items-center justify-between text-slate-500">
              <span>Sliding Window: 10 frames</span>
              <span className="font-semibold text-amber-700">Specialty: Thermal &amp; Rotor Drift</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Recent AI Alert History Log ─────────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Real-time audit log of critical faults captured by the AI interlock and persisted into SQLite
            </span>
            <button
              onClick={fetchAlerts}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${loadingAlerts ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">AI Model</th>
                  <th className="py-2.5 px-4">Anomaly Score</th>
                  <th className="py-2.5 px-4">Fault Classification</th>
                  <th className="py-2.5 px-4">Root Cause Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500 font-sans whitespace-nowrap">
                        {new Date(Number(alert.createdAt)).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        {alert.modelName}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {(alert.anomalyScore * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-800">
                        {alert.faultType || 'unspecified'}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-600 truncate max-w-xs">
                        {alert.message}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      {loadingAlerts
                        ? 'Fetching alert records...'
                        : 'No critical anomaly alerts logged yet. System operating within nominal bounds.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
