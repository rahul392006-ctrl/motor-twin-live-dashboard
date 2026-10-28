import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../types/telemetry';
import { Bot, User } from 'lucide-react';
import '../../styles/kambar.css';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isThinking: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isThinking }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[160px] max-h-[320px]">
      {messages.length === 0 && (
        <div className="text-center py-6 px-4 rounded-xl bg-[#091226]/50 border border-slate-800/80">
          <p className="text-xs text-amber-200/90 font-medium">
            "வணக்கம்! I am Kambar AI. Ask me about the motor digital twin, telemetry, vibration residuals, or safety boundaries."
          </p>
          <p className="text-[10px] text-slate-400 mt-1 italic">
            Select a quick question below or type your inquiry.
          </p>
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.sender === 'user';

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
          >
            {/* Header info with sender label & timestamp */}
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
              {isUser ? (
                <>
                  <span>You</span>
                  <User className="h-2.5 w-2.5 text-blue-400" />
                  <span>• {msg.timestamp}</span>
                </>
              ) : (
                <>
                  <Bot className="h-2.5 w-2.5 text-amber-400" />
                  <span className="font-semibold text-amber-300">Kambar AI</span>
                  {msg.statusBadge && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-600/40 text-[9px]">
                      {msg.statusBadge}
                    </span>
                  )}
                  <span>• {msg.timestamp}</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`p-3 text-xs leading-relaxed max-w-[92%] whitespace-pre-line ${
                isUser ? 'message-bubble-user text-sky-100' : 'message-bubble-assistant text-slate-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        );
      })}

      {/* Typing / Thinking Indicator */}
      {isThinking && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0e1b38]/60 border border-amber-500/20 w-fit">
          <span className="text-sm animate-pulse">🪶</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[10px] text-amber-300 italic">Kambar is composing...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
