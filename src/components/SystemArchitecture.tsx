import React from 'react';
import { Cpu, ArrowRight, Activity, Terminal, Shield } from 'lucide-react';

export const SystemArchitecture: React.FC = () => {
  return (
    <div className="industrial-card p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
          SECTION 09
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
          End-to-End System Architecture
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
        {/* Stage 1 */}
        <div className="p-3 bg-[#081126] border border-slate-800 rounded-xl space-y-1">
          <Cpu className="h-5 w-5 text-teal-400 mx-auto" />
          <div className="text-xs font-bold text-white uppercase font-mono">1. STM32 Nucleo</div>
          <p className="text-[11px] text-slate-400">
            Reads DHT11 GPIO, generates dual-harmonic vibration, packetizes every 200ms.
          </p>
        </div>

        {/* Stage 2 */}
        <div className="p-3 bg-[#081126] border border-slate-800 rounded-xl space-y-1">
          <Terminal className="h-5 w-5 text-blue-400 mx-auto" />
          <div className="text-xs font-bold text-white uppercase font-mono">2. USB CDC Serial</div>
          <p className="text-[11px] text-slate-400">
            115200 Baud link transmitting ASCII telemetry and receiving O/F commands.
          </p>
        </div>

        {/* Stage 3 */}
        <div className="p-3 bg-[#081126] border border-slate-800 rounded-xl space-y-1">
          <Activity className="h-5 w-5 text-amber-400 mx-auto" />
          <div className="text-xs font-bold text-white uppercase font-mono">3. Digital Twin Model</div>
          <p className="text-[11px] text-slate-400">
            Calculates expected baseline (T_pred, V_pred) and real-time residuals (T_res, V_res).
          </p>
        </div>

        {/* Stage 4 */}
        <div className="p-3 bg-[#081126] border border-slate-800 rounded-xl space-y-1">
          <Shield className="h-5 w-5 text-emerald-400 mx-auto" />
          <div className="text-xs font-bold text-white uppercase font-mono">4. Dashboard & Kambar AI</div>
          <p className="text-[11px] text-slate-400">
            Interactive 3D motor, anomaly alarm engine, and Tamil literary assistant.
          </p>
        </div>
      </div>
    </div>
  );
};
