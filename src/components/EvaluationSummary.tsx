import React from 'react';
import { SessionRecord, MotorState } from '../types/telemetry';

interface EvaluationSummaryProps {
  sessions: SessionRecord[];
  activeSession: {
    sessionId: number;
    motorState: MotorState;
    duration: number;
    maxVRes: number;
    maxTRes: number;
    alarmsCount: number;
  };
}

export const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({
  sessions,
  activeSession,
}) => {
  return (
    <div className="industrial-card p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
          SECTION 04
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
          State-Session Evaluation Summary
        </h2>
      </div>

      <div className="overflow-x-auto max-h-56 overflow-y-auto">
        <table className="w-full text-center text-xs font-mono">
          <thead className="bg-[#091124] text-slate-400 uppercase text-[10px] sticky top-0">
            <tr>
              <th className="py-2.5 px-3 border-b border-slate-800">Session ID</th>
              <th className="py-2.5 px-3 border-b border-slate-800">Operating State</th>
              <th className="py-2.5 px-3 border-b border-slate-800">Duration (s)</th>
              <th className="py-2.5 px-3 border-b border-slate-800">Max |V_res|</th>
              <th className="py-2.5 px-3 border-b border-slate-800">Max |T_res|</th>
              <th className="py-2.5 px-3 border-b border-slate-800">Alarms Tripped</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {/* Archived Past Sessions */}
            {sessions.map((sess) => (
              <tr key={sess.session_id} className="hover:bg-slate-800/40 transition-colors text-slate-300">
                <td className="py-2 px-3 text-cyan-400 font-bold">#{sess.session_id}</td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sess.state === 'ON'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {sess.state}
                  </span>
                </td>
                <td className="py-2 px-3">{sess.duration.toFixed(2)}s</td>
                <td className="py-2 px-3">{sess.max_V_res.toFixed(1)}</td>
                <td className="py-2 px-3">{sess.max_T_res.toFixed(2)} °C</td>
                <td className="py-2 px-3">
                  <span className={sess.alarms_in_session > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                    {sess.alarms_in_session}
                  </span>
                </td>
              </tr>
            ))}

            {/* Current Active Session */}
            <tr className="bg-sky-950/20 text-sky-200 font-semibold border-t-2 border-teal-500/30">
              <td className="py-2.5 px-3 text-teal-400 font-bold">#{activeSession.sessionId} (Active)</td>
              <td className="py-2.5 px-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeSession.motorState === 'ON'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                      : 'bg-slate-800 text-slate-400 border border-slate-600'
                  }`}
                >
                  {activeSession.motorState}
                </span>
              </td>
              <td className="py-2.5 px-3">{activeSession.duration.toFixed(2)}s</td>
              <td className="py-2.5 px-3">{activeSession.maxVRes.toFixed(1)}</td>
              <td className="py-2.5 px-3">{activeSession.maxTRes.toFixed(2)} °C</td>
              <td className="py-2.5 px-3">
                <span className={activeSession.alarmsCount > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {activeSession.alarmsCount}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400 italic">
        A session record is created on every motor state transition (ON ↔ OFF) to preserve max residuals and alarms permanently.
      </p>
    </div>
  );
};
