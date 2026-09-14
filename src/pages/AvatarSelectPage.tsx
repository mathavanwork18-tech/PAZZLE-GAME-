import React from 'react';
import { Avatar } from '../types/game';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { AvatarRenderer } from '../components/AvatarRenderer';
import { sounds } from '../services/sound';

interface AvatarSelectPageProps {
  avatars: Avatar[];
  selectedAvatarId: string;
  onSelectAvatar: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
  username: string;
}

export const AvatarSelectPage: React.FC<AvatarSelectPageProps> = ({
  avatars,
  selectedAvatarId,
  onSelectAvatar,
  onContinue,
  onBack,
  username
}) => {
  const handleSelect = (id: string) => {
    onSelectAvatar(id);
    sounds.playPieceSelect();
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-64px)] p-4 sm:p-6 max-w-md mx-auto animate-fade-in">
      <div className="w-full pt-4 sm:pt-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-500 mb-4">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">✓</span>
          <span className="text-slate-600">{username}</span>
          <span className="text-slate-300">•</span>
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
          <span className="text-slate-900 font-bold">Mascot</span>
          <span className="text-slate-300">•</span>
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[11px]">3</span>
          <span>Customize</span>
        </div>

        <div className="text-center mb-5">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Choose your animal avatar
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pick your Engineering Day mascot. You can customize clothes and accessories next.
          </p>
        </div>

        {/* 12 Mascot Cards Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-sm max-h-[360px] overflow-y-auto">
          {avatars.map((av) => {
            const isSelected = selectedAvatarId === av.id;
            return (
              <button
                key={av.id}
                type="button"
                onClick={() => handleSelect(av.id)}
                className={`relative flex flex-col items-center p-2.5 rounded-2xl transition-all btn-press ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-600 scale-[1.04] shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {/* Mascot Icon */}
                <AvatarRenderer
                  animalId={av.id}
                  size="md"
                  className="shadow-none border-0 bg-transparent"
                />

                <span
                  className={`text-xs font-bold mt-1.5 capitalize ${
                    isSelected ? 'text-blue-700' : 'text-slate-700'
                  }`}
                >
                  {av.name}
                </span>

                {/* Selected Check Badge */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="w-full pb-6 pt-4 space-y-2">
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm flex items-center justify-center space-x-2 transition-all btn-press"
        >
          <span>CUSTOMIZE AVATAR</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Back to Username
        </button>
      </div>
    </div>
  );
};
