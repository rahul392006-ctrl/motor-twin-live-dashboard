import React, { useState } from 'react';
import { ConnectionState, MotorState } from '../types/telemetry';
import { Play, Square, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';

interface StatusBarProps {
  connectionState: ConnectionState;
  motorState: MotorState;
  onSendCommand: (cmd: 'O' | 'F') => void;
  onPressBlueButton: () => void;
  onConnectUsb?: () => void;
  onToggleConsole?: () => void;
  showConsole?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connectionState,
  motorState,
  onSendCommand,
  onPressBlueButton,
  onConnectUsb,
  onToggleConsole,
  showConsole = false,
}) => {
  const [charInput, setCharInput] = useState<string>('');

  const handleKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setCharInput(val);
    if (val === 'O') {
      onSendCommand('O');
      setCharInput('');
    } else if (val === 'F') {
      onSendCommand('F');
    }
  };

  return (
    <div className="industrial-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
            SECTION 01
          </span>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Motor Controls & Hardware Interface (O / F)
          </h2>
        </div>

        {onToggleConsole && (
          <button
            onClick={onToggleConsole}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              showConsole ? 'bg-teal-950 text-teal-300 border border-teal-700' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Terminal className="h-3 w-3" />
            <span>Raw Serial Console</span>
          </button>
        )}
      </div>

      {/* CONDITIONAL VISIBILITY STATE MACHINE & STRICT USB LOCK */}
      {connectionState !== 'RUNNING' && (
        <div className="p-4 bg-sky-950/30 border border-sky-800/50 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            {connectionState === 'READY' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-sky-200">
                {connectionState === 'DISCONNECTED'
                  ? 'USB Disconnected — Motor controls (O / F) are locked.'
                  : connectionState === 'WAITING'
                  ? 'Waiting for STM32 boot handshake (READY)...'
                  : 'STM32 Ready — Press blue button to unlock motor controls.'}
              </p>
              <p className="text-xs text-slate-400">
                {connectionState === 'DISCONNECTED'
                  ? 'Click "Connect to USB" in the top bar (or below) to establish USB serial telemetry with the STM32 Nucleo board.'
                  : 'Motor controls will unlock as soon as the serial stream is active.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {connectionState === 'DISCONNECTED' && onConnectUsb && (
              <button
                onClick={() => onConnectUsb?.()}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-teal-900/40 flex items-center gap-2 transition-all cursor-pointer animate-pulse"
              >
                <span>🔌 Connect to USB Now</span>
              </button>
            )}

            {connectionState === 'READY' && (
              <button
                onClick={onPressBlueButton}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-teal-900/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-ping" />
                <span>Simulate Blue Button Press on STM32 Nucleo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MOTOR ON / OFF CONTROLS (STRICTLY LOCKED UNLESS RUNNING) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Sends single ASCII character 'O' or 'F' across the serial line to switch motor operating mode.
          </p>
          {connectionState !== 'RUNNING' && (
            <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
              🔒 Locked: Connect USB First
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Button O */}
          <button
            onClick={() => onSendCommand('O')}
            disabled={connectionState !== 'RUNNING'}
            title={connectionState !== 'RUNNING' ? 'USB must be connected to turn motor ON' : 'Turn motor ON'}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              connectionState !== 'RUNNING'
                ? 'bg-slate-900 text-slate-600 border border-slate-800 opacity-40 cursor-not-allowed'
                : motorState === 'ON'
                ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400 cursor-pointer'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 cursor-pointer'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>▶ Motor ON (O)</span>
          </button>

          {/* Button F */}
          <button
            onClick={() => onSendCommand('F')}
            disabled={connectionState !== 'RUNNING'}
            title={connectionState !== 'RUNNING' ? 'USB must be connected to turn motor OFF' : 'Turn motor OFF'}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              connectionState !== 'RUNNING'
                ? 'bg-slate-900 text-slate-600 border border-slate-800 opacity-40 cursor-not-allowed'
                : motorState === 'OFF'
                ? 'bg-slate-700 text-white border border-slate-500 shadow-md cursor-pointer'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer'
            }`}
          >
            <Square className="h-3.5 w-3.5" />
            <span>■ Motor OFF (F)</span>
          </button>

          {/* Keyboard input box */}
          <div className="relative">
            <input
              type="text"
              maxLength={1}
              value={charInput}
              disabled={connectionState !== 'RUNNING'}
              onChange={handleKeyInput}
              placeholder={connectionState !== 'RUNNING' ? 'USB Locked' : "Type 'O' or 'F' (1 char)"}
              className={`w-full bg-[#070e24] border rounded-xl px-3 py-2 text-xs text-center font-mono outline-none transition-colors ${
                connectionState !== 'RUNNING'
                  ? 'border-slate-800 text-slate-600 placeholder-slate-700 cursor-not-allowed bg-slate-950/60'
                  : 'border-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 text-white placeholder-slate-500'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
