import React, { useState } from 'react';
import { Avatar } from '../types/game';
import { User, Check, ArrowRight, Sparkles } from 'lucide-react';
import { sounds } from '../services/sound';

interface PlayerSetupPageProps {
  avatars: Avatar[];
  onJoin: (name: string, animalId: string, accessoryId?: string) => Promise<void>;
  isJoining: boolean;
}

const accessories = [
  { id: 'none', label: 'Default' },
  { id: 'cap', label: '🎓 Cap' },
  { id: 'glasses', label: '👓 Specs' },
  { id: 'sunglasses', label: '🕶️ Shades' },
  { id: 'crown', label: '👑 Crown' },
  { id: 'hoodie', label: '🧥 Hoodie' }
];

export const PlayerSetupPage: React.FC<PlayerSetupPageProps> = ({
  avatars,
  onJoin,
  isJoining
}) => {
  const [name, setName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('fox');
  const [selectedAccessory, setSelectedAccessory] = useState('none');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectAvatar = (id: string) => {
    setSelectedAvatarId(id);
    sounds.playPieceSelect();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();

    if (clean.length < 2) {
      setErrorMsg('Please enter at least 2 characters.');
      return;
    }
    if (clean.length > 24) {
      setErrorMsg('Name cannot exceed 24 characters.');
      return;
    }
    // Reject strings with only symbols/punctuation
    if (!/[a-zA-Z0-9\u0900-\u0D7F]/.test(clean)) {
      setErrorMsg('Please enter a valid name.');
      return;
    }

    setErrorMsg('');
    sounds.playPieceSwap();
    await onJoin(clean, selectedAvatarId, selectedAccessory);
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 animate-fade-in pb-20">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight uppercase">
          Player Profile
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your name and pick your Engineering mascot
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Enter Your Name</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="e.g. Mathavan / Alex"
            maxLength={24}
            disabled={isJoining}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-base font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
          />
          {errorMsg && (
            <p className="text-rose-400 text-xs font-medium mt-1.5 animate-fade-in">
              {errorMsg}
            </p>
          )}
        </div>

        {/* 16 Animal Avatar Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Choose Mascot Avatar</span>
            </span>
            <span className="text-[11px] text-cyan-400 font-semibold lowercase">
              16 avatars available
            </span>
          </label>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 max-h-[300px] overflow-y-auto">
            {avatars.map((av) => {
              const isSelected = selectedAvatarId === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => handleSelectAvatar(av.id)}
                  className={`relative flex flex-col items-center p-2 rounded-xl transition-all btn-press ${
                    isSelected
                      ? 'bg-cyan-500/20 ring-2 ring-cyan-400 scale-[1.04] shadow-glow-cyan'
                      : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden mb-1.5 relative">
                    <img
                      src={av.image_url}
                      alt={av.name}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-cyan-400 text-slate-950 rounded-full p-0.5 shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold truncate max-w-full ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {av.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Accessory Style */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Mascot Accessory (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {accessories.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedAccessory(acc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all btn-press ${
                  selectedAccessory === acc.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Join Game Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isJoining || name.trim().length < 2}
            className={`w-full py-4 rounded-2xl font-bold text-base shadow-glow-cyan flex items-center justify-center space-x-2 transition-all btn-press ${
              isJoining || name.trim().length < 2
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
            }`}
          >
            {isJoining ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <span>Connecting to Lobby...</span>
              </span>
            ) : (
              <>
                <span>JOIN GAME</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
