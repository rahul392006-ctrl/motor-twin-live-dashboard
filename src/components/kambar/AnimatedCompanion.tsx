import React from 'react';
import '../../styles/kambar.css';

export type CompanionState = 'IDLE' | 'BOUNCE' | 'THINKING' | 'RESPONDING' | 'ERROR';

interface AnimatedCompanionProps {
  state: CompanionState;
  onClick?: () => void;
}

export const AnimatedCompanion: React.FC<AnimatedCompanionProps> = ({ state, onClick }) => {
  // Determine CSS class based on state
  const stateClass = (() => {
    switch (state) {
      case 'BOUNCE':
        return 'companion-bounce';
      case 'THINKING':
        return 'companion-thinking';
      case 'RESPONDING':
        return 'companion-responding';
      case 'ERROR':
        return 'companion-error';
      case 'IDLE':
      default:
        return 'companion-idle';
    }
  })();

  // Character iconography & expression
  const expression = (() => {
    switch (state) {
      case 'BOUNCE':
        return '📜✨';
      case 'THINKING':
        return '🤔🪶';
      case 'RESPONDING':
        return '📖🌟';
      case 'ERROR':
        return '🧐⚠️';
      case 'IDLE':
      default:
        return '📜';
    }
  })();

  return (
    <div
      onClick={onClick}
      className={`companion-wrapper cursor-pointer ${stateClass}`}
      title={`Companion state: ${state} (Click to interact)`}
      aria-label={`Animated Tamil Companion - ${state}`}
    >
      <div className="relative flex items-center justify-center w-full h-full text-xl filter drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]">
        {expression}
        {/* Subtle decorative aura ring */}
        <span className="absolute inset-0 rounded-full border border-amber-400/30 scale-110 pointer-events-none" />
      </div>
    </div>
  );
};
