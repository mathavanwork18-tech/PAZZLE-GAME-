import React from 'react';
import { HatId, GlassesId, OutfitId } from '../types/game';
import { ArrowRight, Check, Sparkles, HardHat, Ban } from 'lucide-react';
import { AvatarRenderer } from '../components/AvatarRenderer';
import { renderHat } from '../components/AvatarComposer';
import { sounds } from '../services/sound';

interface AvatarCustomizePageProps {
  animalId: string;
  username: string;
  selectedHat: HatId;
  selectedGlasses?: GlassesId;
  selectedOutfit?: OutfitId;
  onSelectHat: (id: HatId) => void;
  onSelectGlasses?: (id: GlassesId) => void;
  onSelectOutfit?: (id: OutfitId) => void;
  onConfirm: () => void;
  onBack: () => void;
  isJoining: boolean;
}

const hatsList: { id: HatId; name: string; tag: string }[] = [
  { id: 'none', name: 'No Hat', tag: 'Natural look' },
  { id: 'eng_helmet', name: 'Engineer Helmet', tag: 'Safety First' },
  { id: 'grad_cap', name: 'Graduation Cap', tag: 'Academic' },
  { id: 'classic_cap', name: 'Classic Cap', tag: 'Sporty' },
  { id: 'crown', name: 'Royal Crown', tag: 'Champion' },
  { id: 'detective_hat', name: 'Detective Hat', tag: 'Mystery' },
  { id: 'beanie', name: 'Teal Beanie', tag: 'Cozy' },
  { id: 'party_hat', name: 'Party Cone', tag: 'Celebration' },
  { id: 'top_hat', name: 'Top Hat', tag: 'Dapper' }
];

export const AvatarCustomizePage: React.FC<AvatarCustomizePageProps> = ({
  animalId,
  username,
  selectedHat,
  onSelectHat,
  onConfirm,
  onBack,
  isJoining
}) => {
  const handleHatChange = (id: HatId) => {
    onSelectHat(id);
    sounds.playPieceSelect();
  };

  const selectedHatObj = hatsList.find((h) => h.id === selectedHat) || hatsList[0];

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-64px)] p-4 sm:p-6 max-w-md mx-auto animate-fade-in">
      <div className="w-full pt-2 sm:pt-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-500 mb-3">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
          <span className="text-slate-600">{username}</span>
          <span className="text-slate-300">•</span>
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
          <span className="text-slate-600 capitalize">{animalId}</span>
          <span className="text-slate-300">•</span>
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
          <span className="text-slate-900 font-bold">Hat Style</span>
        </div>

        {/* Live Interactive Mascot Preview Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm text-center mb-4 relative overflow-hidden">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Mascot Face & Hat Preview</span>
          </div>

          <div className="flex justify-center my-3">
            <div className="p-2.5 rounded-full bg-slate-50 border border-slate-200 shadow-inner">
              <AvatarRenderer
                animalId={animalId}
                hatId={selectedHat}
                size="2xl"
                className="transition-transform duration-200 hover:scale-105"
              />
            </div>
          </div>

          <div className="text-base font-black text-slate-900">{username}</div>
          <div className="text-xs text-slate-500 capitalize mt-0.5">
            {animalId} Mascot •{' '}
            <span className="text-blue-600 font-semibold">{selectedHatObj.name}</span>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <HardHat className="w-3.5 h-3.5 text-blue-600" />
            <span>Choose Mascot Hat</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Tap to equip
          </span>
        </div>

        {/* 9 Hat Selection Cards Grid */}
        <div className="grid grid-cols-3 gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm max-h-[260px] overflow-y-auto">
          {hatsList.map((hat) => {
            const isSelected = selectedHat === hat.id;
            return (
              <button
                key={hat.id}
                type="button"
                onClick={() => handleHatChange(hat.id)}
                className={`relative flex flex-col items-center p-2.5 rounded-xl border transition-all btn-press text-center ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 scale-[1.03] shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {/* Hat Vector Icon Preview */}
                <div className="w-10 h-10 flex items-center justify-center mb-1">
                  {hat.id === 'none' ? (
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                      <Ban className="w-4 h-4 text-slate-500" />
                    </div>
                  ) : (
                    <svg viewBox="-95 -70 190 95" className="w-8 h-8 drop-shadow-sm overflow-visible">
                      {renderHat(hat.id)}
                    </svg>
                  )}
                </div>

                <span
                  className={`text-[11px] font-bold line-clamp-1 ${
                    isSelected ? 'text-blue-700' : 'text-slate-800'
                  }`}
                >
                  {hat.name}
                </span>

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation CTA */}
      <div className="w-full pb-6 pt-4 space-y-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isJoining}
          className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm flex items-center justify-center space-x-2 transition-all btn-press"
        >
          <span>{isJoining ? 'JOINING LOBBY...' : 'ENTER MAIN LOBBY'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isJoining}
          className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Back to Mascot Selection
        </button>
      </div>
    </div>
  );
};

export default AvatarCustomizePage;
