import React, { useState } from 'react';
import { HatId, GlassesId, OutfitId } from '../types/game';

export interface AvatarComposerProps {
  animal: string;
  hat?: HatId | string;
  glasses?: GlassesId | string;
  outfit?: OutfitId | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  showBadge?: boolean;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-28 h-28',
  '2xl': 'w-36 h-36',
  full: 'w-full h-full'
};

const ANIMAL_COLORS: Record<string, string> = {
  fox: '#F97316',
  panda: '#10B981',
  tiger: '#EAB308',
  lion: '#EF4444',
  koala: '#A855F7',
  penguin: '#38BDF8',
  rabbit: '#EC4899',
  bear: '#3B82F6',
  monkey: '#84CC16',
  frog: '#14B8A6',
  raccoon: '#8B5CF6',
  elephant: '#60A5FA',
  giraffe: '#06B6D4',
  zebra: '#9333EA',
  cat: '#F43F5E',
  dog: '#2563EB'
};

// 8 HIGH-DEFINITION VECTOR HATS
export function renderHat(hatId: string) {
  switch (hatId) {
    case 'classic_cap':
      return (
        <g id="hat-classic-cap">
          {/* Navy Baseball Cap Dome */}
          <path d="M -56 8 C -56 -42 56 -42 56 8 Z" fill="#1E3A8A" stroke="#0F172A" strokeWidth="3.5" />
          {/* Cap Visor */}
          <path d="M -72 8 Q 0 -6 72 8 Q 88 15 68 22 Q 0 6 -68 22 Q -88 15 -72 8 Z" fill="#2563EB" stroke="#0F172A" strokeWidth="2.5" />
          {/* Top Gold Button */}
          <circle cx="0" cy="-38" r="6" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        </g>
      );

    case 'grad_cap':
      return (
        <g id="hat-grad-cap">
          {/* Mortarboard Diamond */}
          <polygon points="0,-48 95,-22 0,4 -95,-22" fill="#0F172A" stroke="#334155" strokeWidth="3" />
          {/* Skull Cap */}
          <path d="M -48 -12 L -48 10 C -48 24 48 24 48 10 L 48 -12 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="2.5" />
          {/* Gold Tassel */}
          <path d="M 0 -22 Q 45 -18 65 6 L 70 32" fill="none" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="-22" r="5" fill="#F59E0B" />
          <rect x="64" y="30" width="12" height="16" rx="2" fill="#F59E0B" />
        </g>
      );

    case 'eng_helmet':
      return (
        <g id="hat-eng-helmet">
          {/* Construction Hard Hat Dome */}
          <path d="M -66 10 C -66 -48 66 -48 66 10 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="3.5" />
          {/* Structural Center Ridge */}
          <path d="M -12 -44 C -12 -48 12 -48 12 -44 L 10 6 L -10 6 Z" fill="#FBBF24" />
          {/* Helmet Brim */}
          <path d="M -82 10 Q 0 2 82 10 Q 90 18 82 22 Q 0 12 -82 22 Q -90 18 -82 10 Z" fill="#D97706" stroke="#92400E" strokeWidth="2.5" />
          {/* Highlight Glare */}
          <path d="M -42 -20 Q -22 -30 -4 -26" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="4" strokeLinecap="round" />
        </g>
      );

    case 'detective_hat':
      return (
        <g id="hat-detective">
          {/* Fedora Crown with Indent */}
          <path d="M -50 -4 C -50 -38 -20 -34 0 -28 C 20 -34 50 -38 50 -4 Z" fill="#475569" stroke="#1E293B" strokeWidth="3" />
          {/* Brim */}
          <ellipse cx="0" cy="-2" rx="78" ry="16" fill="#334155" stroke="#0F172A" strokeWidth="3" />
          {/* Teal Hat Ribbon */}
          <path d="M -50 -12 Q 0 -8 50 -12 L 50 -2 Q 0 2 -50 -2 Z" fill="#0D9488" />
        </g>
      );

    case 'crown':
      return (
        <g id="hat-crown">
          {/* Royal Gold Crown */}
          <path d="M -55 10 L -62 -26 L -30 -10 L 0 -36 L 30 -10 L 62 -26 L 55 10 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />
          <rect x="-56" y="4" width="112" height="10" rx="3" fill="#D97706" />
          {/* Jewels */}
          <circle cx="0" cy="-36" r="6" fill="#EF4444" stroke="#991B1B" strokeWidth="1.5" />
          <circle cx="-62" cy="-26" r="5" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <circle cx="62" cy="-26" r="5" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
          <circle cx="-30" cy="-10" r="4.5" fill="#EC4899" />
          <circle cx="30" cy="-10" r="4.5" fill="#8B5CF6" />
        </g>
      );

    case 'party_hat':
      return (
        <g id="hat-party">
          {/* Party Cone with Colorful Stripes */}
          <polygon points="0,-68 -42,10 42,10" fill="#EC4899" stroke="#BE185D" strokeWidth="3" />
          <polygon points="0,-68 -28,-14 28,-14" fill="#8B5CF6" />
          <polygon points="0,-68 -16,-38 16,-38" fill="#06B6D4" />
          {/* Fluffy Gold Pom-pom */}
          <circle cx="0" cy="-68" r="8" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
        </g>
      );

    case 'beanie':
      return (
        <g id="hat-beanie">
          {/* Knitted Teal Beanie */}
          <path d="M -55 6 C -55 -42 55 -42 55 6 Z" fill="#0D9488" stroke="#042F2E" strokeWidth="3" />
          {/* Folded Brim */}
          <rect x="-62" y="0" width="124" height="16" rx="5" fill="#14B8A6" stroke="#0F766E" strokeWidth="2.5" />
          {/* Top Fluffy Pom-pom */}
          <circle cx="0" cy="-44" r="9" fill="#CCFBF1" stroke="#0D9488" strokeWidth="2" />
        </g>
      );

    case 'top_hat':
      return (
        <g id="hat-top-hat">
          {/* Victorian Top Hat Crown */}
          <rect x="-40" y="-55" width="80" height="60" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="3" />
          {/* Hat Brim */}
          <ellipse cx="0" cy="6" rx="72" ry="14" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />
          {/* Bright Cyan Ribbon */}
          <rect x="-40" y="-12" width="80" height="12" fill="#0284C7" />
        </g>
      );

    default:
      return null;
  }
}

