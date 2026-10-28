import React, { useState } from 'react';
import { KambarAvatar } from './KambarAvatar';
import { AnimatedCompanion, CompanionState } from './AnimatedCompanion';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatMessage, ValidatedMetrics } from '../../types/telemetry';
import { generateKambarResponse, KambarContext } from '../../services/motorTwinService';
import { ChevronDown, ChevronUp } from 'lucide-react';
import '../../styles/kambar.css';

interface KambarAIProps {
  motorOn: boolean;
  alarmActive: boolean;
  connectionState: string;
  currentVib: number;
  currentTemp: number;
  vPred: number;
  tPred: number;
  vRes: number;
  tRes: number;
  activeAlarms: string[];
  totalAlarms: number;
  validatedMetrics?: ValidatedMetrics | null;
  selectedPort: string;
}

export const KambarAI: React.FC<KambarAIProps> = ({
  motorOn,
  alarmActive,
  connectionState,
  currentVib,
  currentTemp,
  vPred,
  tPred,
  vRes,
  tRes,
  activeAlarms,
  totalAlarms,
  validatedMetrics,
  selectedPort,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [companionState, setCompanionState] = useState<CompanionState>('IDLE');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Derive mood emoji and description based on dashboard state
  const { moodEmoji, moodDesc } = (() => {
    if (alarmActive) {
      return { moodEmoji: '😟', moodDesc: 'Alert active — anomaly detected' };
    }
    if (connectionState === 'WAITING') {
      return { moodEmoji: '😴', moodDesc: 'Waiting for STM32 boot' };
    }
    if (connectionState === 'READY') {
      return { moodEmoji: '👀', moodDesc: 'STM32 READY — Blue button awaited' };
    }
    if (connectionState === 'RUNNING') {
      return motorOn
        ? { moodEmoji: '🤩', moodDesc: 'Motor RUNNING (Active rotation & flux)' }
        : { moodEmoji: '😊', moodDesc: 'Motor idle — normal ambient baseline' };
    }
    if (connectionState === 'ERROR') {
      return { moodEmoji: '😵', moodDesc: 'Serial link error' };
    }
    return { moodEmoji: '😴', moodDesc: 'Standing by' };
  })();

  const handleSendMessage = (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setCompanionState('BOUNCE');
    setIsThinking(true);

    // 2. Prepare context
    const ctx: KambarContext = {
      motorOn,
      alarmActive,
      connectionState,
      currentVib,
      currentTemp,
      vPred,
      tPred,
      vRes,
      tRes,
      activeAlarms,
      totalAlarms,
      validatedMetrics,
      selectedPort,
    };

    // 3. Simulate thoughtful response latency with companion animation
    setTimeout(() => {
      setCompanionState('THINKING');
    }, 200);

    setTimeout(() => {
      const response = generateKambarResponse(text, ctx);
      const kambarMsg: ChatMessage = {
        id: `${Date.now()}-kambar`,
        sender: 'kambar',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        statusBadge: response.badge,
      };

      setMessages((prev) => [...prev, kambarMsg]);
      setIsThinking(false);
      setCompanionState(alarmActive ? 'ERROR' : 'RESPONDING');

      // Return to idle after celebration
      setTimeout(() => {
        setCompanionState('IDLE');
      }, 1500);
    }, 450);
  };

  const handleClearChat = () => {
    setMessages([]);
    setCompanionState('IDLE');
  };

  return (
    <div className="industrial-card p-4 space-y-3 kolam-pattern-bg border-amber-500/30 relative">
      {/* Top Header with Tamil Literary Accents & Companion */}
      <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <AnimatedCompanion
            state={companionState}
            onClick={() => {
              setCompanionState('BOUNCE');
              setTimeout(() => setCompanionState('IDLE'), 800);
            }}
          />
          <div>
            <h3 className="text-xs font-bold text-amber-300 font-mono tracking-wider uppercase">
              Section 08 — Kambar AI Assistant
            </h3>
            <span className="text-[10px] text-teal-400 font-medium">
              கம்பநாடன் கவியமுதம் | Digital Twin Intelligence
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-slate-400 hover:text-amber-300 transition-colors"
          title={isCollapsed ? 'Expand Kambar AI' : 'Collapse Kambar AI'}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Illustrated Poet Avatar Profile */}
          <KambarAvatar
            moodEmoji={moodEmoji}
            moodDescription={moodDesc}
          />

          {/* Live Dashboard Telemetry & Health Status (Embedded inside AI box) */}
          <div className="p-2.5 rounded-xl bg-[#081226]/90 border border-teal-500/30 text-xs space-y-2 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${connectionState === 'RUNNING' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-mono font-bold text-[11px] text-amber-300 uppercase tracking-wider">
                  Live Dashboard Status
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                connectionState === 'RUNNING' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-slate-800 text-slate-400'
              }`}>
                {connectionState} ({String(selectedPort || 'COM3')})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              {/* Motor State */}
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#0d1b38] border border-slate-800">
                <span className="text-slate-400">Motor:</span>
                <span className={`font-bold ${motorOn ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {motorOn ? 'ON 🟢' : 'OFF ⚪'}
                </span>
              </div>

              {/* Alarm State */}
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#0d1b38] border border-slate-800">
                <span className="text-slate-400">Alarms:</span>
                <span className={`font-bold ${alarmActive ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {alarmActive ? `${activeAlarms.length} Active ⚠️` : '0 Nominal'}
                </span>
              </div>

              {/* Vibration */}
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#0d1b38] border border-slate-800">
                <span className="text-slate-400">Vib:</span>
                <span className="text-cyan-300 font-bold">
                  {currentVib.toFixed(0)} <span className="text-[9px] text-slate-500">(Δ{vRes > 0 ? '+' : ''}{vRes.toFixed(0)})</span>
                </span>
              </div>

              {/* Temperature */}
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#0d1b38] border border-slate-800">
                <span className="text-slate-400">Temp:</span>
                <span className="text-amber-300 font-bold">
                  {currentTemp.toFixed(1)}°C <span className="text-[9px] text-slate-500">(Δ{tRes > 0 ? '+' : ''}{tRes.toFixed(1)})</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => handleSendMessage('Give me a full dashboard status and telemetry breakdown.')}
              className="w-full text-center py-1 text-[10px] text-teal-300 hover:text-teal-200 bg-teal-950/40 hover:bg-teal-900/50 border border-teal-800/50 rounded font-mono transition-colors cursor-pointer"
            >
              📊 Ask Kambar for Detailed Telemetry Breakdown →
            </button>
          </div>

          {/* Chat Messages Log */}
          <ChatMessages
            messages={messages}
            isThinking={isThinking}
          />

          {/* Chat Input & Quick Questions */}
          <ChatInput
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            disabled={isThinking}
          />
        </>
      )}
    </div>
  );
};
