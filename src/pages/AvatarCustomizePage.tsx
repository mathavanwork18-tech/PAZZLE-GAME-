import React, { useState } from 'react';
import { HatId, GlassesId, OutfitId } from '../types/game';
import { ArrowRight, Check, Sparkles, HardHat, Glasses, Shirt, SlidersHorizontal, Ban } from 'lucide-react';
import { AvatarRenderer } from '../components/AvatarRenderer';
import { sounds } from '../services/sound';

interface AvatarCustomizePageProps {
  animalId: string;
  username: string;
  selectedHat: HatId;
  selectedGlasses: GlassesId;
  selectedOutfit: OutfitId;
  onSelectHat: (id: HatId) => void;
  onSelectGlasses: (id: GlassesId) => void;
  onSelectOutfit: (id: OutfitId) => void;
  onConfirm: () => void;
  onBack: () => void;
  isJoining: boolean;
}

const hatsList: { id: HatId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'classic_cap', name: 'Classic Cap' },
  { id: 'grad_cap', name: 'Graduation Cap' },
  { id: 'eng_helmet', name: 'Engineer Helmet' },
  { id: 'detective_hat', name: 'Detective Hat' },
  { id: 'crown', name: 'Crown' },
  { id: 'party_hat', name: 'Party Hat' },
  { id: 'beanie', name: 'Beanie' },
  { id: 'top_hat', name: 'Top Hat' }
];

const glassesList: { id: GlassesId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'round_glasses', name: 'Round Glasses' },
  { id: 'square_glasses', name: 'Square Glasses' },
  { id: 'sunglasses', name: 'Sunglasses' },
  { id: 'safety_glasses', name: 'Safety Glasses' },
  { id: 'nerd_glasses', name: 'Nerd Glasses' }
];

const outfitsList: { id: OutfitId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'eng_coat', name: 'Engineer Coat' },
  { id: 'college_hoodie', name: 'College Hoodie' },
  { id: 'formal_shirt', name: 'Formal Shirt' },
  { id: 'lab_coat', name: 'Lab Coat' },
  { id: 'casual_jacket', name: 'Casual Jacket' },
  { id: 'safety_vest', name: 'Safety Vest' },
  { id: 'grad_outfit', name: 'Graduation Outfit' }
];

export const AvatarCustomizePage: React.FC<AvatarCustomizePageProps> = ({
  animalId,
  username,
  selectedHat,
  selectedGlasses,
  selectedOutfit,
  onSelectHat,
  onSelectGlasses,
  onSelectOutfit,
  onConfirm,
  onBack,
  isJoining
}) => {
  const [activeTab, setActiveTab] = useState<'hat' | 'glasses' | 'outfit'>('hat');

  const handleHatChange = (id: HatId) => {
    onSelectHat(id);
    sounds.playPieceSelect();
  };

  const handleGlassesChange = (id: GlassesId) => {
    onSelectGlasses(id);
    sounds.playPieceSelect();
  };

  const handleOutfitChange = (id: OutfitId) => {
    onSelectOutfit(id);
    sounds.playPieceSelect();
  };

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
          <span className="text-slate-900 font-bold">Customize</span>
        </div>

        {/* Live Interactive Preview Card */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm text-center mb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Live Mascot Preview
          </div>

          <div className="flex justify-center mb-2">
            <AvatarRenderer
              animalId={animalId}
              hatId={selectedHat}
              glassesId={selectedGlasses}
              outfitId={selectedOutfit}
              size="2xl"
              className="border-2 border-blue-200/60 shadow-md"
            />
          </div>

          <div className="text-sm font-black text-slate-800">{username}</div>
          <div className="text-[11px] text-slate-500 capitalize">
            {animalId} Mascot •{' '}
            {selectedHat !== 'none' || selectedGlasses !== 'none' || selectedOutfit !== 'none'
              ? 'Customized'
              : 'Default'}
          </div>
        </div>

        {/* Customization Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1 mb-3 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('hat')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'hat'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Hat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('glasses')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'glasses'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Glasses className="w-3.5 h-3.5" />
            <span>Glasses</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outfit')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'outfit'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Outfit</span>
          </button>
        </div>

        {/* Options Selection Grid */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm max-h-[190px] overflow-y-auto">
          {activeTab === 'hat' && (
            <div className="grid grid-cols-2 gap-2">
              {hatsList.map((hat) => {
                const isSelected = selectedHat === hat.id;
                return (
                  <button
                    key={hat.id}
                    type="button"
                    onClick={() => handleHatChange(hat.id)}
                    className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all btn-press ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-800'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{hat.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'glasses' && (
            <div className="grid grid-cols-2 gap-2">
              {glassesList.map((gl) => {
                const isSelected = selectedGlasses === gl.id;
                return (
                  <button
                    key={gl.id}
                    type="button"
                    onClick={() => handleGlassesChange(gl.id)}
                    className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all btn-press ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-800'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{gl.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'outfit' && (
            <div className="grid grid-cols-2 gap-2">
              {outfitsList.map((out) => {
                const isSelected = selectedOutfit === out.id;
                return (
                  <button
                    key={out.id}
                    type="button"
                    onClick={() => handleOutfitChange(out.id)}
                    className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all btn-press ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-800'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{out.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
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
          Back to Animal Mascot Selection
        </button>
      </div>
    </div>
  );
};
