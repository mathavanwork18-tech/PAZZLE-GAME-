import React from 'react';
import { HatId, GlassesId, OutfitId } from '../types/game';

interface AvatarRendererProps {
  animalId: string;
  hatId?: HatId | string;
  glassesId?: GlassesId | string;
  outfitId?: OutfitId | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
}

const sizeMap = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-28 h-28',
  '2xl': 'w-36 h-36'
};

// SVG Vector Overlays for Hats
const HatOverlay: React.FC<{ hatId: string }> = ({ hatId }) => {
  switch (hatId) {
    case 'classic_cap':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Classic Baseball Cap: navy with engineering blue visor */}
          <path d="M 28 32 C 28 15 72 15 72 32 Z" fill="#1E3A8A" stroke="#0F172A" strokeWidth="2" />
          <path d="M 22 32 Q 50 26 78 32 Q 88 34 76 38 Q 48 30 20 35 Z" fill="#2563EB" stroke="#0F172A" strokeWidth="1.5" />
          <circle cx="50" cy="18" r="2.5" fill="#F59E0B" />
        </svg>
      );

    case 'grad_cap':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Graduation Cap: black mortarboard with gold tassel */}
          <polygon points="50,10 86,22 50,32 14,22" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
          <path d="M 32 26 L 32 36 C 32 44 68 44 68 36 L 68 26 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
          {/* Gold tassel */}
          <path d="M 50 22 Q 68 24 74 34 L 76 46" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="21" r="2" fill="#F59E0B" />
          <rect x="73" y="44" width="5" height="7" rx="1" fill="#F59E0B" />
        </svg>
      );

    case 'eng_helmet':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Engineering Hard Hat: vibrant construction yellow/orange with ridge */}
          <path d="M 24 33 C 24 12 76 12 76 33 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          {/* Center structural ridge */}
          <path d="M 46 14 C 46 12 54 12 54 14 L 53 32 L 47 32 Z" fill="#FBBF24" />
          {/* Helmet Brim */}
          <path d="M 18 33 Q 50 30 82 33 Q 86 36 82 38 Q 50 34 18 38 Q 14 36 18 33 Z" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
          {/* Subtle reflection */}
          <path d="M 30 20 Q 42 16 46 18" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'detective_hat':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Detective Fedora: classic charcoal with ribbon band */}
          <path d="M 30 28 C 30 16 42 14 50 16 C 58 14 70 16 70 28 Z" fill="#475569" stroke="#1E293B" strokeWidth="1.5" />
          {/* Fedora Brim */}
          <ellipse cx="50" cy="29" rx="32" ry="7" fill="#334155" stroke="#0F172A" strokeWidth="1.5" />
          {/* Hat Ribbon */}
          <path d="M 31 25 Q 50 27 69 25 L 69 29 Q 50 31 31 29 Z" fill="#0D9488" />
        </svg>
      );

    case 'crown':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Royal Engineering Crown: gold with gems */}
          <path d="M 28 32 L 25 18 L 37 25 L 50 14 L 63 25 L 75 18 L 72 32 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
          <rect x="27" y="30" width="46" height="4" rx="1" fill="#D97706" />
          <circle cx="50" cy="14" r="2.5" fill="#EF4444" />
          <circle cx="25" cy="18" r="2" fill="#3B82F6" />
          <circle cx="75" cy="18" r="2" fill="#10B981" />
        </svg>
      );

    case 'party_hat':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Party Cone Hat: playful engineering stripes */}
          <polygon points="50,6 32,32 68,32" fill="#EC4899" stroke="#BE185D" strokeWidth="1.5" />
          <polygon points="50,6 40,24 60,24" fill="#8B5CF6" />
          <polygon points="50,6 44,14 56,14" fill="#06B6D4" />
          <circle cx="50" cy="6" r="3" fill="#FBBF24" />
        </svg>
      );

    case 'beanie':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Warm Knit Beanie: engineering teal */}
          <path d="M 28 32 C 28 14 72 14 72 32 Z" fill="#0D9488" stroke="#042F2E" strokeWidth="1.5" />
          <rect x="25" y="29" width="50" height="6" rx="2" fill="#14B8A6" stroke="#0F766E" strokeWidth="1" />
          <circle cx="50" cy="13" r="3.5" fill="#CCFBF1" stroke="#0D9488" strokeWidth="1" />
        </svg>
      );

    case 'top_hat':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Victorian Top Hat: dark navy/black with teal band */}
          <rect x="34" y="10" width="32" height="24" rx="2" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
          <ellipse cx="50" cy="33" rx="28" ry="6" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
          <rect x="34" y="28" width="32" height="5" fill="#0284C7" />
        </svg>
      );

    default:
      return null;
  }
};

