import React, { useRef, useEffect } from 'react';
import { Terminal, X, RefreshCw, Unplug, PlugZap } from 'lucide-react';
import { ConnectionState } from '../types/telemetry';

interface SerialConsoleProps {
  rxConsole: string[];
  connectionState: ConnectionState;
  selectedPort: string;
  baudRate: number;
  useVirtualStm32: boolean;
  onSelectPort: (port: string) => void;
  onToggleVirtual: (val: boolean) => void;
  onConnect: (port: string) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

const AVAILABLE_PORTS = ['COM3', 'COM4', 'COM5', '/dev/ttyACM0', '/dev/ttyUSB0'];

export const SerialConsole: React.FC<SerialConsoleProps> = ({
  rxConsole,
  connectionState,
  selectedPort,
  baudRate,
  useVirtualStm32,
  onSelectPort,
  onToggleVirtual,
  onConnect,
  onDisconnect,
  onClose,
}) => {
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rxConsole]);

  return (
    <div className="industrial-card p-4 space-y-3 border-teal-500/40 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-teal-400" />
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
            STM32 Serial Hardware Console (115200 Baud)
          </h3>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Connection Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-[#070e24] border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Port:</span>
          <select
            value={selectedPort}
            onChange={(e) => onSelectPort(e.target.value)}
            className="bg-[#0b142c] border border-slate-700 rounded px-2 py-1 text-white outline-none focus:border-teal-400"
          >
            {AVAILABLE_PORTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-400">
          Baud: <span className="text-teal-400 font-bold">{baudRate}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onConnect(selectedPort)}
            className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-semibold transition-all"
          >
            <PlugZap className="h-3.5 w-3.5" />
            <span>Connect</span>
          </button>

          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-all"
          >
            <Unplug className="h-3.5 w-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* Simulator Mode Switch */}
      <div className="flex items-center justify-between px-3 py-2 bg-sky-950/20 border border-sky-800/40 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-slate-300">Virtual STM32 Hardware-Free Fallback:</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-teal-400">
          <input
            type="checkbox"
            checked={useVirtualStm32}
            onChange={(e) => onToggleVirtual(e.target.checked)}
            className="rounded border-slate-700 text-teal-500 focus:ring-0 bg-[#070e24]"
          />
          <span>{useVirtualStm32 ? 'ENABLED (Auto Loopback)' : 'DISABLED (Real Hardware Port)'}</span>
        </label>
      </div>

      {/* Console Output Screen */}
      <div className="h-48 overflow-y-auto bg-[#030611] rounded-lg p-3 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-900 select-text">
        {rxConsole.map((line, idx) => {
          const isError = line.includes('ERR') || line.includes('FAIL');
          const isTx = line.includes('[TX]');
          const isData = line.includes('[DATA]');
          const isState = line.includes('[STATE]') || line.includes('[RX] READY') || line.includes('[RX] STARTED');

          return (
            <div
              key={idx}
              className={`${
                isError
                  ? 'text-red-400'
                  : isTx
                  ? 'text-cyan-400'
                  : isState
                  ? 'text-amber-300 font-bold'
                  : isData
                  ? 'text-slate-400'
                  : 'text-slate-300'
              }`}
            >
              {line}
            </div>
          );
        })}
        <div ref={consoleBottomRef} />
      </div>
    </div>
  );
};
