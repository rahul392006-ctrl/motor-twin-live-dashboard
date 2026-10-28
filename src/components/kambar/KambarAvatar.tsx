import React from 'react';
import avatarImg from '../../assets/kambar_avatar.jpg';
import '../../styles/kambar.css';

interface KambarAvatarProps {
  moodEmoji: string;
  moodDescription: string;
}

export const KambarAvatar: React.FC<KambarAvatarProps> = ({
  moodEmoji,
  moodDescription,
}) => {
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gradient-to-r from-[#0d1836] to-[#0a1228] border border-amber-500/20 shadow-md">
      {/* Circular Illustrated Kambar Portrait Frame */}
      <div className="relative shrink-0">
        <div className="kambar-portrait-ring">
          <img
            src={avatarImg}
            alt="Kambar AI Tamil Poet Portrait"
            className="kambar-portrait-img"
          />
        </div>
        {/* Mood indicator badge on avatar corner */}
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a1329] border border-amber-400/60 flex items-center justify-center text-xs shadow-md"
          title={moodDescription}
        >
          {moodEmoji}
        </div>
      </div>

      {/* Title & Tamil Literary Persona */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-amber-200 tracking-wide font-sans">
            KAMBAR AI
          </h2>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-600/40">
            கம்பர்
          </span>
        </div>
        <p className="text-[11px] text-teal-300/90 font-medium italic truncate">
          Tamil-inspired Digital Twin Assistant
        </p>
        <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1" title="Artistic interpretation inspired by classical Tamil poet Kambar and Tamil literary tradition">
          Artistic interpretation inspired by classical Tamil literary tradition
        </p>
      </div>
    </div>
  );
};
