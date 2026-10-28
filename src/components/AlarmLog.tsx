import React from 'react';
import { AlarmEvent } from '../types/telemetry';
import { AlertOctagon, CheckCircle2, Trash2 } from 'lucide-react';

interface AlarmLogProps {
  alarmEvents: AlarmEvent[];
  onClearAlarms: () => void;
}

export const AlarmLog: React.FC<AlarmLogProps> = ({
  alarmEvents,
  onClearAlarms,
}) => {
  return (
    <div className="industrial-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
            SECTION 03
          </span>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-2">
            <span>Anomaly Alarm History Log</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {alarmEvents.length} events
            </span>
          </h2>
        </div>

        {alarmEvents.length > 0 && (
          <button
            onClick={onClearAlarms}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-600/40 transition-colors"
            title="Clear all recorded alarms"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear Log</span>
          </button>
        )}
      </div>

      {alarmEvents.length === 0 ? (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Nominal operation — Zero anomaly events recorded. All twin residuals within safety bounds.</span>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#091124] text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="py-2 px-3 border-b border-slate-800">Timestamp</th>
                <th className="py-2 px-3 border-b border-slate-800">Alarm Type</th>
                <th className="py-2 px-3 border-b border-slate-800">Residual</th>
                <th className="py-2 px-3 border-b border-slate-800">Threshold</th>
                <th className="py-2 px-3 border-b border-slate-800">Session ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {alarmEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-red-950/20 transition-colors text-slate-300">
                  <td className="py-2 px-3 font-semibold text-slate-400">{evt.timestamp}</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                      <AlertOctagon className="h-3 w-3" />
                      {evt.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-red-300 font-bold">{evt.residual}</td>
                  <td className="py-2 px-3 text-slate-400">{evt.threshold}</td>
                  <td className="py-2 px-3 text-cyan-400">#{evt.session_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
