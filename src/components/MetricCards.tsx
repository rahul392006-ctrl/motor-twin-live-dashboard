import React from 'react';
import { Activity, Thermometer, AlertTriangle, ShieldCheck } from 'lucide-react';
import { T_THRESH, V_THRESH } from '../services/motorTwinService';

interface MetricCardsProps {
  curVib: number;
  curTemp: number;
  curVPred: number;
  curTPred: number;
  curVRes: number;
  curTRes: number;
  alarmV: boolean;
  alarmT: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  curVib,
  curTemp,
  curVPred,
  curTPred,
  curVRes,
  curTRes,
  alarmV,
  alarmT,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1.5">
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
          SECTION 02
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
          Live Telemetry & Residual Metric Cards
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vibration */}
        <div className="industrial-card p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Vibration Telemetry
            </span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {curVib.toFixed(0)}
            </span>
            <span className="text-xs text-slate-400 font-mono">units</span>
          </div>
          <div className="text-[11px] font-mono text-cyan-300 pt-1 border-t border-slate-800/60 flex justify-between">
            <span>Predicted (Twin):</span>
            <span className="font-bold">{curVPred.toFixed(0)}</span>
          </div>
        </div>

        {/* Card 2: Temperature */}
        <div className="industrial-card p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              DHT11 Temperature
            </span>
            <Thermometer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {curTemp.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">°C</span>
          </div>
          <div className="text-[11px] font-mono text-amber-300 pt-1 border-t border-slate-800/60 flex justify-between">
            <span>Predicted (Twin):</span>
            <span className="font-bold">{curTPred.toFixed(1)} °C</span>
          </div>
        </div>

        {/* Card 3: Vibration Residual */}
        <div
          className={`industrial-card p-4 space-y-2 relative overflow-hidden transition-all ${
            alarmV
              ? 'border-red-500/80 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Vibration Residual
            </span>
            {alarmV ? (
              <AlertTriangle className="h-4 w-4 text-red-400 animate-bounce" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-teal-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono tracking-tight ${
                alarmV ? 'text-red-400' : 'text-slate-100'
              }`}
            >
              {curVRes > 0 ? `+${curVRes.toFixed(1)}` : curVRes.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">units</span>
          </div>
          <div className="text-[11px] font-mono pt-1 border-t border-slate-800/60 flex justify-between">
            <span className="text-slate-400">Threshold:</span>
            <span className={alarmV ? 'text-red-400 font-bold' : 'text-slate-300'}>
              ±{V_THRESH} units {alarmV ? '(ALARM)' : '(OK)'}
            </span>
          </div>
        </div>

        {/* Card 4: Temperature Residual */}
        <div
          className={`industrial-card p-4 space-y-2 relative overflow-hidden transition-all ${
            alarmT
              ? 'border-red-500/80 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Temperature Residual
            </span>
            {alarmT ? (
              <AlertTriangle className="h-4 w-4 text-red-400 animate-bounce" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-teal-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono tracking-tight ${
                alarmT ? 'text-red-400' : 'text-slate-100'
              }`}
            >
              {curTRes > 0 ? `+${curTRes.toFixed(2)}` : curTRes.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">°C</span>
          </div>
          <div className="text-[11px] font-mono pt-1 border-t border-slate-800/60 flex justify-between">
            <span className="text-slate-400">Threshold:</span>
            <span className={alarmT ? 'text-red-400 font-bold' : 'text-slate-300'}>
              ±{T_THRESH} °C {alarmT ? '(ALARM)' : '(OK)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