// SVG Vector Overlays for Glasses
const GlassesOverlay: React.FC<{ glassesId: string }> = ({ glassesId }) => {
  switch (glassesId) {
    case 'round_glasses':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-25">
          {/* Classic Round Scholar Frames */}
          <circle cx="36" cy="46" r="9" fill="rgba(255,255,255,0.25)" stroke="#1E293B" strokeWidth="2" />
          <circle cx="64" cy="46" r="9" fill="rgba(255,255,255,0.25)" stroke="#1E293B" strokeWidth="2" />
          <path d="M 45 46 Q 50 43 55 46" fill="none" stroke="#1E293B" strokeWidth="2" />
          <path d="M 27 45 L 20 44" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 73 45 L 80 44" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'square_glasses':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-25">
          {/* Modern Square Architect Frames */}
          <rect x="27" y="38" width="18" height="15" rx="3" fill="rgba(255,255,255,0.2)" stroke="#0F172A" strokeWidth="2" />
          <rect x="55" y="38" width="18" height="15" rx="3" fill="rgba(255,255,255,0.2)" stroke="#0F172A" strokeWidth="2" />
          <path d="M 45 44 L 55 44" stroke="#0F172A" strokeWidth="2" />
          <path d="M 27 43 L 20 42" stroke="#0F172A" strokeWidth="1.5" />
          <path d="M 73 43 L 80 42" stroke="#0F172A" strokeWidth="1.5" />
        </svg>
      );

    case 'sunglasses':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-25">
          {/* Cool Engineering Wayfarer Sunglasses */}
          <path d="M 26 39 L 46 39 C 46 49 39 52 28 50 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
          <path d="M 54 39 L 74 39 C 72 50 61 52 54 49 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
          <rect x="45" y="39" width="10" height="3" fill="#0F172A" />
          {/* Subtle reflection streak */}
          <path d="M 30 41 L 34 47" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 58 41 L 62 47" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'safety_glasses':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-25">
          {/* Engineering Lab Safety Goggles: transparent cyan shield */}
          <rect x="22" y="38" width="56" height="16" rx="6" fill="rgba(6,182,212,0.3)" stroke="#0891B2" strokeWidth="2" />
          <line x1="50" y1="38" x2="50" y2="54" stroke="#0891B2" strokeWidth="1.5" strokeDasharray="1 2" />
          {/* Side safety shields */}
          <path d="M 22 41 L 16 43" stroke="#0891B2" strokeWidth="2" />
          <path d="M 78 41 L 84 43" stroke="#0891B2" strokeWidth="2" />
          {/* Subtle cleanroom glare */}
          <path d="M 26 42 L 36 42" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'nerd_glasses':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-25">
          {/* Bold Thick Nerd Frames with center bridge tape */}
          <rect x="26" y="38" width="19" height="16" rx="4" fill="rgba(255,255,255,0.3)" stroke="#111827" strokeWidth="2.5" />
          <rect x="55" y="38" width="19" height="16" rx="4" fill="rgba(255,255,255,0.3)" stroke="#111827" strokeWidth="2.5" />
          <path d="M 45 44 L 55 44" stroke="#111827" strokeWidth="2.5" />
          {/* White tape on center bridge */}
          <rect x="48" y="42" width="4" height="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
        </svg>
      );

    default:
      return null;
  }
};

