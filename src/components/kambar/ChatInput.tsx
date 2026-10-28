import React, { useState } from 'react';
import { Send, Trash2, HelpCircle } from 'lucide-react';
import '../../styles/kambar.css';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  disabled?: boolean;
}

const QUICK_QUESTIONS = [
  "Live Dashboard Status",
  "Explain the motor status.",
  "What is a digital twin?",
  "What is vibration residual?",
  "What is temperature residual?",
  "Why did an alarm occur?",
  "What is the next hardware integration step?",
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onClearChat,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickQuestion = (q: string) => {
    if (disabled) return;
    onSendMessage(q);
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-800/80">
      {/* Quick Question Chips Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
        <span className="text-[10px] text-amber-400/80 font-mono flex items-center gap-0.5 shrink-0">
          <HelpCircle className="h-3 w-3" /> Quick:
        </span>
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickQuestion(q)}
            disabled={disabled}
            className="chip-question"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form with Send & Clear Buttons */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            maxLength={100}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={disabled}
            placeholder="Ask Kambar about the motor twin..."
            className="w-full bg-[#070e24] border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none pr-12 transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500">
            {inputText.length}/100
          </span>
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || disabled}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg text-xs font-semibold flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          title="Send message to Kambar AI"
        >
          <Send className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onClearChat}
          className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors"
          title="Clear chat history"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
};