export const AvatarComposer: React.FC<AvatarComposerProps> = ({
  animal,
  hat = 'none',
  size = 'md',
  className = '',
  showBadge = false
}) => {
  const safeAnimal = (animal || 'fox').toLowerCase();
  const hasHat = hat && hat !== 'none';
  const [imgError, setImgError] = useState(false);
  const accentColor = ANIMAL_COLORS[safeAnimal] || '#3B82F6';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 overflow-visible ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
    >
      {/* 1. ANIMAL FACE CIRCULAR MASCOT */}
      <div className="w-full h-full rounded-full overflow-hidden shadow-sm border border-slate-200/80 bg-white flex items-center justify-center shrink-0">
        {!imgError ? (
          <img
            src={`/avatars/${safeAnimal}.png`}
            alt={safeAnimal}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-200 hover:scale-105"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-black text-sm uppercase rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            {safeAnimal.substring(0, 2)}
          </div>
        )}
      </div>

      {/* 2. OVERLAY HAT (Crowned precisely on the head) */}
      {hasHat && (
        <div
          className="absolute -top-[24%] left-1/2 -translate-x-1/2 w-[76%] h-[58%] pointer-events-none z-10 flex items-end justify-center filter drop-shadow-md overflow-visible"
        >
          <svg
            viewBox="-100 -75 200 95"
            className="w-full h-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            {renderHat(hat)}
          </svg>
        </div>
      )}

      {/* Optional Customized Badge */}
      {showBadge && hasHat && (
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white z-20" />
      )}
    </div>
  );
};

export default AvatarComposer;
