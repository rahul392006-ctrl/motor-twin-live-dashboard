import React from 'react';
import { Database } from 'lucide-react';

export const DatasetProvenance: React.FC = () => {
  return (
    <div className="industrial-card p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
          SECTION 06
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
          Dataset Provenance
        </h2>
      </div>

      <div className="p-4 bg-sky-950/20 border border-sky-800/40 rounded-xl text-sky-200 text-xs flex items-center gap-3">
        <Database className="h-5 w-5 text-teal-400 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold text-white">Live STM32 Hardware Telemetry Pipeline:</p>
          <p className="text-slate-300">
            Real temperature acquired via physical DHT11 sensor probe connected to STM32 GPIO + simulated dual-harmonic vibration computed in STM32 microcontroller firmware. Streamed continuously over USB CDC at 115200 baud.
          </p>
        </div>
      </div>
    </div>
  );
};
