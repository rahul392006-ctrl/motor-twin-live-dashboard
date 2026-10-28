import React from 'react';
import { ConnectionState, MotorState } from '../types/telemetry';
import { Cpu, Radio, AlertOctagon, Power, Usb } from 'lucide-react';

interface HeaderProps {
  connectionState: ConnectionState;
  motorState: MotorState;
  alarmActive: boolean;
  selectedPort: string;
  useVirtualStm32: boolean;
  onConnectUsb?: () => void;
  onDisconnectUsb?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  motorState,
  alarmActive,
  selectedPort,
  useVirtualStm32,
  onConnectUsb,
  onDisconnectUsb,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#070e24]/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Title & Architecture Subtitle */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/10 border border-teal-500/30 text-teal-400 shadow-inner">
          <Cpu className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg lg:text-xl font-extrabold tracking-tight text-white">
              Motor Digital Twin
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-400 border border-teal-800/60 uppercase">
              Live Dashboard
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            AI/ML-Ready Industrial Condition Monitoring | STM32 Serial Telemetry Link
          </p>
        </div>
      </div>

      {/* Status Badges Group */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Connection State Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
            connectionState === 'RUNNING'
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : connectionState === 'READY'
              ? 'bg-orange-950/60 text-orange-400 border-orange-600/60'
              : connectionState === 'WAITING'
              ? 'bg-amber-950/60 text-amber-400 border-amber-600/60'
              : 'bg-red-950/60 text-red-400 border-red-600/60'
          }`}
        >
          <Radio className="h-3 w-3" />
          <span>{connectionState} ({String(selectedPort || 'COM3')})</span>
        </div>

        {/* Motor State Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
            motorState === 'ON'
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/60'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
          }`}
        >
          <Power className="h-3 w-3" />
          <span>MOTOR {motorState}</span>
        </div>

        {/* Alarm Summary Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
            alarmActive
              ? 'bg-red-950 text-red-400 border-red-600'
              : 'bg-teal-950/40 text-teal-400 border-teal-800/40'
          }`}
        >
          <AlertOctagon className="h-3 w-3" />
          <span>{alarmActive ? 'ANOMALY DETECTED' : 'NOMINAL (0 ALARMS)'}</span>
        </div>

        {/* Simulation / Hardware Indicator */}
        <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0b142c] border border-slate-800 text-[11px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span>{useVirtualStm32 ? 'Virtual STM32 Loopback' : 'Physical USB COM'}</span>
        </div>

        {/* PROMINENT USB CONNECTION CONTROL */}
        {connectionState === 'RUNNING' ? (
          <button
            onClick={() => onDisconnectUsb?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/60 text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm"
            title="Disconnect USB serial connection"
          >
            <Usb className="h-3.5 w-3.5 text-red-400" />
            <span>Disconnect USB</span>
          </button>
        ) : (
          <button
            onClick={() => onConnectUsb?.()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 text-xs font-mono font-bold tracking-wide shadow-[0_0_15px_rgba(20,184,166,0.5)] transition-all cursor-pointer animate-pulse"
            title="Connect to USB Serial to unlock motor controls"
          >
            <Usb className="h-3.5 w-3.5" />
            <span>🔌 Connect to USB</span>
          </button>
        )}
      </div>
    </header>
  );
};
