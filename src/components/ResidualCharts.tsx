import React from 'react';
import { TelemetrySample } from '../types/telemetry';
import { T_THRESH, V_THRESH } from '../services/motorTwinService';

interface ResidualChartsProps {
  samples: TelemetrySample[];
}

export const ResidualCharts: React.FC<ResidualChartsProps> = ({ samples }) => {
  const chartHeight = 140;
  const chartWidth = 560;

  // 1. Vibration Residual Scaler (-450 to +450)
  const vBound = 450;
  const vZeroY = chartHeight / 2;
  const vUpperY = vZeroY - (V_THRESH / vBound) * (chartHeight / 2);
  const vLowerY = vZeroY + (V_THRESH / vBound) * (chartHeight / 2);

  const vResPoints = samples.map((s, idx) => {
    const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartWidth : 0;
    const clamped = Math.max(-vBound, Math.min(vBound, s.V_res));
    const y = vZeroY - (clamped / vBound) * (chartHeight / 2 - 10);
    return `${x},${y}`;
  }).join(' ');

  // 2. Temperature Residual Scaler (-5.0 to +5.0 °C)
  const tBound = 5.0;
  const tZeroY = chartHeight / 2;
  const tUpperY = tZeroY - (T_THRESH / tBound) * (chartHeight / 2);
  const tLowerY = tZeroY + (T_THRESH / tBound) * (chartHeight / 2);

  const tResPoints = samples.map((s, idx) => {
    const x = samples.length > 1 ? (idx / (samples.length - 1)) * chartWidth : 0;
    const clamped = Math.max(-tBound, Math.min(tBound, s.T_res));
    const y = tZeroY - (clamped / tBound) * (chartHeight / 2 - 10);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-4">
      {/* Vibration Residual Chart */}
      <div className="industrial-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
              Vibration Residual (V_measured − V_pred)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Threshold: <span className="text-red-400 font-bold">±{V_THRESH} units</span>
          </span>
        </div>

        <div className="relative w-full overflow-hidden bg-[#070e24] rounded-lg p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
            {/* Zero Baseline */}
            <line x1="0" y1={vZeroY} x2={chartWidth} y2={vZeroY} stroke="#334155" strokeWidth="1.5" />

            {/* Threshold Lines (Red dashed) */}
            <line x1="0" y1={vUpperY} x2={chartWidth} y2={vUpperY} stroke="#ef4444" strokeDasharray="4 3" strokeWidth="1" />
            <line x1="0" y1={vLowerY} x2={chartWidth} y2={vLowerY} stroke="#ef4444" strokeDasharray="4 3" strokeWidth="1" />

            {/* Residual Curve */}
            {samples.length > 1 && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                points={vResPoints}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Temperature Residual Chart */}
      <div className="industrial-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
              Temperature Residual (T_measured − T_pred)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Threshold: <span className="text-red-400 font-bold">±{T_THRESH.toFixed(1)} °C</span>
          </span>
        </div>

        <div className="relative w-full overflow-hidden bg-[#070e24] rounded-lg p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
            {/* Zero Baseline */}
            <line x1="0" y1={tZeroY} x2={chartWidth} y2={tZeroY} stroke="#334155" strokeWidth="1.5" />

            {/* Threshold Lines (Red dashed) */}
            <line x1="0" y1={tUpperY} x2={chartWidth} y2={tUpperY} stroke="#ef4444" strokeDasharray="4 3" strokeWidth="1" />
            <line x1="0" y1={tLowerY} x2={chartWidth} y2={tLowerY} stroke="#ef4444" strokeDasharray="4 3" strokeWidth="1" />

            {/* Residual Curve */}
            {samples.length > 1 && (
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                points={tResPoints}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