// SVG Vector Overlays for Dress / Outfits
const OutfitOverlay: React.FC<{ outfitId: string }> = ({ outfitId }) => {
  switch (outfitId) {
    case 'eng_coat':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-15">
          {/* Engineering Blazer / Coat: professional navy blue with collar and buttons */}
          <path d="M 24 74 L 32 62 L 44 68 L 50 63 L 56 68 L 68 62 L 76 74 C 76 96 24 96 24 74 Z" fill="#1E3A8A" stroke="#0F172A" strokeWidth="1.5" />
          {/* Lapel collar */}
          <polygon points="32,62 42,76 34,76" fill="#172554" />
          <polygon points="68,62 58,76 66,76" fill="#172554" />
          {/* Inner shirt & gold buttons */}
          <polygon points="44,68 50,63 56,68 50,78" fill="#F8FAFC" />
          <circle cx="50" cy="82" r="1.5" fill="#F59E0B" />
          <circle cx="50" cy="88" r="1.5" fill="#F59E0B" />
        </svg>
      );

    case 'college_hoodie':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-15">
          {/* College Hoodie: soft heather warm orange/terracotta */}
          <path d="M 22 74 C 22 64 34 62 50 62 C 66 62 78 64 78 74 C 78 96 22 96 22 74 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="1.5" />
          {/* Hood collar fold */}
          <path d="M 36 64 C 42 72 58 72 64 64" fill="none" stroke="#C2410C" strokeWidth="2.5" />
          {/* Drawstrings */}
          <line x1="46" y1="68" x2="45" y2="78" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="54" y1="68" x2="55" y2="78" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
          {/* College 'ENG' text badge */}
          <rect x="42" y="80" width="16" height="7" rx="1.5" fill="#9A3412" />
          <text x="50" y="85.5" fill="#FFF" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">ENG</text>
        </svg>
      );

    case 'formal_shirt':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-15">
          {/* Formal Oxford Shirt with Engineering Blue Necktie */}
          <path d="M 24 74 L 34 64 L 66 64 L 76 74 C 76 96 24 96 24 74 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
          {/* Collar tips */}
          <polygon points="34,64 48,70 42,64" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
          <polygon points="66,64 52,70 58,64" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
          {/* Blue Necktie */}
          <polygon points="48,70 52,70 54,88 50,92 46,88" fill="#2563EB" stroke="#1D4ED8" strokeWidth="0.5" />
        </svg>
      );

    case 'lab_coat':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-15">
          {/* Cleanroom Lab Coat: crisp white with pens in breast pocket */}
          <path d="M 22 72 L 32 62 L 68 62 L 78 72 C 78 96 22 96 22 72 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="50" y1="64" x2="50" y2="96" stroke="#E2E8F0" strokeWidth="1.5" />
          {/* Pocket with pens */}
          <rect x="30" y="78" width="10" height="10" rx="1" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
          <line x1="33" y1="75" x2="33" y2="78" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="37" y1="74" x2="37" y2="78" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'casual_jacket':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-15">
          {/* Casual Bomber Jacket: military/engineering olive & teal */}
          <path d="M 22 74 C 22 64 34 62 50 62 C 66 62 78 64 78 74 C 78 96 22 96 22 74 Z" fill="#334155" stroke="#1E293B" strokeWidth="1.5" />
          {/* Zipper down center */}
          <line x1="50" y1="64" x2="50" y2="96" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="1 1" />
          {/* Inner tee collar */}
          <path d="M 40 63 Q 50 68 60 63" fill="none" stroke="#0D9488" strokeWidth="2" />
        </svg>
      );

    case 'safety_vest':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-15">
          {/* Hi-Vis Engineering Safety Vest: neon orange/lime with reflective silver stripes */}
          <path d="M 24 74 L 34 63 L 66 63 L 76 74 C 76 96 24 96 24 74 Z" fill="#F97316" stroke="#EA580C" strokeWidth="1.5" />
          {/* Reflective silver vertical & horizontal bands */}
          <rect x="33" y="64" width="7" height="32" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
          <rect x="60" y="64" width="7" height="32" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
          <rect x="24" y="82" width="52" height="6" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
        </svg>
      );

    case 'grad_outfit':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-15">
          {/* Graduation Gown & Satin Stole */}
          <path d="M 22 72 L 32 62 L 68 62 L 78 72 C 78 96 22 96 22 72 Z" fill="#0F172A" stroke="#020617" strokeWidth="1.5" />
          {/* Gold engineering honor stole */}
          <path d="M 36 63 L 42 94 L 48 94 L 46 68 L 50 64 L 54 68 L 52 94 L 58 94 L 64 63 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5" />
        </svg>
      );

    default:
      return null;
  }
};

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  animalId,
  hatId = 'none',
  glassesId = 'none',
  outfitId = 'none',
  size = 'md',
  className = '',
  showBadge = false
}) => {
  const safeAnimalId = animalId ? animalId.toLowerCase() : 'fox';
  const animalSrc = `/avatars/${safeAnimalId}.png`;

  return (
    <div
      className={`relative rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center overflow-hidden shrink-0 transition-transform ${
        sizeMap[size]
      } ${className}`}
    >
      {/* 1. Base Cartoon Animal Mascot */}
      <img
        src={animalSrc}
        alt={safeAnimalId}
        onError={(e) => {
          // Fallback if image fails to load
          (e.target as HTMLImageElement).src = '/avatars/fox.png';
        }}
        className="w-full h-full object-cover select-none pointer-events-none"
      />

      {/* 2. Transparent Outfit Layer (Positioned on body) */}
      {outfitId && outfitId !== 'none' && <OutfitOverlay outfitId={outfitId} />}

      {/* 3. Transparent Glasses Layer (Positioned on eyes) */}
      {glassesId && glassesId !== 'none' && <GlassesOverlay glassesId={glassesId} />}

      {/* 4. Transparent Hat Layer (Positioned on head top) */}
      {hatId && hatId !== 'none' && <HatOverlay hatId={hatId} />}

      {/* Optional Customized Badge Indicator */}
      {showBadge && (hatId !== 'none' || glassesId !== 'none' || outfitId !== 'none') && (
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" />
      )}
    </div>
  );
};
