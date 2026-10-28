import React from 'react';
import { TelemetrySample } from '../types/telemetry';

interface TelemetryChartsProps {
  samples: TelemetrySample[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ samples }) => {
  const chartHeight = 160;
  const chartWidth = 560;

  // 1. Vibration Chart Scaler
  const vibMax = Math.max(750, ...samples.map((s) => Math.max(s.vibration, s.V_pred, 600)));
  const vibMin = 0;

  const vibPoints = samples.map((s, idx) => {
    const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartWidth : 0;
    const y = chartHeight - ((s.vibration - vibMin) / (vibMax - vibMin || 1)) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const vibPredPoints = samples.map((s, idx) => {
    const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartWidth : 0;
    const y = chartHeight - ((s.V_pred - vibMin) / (vibMax - vibMin || 1)) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  // 2. Temperature Chart Scaler
  const tempMax = Math.max(42, ...samples.map((s) => Math.max(s.temperature, s.T_pred, 38)));
  const tempMin = Math.min(20, ...samples.map((s) => Math.min(s.temperature, s.T_pred, 22)));

  const tempPoints = samples.map((s, idx) => {
    const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartWidth : 0;
    const y = chartHeight - ((s.temperature - tempMin) / (tempMax - tempMin || 1)) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const tempPredPoints = samples.map((s, idx) => {
    const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartWidth : 0;
    const y = chartHeight - ((s.T_pred - tempMin) / (tempMax - tempMin || 1)) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-4">
      {/* Chart 1: Vibration */}
      <div className="industrial-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
              Vibration Telemetry (Measured vs Twin Baseline)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Measured (V)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-3 h-0.5 border-b border-dashed border-amber-400 inline-block" /> Twin Pred (V_pred)
            </span>
          </div>
        </div>

        <div className="relative w-full overflow-hidden bg-[#070e24] rounded-lg p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
            {/* Grid Lines */}
            <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#192544" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="#192544" strokeDasharray="3 3" />
            <line x1="0" y1="140" x2={chartWidth} y2="140" stroke="#192544" strokeDasharray="3 3" />

            {/* Twin Baseline Line (Dashed Amber) */}
            {samples.length > 1 && (
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="5 3"
                points={vibPredPoints}
              />
            )}

            {/* Measured Vibration Line (Solid Cyan) */}
            {samples.length > 1 && (
              <polyline
                fill="none"
                stroke="#00d2d3"
                strokeWidth="2.5"
                points={vibPoints}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Chart 2: Temperature */}
      <div className="industrial-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
              DHT11 Temperature Telemetry (Measured vs Thermal Twin)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-blue-400">
              <span className="w-3 h-0.5 bg-blue-400 inline-block" /> DHT11 Temp
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-3 h-0.5 border-b border-dashed border-orange-400 inline-block" /> Twin Pred (T_pred)
            </span>
          </div>
        </div>

        <div className="relative w-full overflow-hidden bg-[#070e24] rounded-lg p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
            {/* Grid Lines */}
            <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#192544" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="#192544" strokeDasharray="3 3" />
            <line x1="0" y1="140" x2={chartWidth} y2="140" stroke="#192544" strokeDasharray="3 3" />

            {/* Twin Thermal Baseline (Dashed Orange) */}
            {samples.length > 1 && (
              <polyline
                fill="none"
                stroke="#fb923c"
                strokeWidth="2"
                strokeDasharray="5 3"
                points={tempPredPoints}
              />
            )}

            {/* Measured DHT11 Temperature (Solid Blue) */}
            {samples.length > 1 && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                points={tempPoints}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
