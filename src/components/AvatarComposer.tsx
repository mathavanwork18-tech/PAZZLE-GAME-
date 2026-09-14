import React from 'react';
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

// ANIMAL-SPECIFIC ANCHOR CONFIGURATION MATRIX
interface AnimalConfig {
  name: string;
  hatAnchor: { x: number; y: number; scale: number; rotation: number };
  glassesAnchor: { x: number; y: number; scale: number; rotation: number };
  outfitAnchor: { x: number; y: number; scale: number; rotation: number };
}

const ANIMAL_CONFIGS: Record<string, AnimalConfig> = {
  panda: {
    name: 'Panda',
    hatAnchor: { x: 256, y: 118, scale: 1.0, rotation: 0 },
    glassesAnchor: { x: 256, y: 202, scale: 1.05, rotation: 0 },
    outfitAnchor: { x: 256, y: 350, scale: 1.05, rotation: 0 }
  },
  lion: {
    name: 'Lion',
    hatAnchor: { x: 256, y: 122, scale: 1.08, rotation: 0 },
    glassesAnchor: { x: 256, y: 210, scale: 1.0, rotation: 0 },
    outfitAnchor: { x: 256, y: 355, scale: 1.1, rotation: 0 }
  },
  tiger: {
    name: 'Tiger',
    hatAnchor: { x: 256, y: 116, scale: 0.98, rotation: 0 },
    glassesAnchor: { x: 256, y: 205, scale: 1.0, rotation: 0 },
    outfitAnchor: { x: 256, y: 350, scale: 1.05, rotation: 0 }
  },
  fox: {
    name: 'Fox',
    hatAnchor: { x: 256, y: 120, scale: 0.88, rotation: 0 },
    glassesAnchor: { x: 256, y: 200, scale: 0.95, rotation: 0 },
    outfitAnchor: { x: 256, y: 345, scale: 0.95, rotation: 0 }
  },
  rabbit: {
    name: 'Rabbit',
    hatAnchor: { x: 256, y: 140, scale: 0.85, rotation: 0 },
    glassesAnchor: { x: 256, y: 218, scale: 0.95, rotation: 0 },
    outfitAnchor: { x: 256, y: 355, scale: 0.95, rotation: 0 }
  },
  bear: {
    name: 'Bear',
    hatAnchor: { x: 256, y: 118, scale: 1.02, rotation: 0 },
    glassesAnchor: { x: 256, y: 202, scale: 1.05, rotation: 0 },
    outfitAnchor: { x: 256, y: 355, scale: 1.15, rotation: 0 }
  },
  cat: {
    name: 'Cat',
    hatAnchor: { x: 256, y: 124, scale: 0.9, rotation: 0 },
    glassesAnchor: { x: 256, y: 206, scale: 0.95, rotation: 0 },
    outfitAnchor: { x: 256, y: 348, scale: 0.95, rotation: 0 }
  },
  dog: {
    name: 'Dog',
    hatAnchor: { x: 256, y: 110, scale: 0.96, rotation: 0 },
    glassesAnchor: { x: 256, y: 202, scale: 1.0, rotation: 0 },
    outfitAnchor: { x: 256, y: 350, scale: 1.05, rotation: 0 }
  },
  penguin: {
    name: 'Penguin',
    hatAnchor: { x: 256, y: 100, scale: 0.9, rotation: 0 },
    glassesAnchor: { x: 256, y: 188, scale: 0.95, rotation: 0 },
    outfitAnchor: { x: 256, y: 330, scale: 1.0, rotation: 0 }
  },
  koala: {
    name: 'Koala',
    hatAnchor: { x: 256, y: 114, scale: 0.92, rotation: 0 },
    glassesAnchor: { x: 256, y: 198, scale: 1.0, rotation: 0 },
    outfitAnchor: { x: 256, y: 350, scale: 1.05, rotation: 0 }
  },
  monkey: {
    name: 'Monkey',
    hatAnchor: { x: 256, y: 110, scale: 0.95, rotation: 0 },
    glassesAnchor: { x: 256, y: 200, scale: 1.0, rotation: 0 },
    outfitAnchor: { x: 256, y: 350, scale: 1.0, rotation: 0 }
  },
  elephant: {
    name: 'Elephant',
    hatAnchor: { x: 256, y: 100, scale: 1.0, rotation: 0 },
    glassesAnchor: { x: 256, y: 182, scale: 1.05, rotation: 0 },
    outfitAnchor: { x: 256, y: 350, scale: 1.2, rotation: 0 }
  }
};

// 1. CARTOON ANIMAL MASCOTS (BASE BODY, HEAD, FACE, EARS, ARMS, LEGS)
function renderAnimalBase(animalId: string) {
  switch (animalId) {
    case 'panda':
      return (
        <g id="animal-panda">
          {/* Back Ears */}
          <circle cx="165" cy="118" r="42" fill="#111827" />
          <circle cx="165" cy="118" r="24" fill="#374151" />
          <circle cx="347" cy="118" r="42" fill="#111827" />
          <circle cx="347" cy="118" r="24" fill="#374151" />
          {/* Body & Torso */}
          <ellipse cx="256" cy="360" rx="115" ry="105" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="3" />
          {/* Black Arms */}
          <ellipse cx="140" cy="350" rx="36" ry="68" fill="#1E293B" transform="rotate(20 140 350)" />
          <ellipse cx="372" cy="350" rx="36" ry="68" fill="#1E293B" transform="rotate(-20 372 350)" />
          {/* Black Legs/Paws */}
          <ellipse cx="180" cy="455" rx="42" ry="26" fill="#111827" />
          <ellipse cx="332" cy="455" rx="42" ry="26" fill="#111827" />
          {/* Head */}
          <ellipse cx="256" cy="205" rx="98" ry="88" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="3" />
          {/* Iconic Panda Black Eye Patches */}
          <ellipse cx="205" cy="198" rx="28" ry="34" fill="#111827" transform="rotate(-15 205 198)" />
          <ellipse cx="307" cy="198" rx="28" ry="34" fill="#111827" transform="rotate(15 307 198)" />
          {/* Eyes with sparkle */}
          <circle cx="206" cy="198" r="10" fill="#FFFFFF" />
          <circle cx="208" cy="197" r="5" fill="#000000" />
          <circle cx="306" cy="198" r="10" fill="#FFFFFF" />
          <circle cx="304" cy="197" r="5" fill="#000000" />
          {/* Snout & Nose */}
          <ellipse cx="256" cy="242" rx="16" ry="11" fill="#111827" />
          <path d="M 256 253 L 256 264" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
          <path d="M 244 263 Q 256 272 268 263" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
          {/* Cute pink cheek blushes */}
          <circle cx="168" cy="235" r="14" fill="#F472B6" opacity="0.4" />
          <circle cx="344" cy="235" r="14" fill="#F472B6" opacity="0.4" />
        </g>
      );

    case 'lion':
      return (
        <g id="animal-lion">
          {/* Majestic Full Rounded Lion Mane */}
          <circle cx="256" cy="210" r="142" fill="#D97706" />
          <circle cx="256" cy="210" r="128" fill="#B45309" />
          {/* Mane decorative tufts */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
            <circle
              key={i}
              cx={256 + 130 * Math.cos((deg * Math.PI) / 180)}
              cy={210 + 130 * Math.sin((deg * Math.PI) / 180)}
              r="24"
              fill="#F59E0B"
            />
          ))}
          {/* Body */}
          <ellipse cx="256" cy="365" rx="110" ry="100" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />
          {/* Paws */}
          <ellipse cx="145" cy="355" rx="34" ry="60" fill="#F59E0B" transform="rotate(18 145 355)" />
          <ellipse cx="367" cy="355" rx="34" ry="60" fill="#F59E0B" transform="rotate(-18 367 355)" />
          <ellipse cx="185" cy="455" rx="40" ry="24" fill="#D97706" />
          <ellipse cx="327" cy="455" rx="40" ry="24" fill="#D97706" />
          {/* Head */}
          <ellipse cx="256" cy="210" rx="90" ry="82" fill="#FDE047" stroke="#D97706" strokeWidth="3" />
          {/* Ears */}
          <circle cx="180" cy="135" r="28" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          <circle cx="180" cy="135" r="16" fill="#FDE047" />
          <circle cx="332" cy="135" r="28" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          <circle cx="332" cy="135" r="16" fill="#FDE047" />
          {/* Snout */}
          <ellipse cx="256" cy="245" rx="36" ry="26" fill="#FEF08A" />
          <polygon points="256,236 242,225 270,225" fill="#78350F" />
          <path d="M 256 236 L 256 254" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <path d="M 242 254 Q 256 264 270 254" fill="none" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          {/* Friendly Eyes */}
          <circle cx="215" cy="195" r="11" fill="#78350F" />
          <circle cx="212" cy="192" r="4" fill="#FFFFFF" />
          <circle cx="297" cy="195" r="11" fill="#78350F" />
          <circle cx="294" cy="192" r="4" fill="#FFFFFF" />
          {/* Whiskers */}
          <line x1="215" y1="242" x2="165" y2="238" stroke="#B45309" strokeWidth="2" />
          <line x1="215" y1="250" x2="168" y2="256" stroke="#B45309" strokeWidth="2" />
          <line x1="297" y1="242" x2="347" y2="238" stroke="#B45309" strokeWidth="2" />
          <line x1="297" y1="250" x2="344" y2="256" stroke="#B45309" strokeWidth="2" />
        </g>
      );

    case 'tiger':
      return (
        <g id="animal-tiger">
          {/* Ears */}
          <circle cx="178" cy="118" r="32" fill="#EA580C" stroke="#C2410C" strokeWidth="2" />
          <circle cx="178" cy="118" r="18" fill="#FED7AA" />
          <circle cx="334" cy="118" r="32" fill="#EA580C" stroke="#C2410C" strokeWidth="2" />
          <circle cx="334" cy="118" r="18" fill="#FED7AA" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="112" ry="102" fill="#F97316" stroke="#C2410C" strokeWidth="3" />
          {/* White Chest */}
          <ellipse cx="256" cy="375" rx="60" ry="75" fill="#FFF7ED" />
          {/* Arms & Paws */}
          <ellipse cx="142" cy="355" rx="34" ry="62" fill="#EA580C" transform="rotate(18 142 355)" />
          <ellipse cx="370" cy="355" rx="34" ry="62" fill="#EA580C" transform="rotate(-18 370 355)" />
          <ellipse cx="182" cy="455" rx="40" ry="24" fill="#C2410C" />
          <ellipse cx="330" cy="455" rx="40" ry="24" fill="#C2410C" />
          {/* Head */}
          <ellipse cx="256" cy="208" rx="94" ry="84" fill="#FB923C" stroke="#C2410C" strokeWidth="3" />
          {/* Tiger Stripes */}
          <polygon points="168,175 195,182 168,189" fill="#7C2D12" />
          <polygon points="164,205 190,210 164,215" fill="#7C2D12" />
          <polygon points="344,175 317,182 344,189" fill="#7C2D12" />
          <polygon points="348,205 322,210 348,215" fill="#7C2D12" />
          <polygon points="256,132 250,158 262,158" fill="#7C2D12" />
          {/* White Snout */}
          <ellipse cx="256" cy="245" rx="38" ry="26" fill="#FFFFFF" />
          <polygon points="256,236 242,225 270,225" fill="#EA580C" />
          <path d="M 256 236 L 256 254" stroke="#7C2D12" strokeWidth="3" strokeLinecap="round" />
          <path d="M 242 254 Q 256 264 270 254" fill="none" stroke="#7C2D12" strokeWidth="3" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="214" cy="196" r="11" fill="#7C2D12" />
          <circle cx="212" cy="193" r="4" fill="#FFFFFF" />
          <circle cx="298" cy="196" r="11" fill="#7C2D12" />
          <circle cx="296" cy="193" r="4" fill="#FFFFFF" />
        </g>
      );

    case 'fox':
      return (
        <g id="animal-fox">
          {/* Tall Pointed Fox Ears */}
          <polygon points="180,72 135,160 215,160" fill="#EA580C" stroke="#C2410C" strokeWidth="2" />
          <polygon points="180,85 150,150 205,150" fill="#FED7AA" />
          <polygon points="332,72 297,160 377,160" fill="#EA580C" stroke="#C2410C" strokeWidth="2" />
          <polygon points="332,85 307,150 362,150" fill="#FED7AA" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="100" ry="98" fill="#F97316" stroke="#C2410C" strokeWidth="3" />
          <path d="M 230 310 Q 256 360 282 310 L 295 410 Q 256 440 217 410 Z" fill="#FFF7ED" />
          {/* Arms & Paws */}
          <ellipse cx="146" cy="355" rx="30" ry="58" fill="#1E293B" transform="rotate(18 146 355)" />
          <ellipse cx="366" cy="355" rx="30" ry="58" fill="#1E293B" transform="rotate(-18 366 355)" />
          <ellipse cx="186" cy="455" rx="36" ry="22" fill="#111827" />
          <ellipse cx="326" cy="455" rx="36" ry="22" fill="#111827" />
          {/* Head & Cheek Fluff */}
          <ellipse cx="256" cy="205" rx="90" ry="80" fill="#EA580C" stroke="#C2410C" strokeWidth="3" />
          <path d="M 170 230 Q 210 260 256 265 Q 302 260 342 230 Q 315 285 256 285 Q 197 285 170 230 Z" fill="#FFFFFF" />
          {/* Nose Tip */}
          <circle cx="256" cy="246" r="10" fill="#111827" />
          {/* Eyes */}
          <circle cx="215" cy="192" r="9" fill="#111827" />
          <circle cx="213" cy="189" r="3.5" fill="#FFFFFF" />
          <circle cx="297" cy="192" r="9" fill="#111827" />
          <circle cx="295" cy="189" r="3.5" fill="#FFFFFF" />
        </g>
      );

    case 'rabbit':
      return (
        <g id="animal-rabbit">
          {/* Very Tall Rabbit Ears */}
          <ellipse cx="205" cy="95" rx="26" ry="78" fill="#FBCFE8" stroke="#F472B6" strokeWidth="3" />
          <ellipse cx="205" cy="95" rx="15" ry="60" fill="#F472B6" opacity="0.7" />
          <ellipse cx="307" cy="95" rx="26" ry="78" fill="#FBCFE8" stroke="#F472B6" strokeWidth="3" />
          <ellipse cx="307" cy="95" rx="15" ry="60" fill="#F472B6" opacity="0.7" />
          {/* Body */}
          <ellipse cx="256" cy="370" rx="95" ry="95" fill="#FDF2F8" stroke="#FBCFE8" strokeWidth="3" />
          {/* White Tummy */}
          <ellipse cx="256" cy="380" rx="55" ry="68" fill="#FFFFFF" />
          {/* Paws */}
          <ellipse cx="150" cy="360" rx="28" ry="54" fill="#FBCFE8" transform="rotate(16 150 360)" />
          <ellipse cx="362" cy="360" rx="28" ry="54" fill="#FBCFE8" transform="rotate(-16 362 360)" />
          <ellipse cx="185" cy="455" rx="38" ry="24" fill="#FBCFE8" />
          <ellipse cx="327" cy="455" rx="38" ry="24" fill="#FBCFE8" />
          {/* Head */}
          <ellipse cx="256" cy="225" rx="86" ry="76" fill="#FDF2F8" stroke="#FBCFE8" strokeWidth="3" />
          {/* Cute Bunny Nose & Mouth */}
          <polygon points="256,242 248,232 264,232" fill="#EC4899" />
          <path d="M 256 242 L 256 254" stroke="#DB2777" strokeWidth="2.5" />
          <path d="M 246 254 Q 256 260 266 254" fill="none" stroke="#DB2777" strokeWidth="2.5" />
          {/* Two buck teeth */}
          <rect x="251" y="254" width="4" height="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
          <rect x="257" y="254" width="4" height="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
          {/* Big Sparkly Eyes */}
          <circle cx="216" cy="210" r="11" fill="#831843" />
          <circle cx="213" cy="207" r="4.5" fill="#FFFFFF" />
          <circle cx="296" cy="210" r="11" fill="#831843" />
          <circle cx="293" cy="207" r="4.5" fill="#FFFFFF" />
          {/* Cheek blushes */}
          <circle cx="178" cy="235" r="13" fill="#F472B6" opacity="0.5" />
          <circle cx="334" cy="235" r="13" fill="#F472B6" opacity="0.5" />
        </g>
      );

    case 'bear':
      return (
        <g id="animal-bear">
          {/* Ears */}
          <circle cx="175" cy="120" r="32" fill="#92400E" stroke="#78350F" strokeWidth="2" />
          <circle cx="175" cy="120" r="18" fill="#D97706" />
          <circle cx="337" cy="120" r="32" fill="#92400E" stroke="#78350F" strokeWidth="2" />
          <circle cx="337" cy="120" r="18" fill="#D97706" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="120" ry="105" fill="#92400E" stroke="#78350F" strokeWidth="3" />
          <ellipse cx="256" cy="375" rx="70" ry="80" fill="#B45309" />
          {/* Arms */}
          <ellipse cx="135" cy="355" rx="38" ry="65" fill="#78350F" transform="rotate(18 135 355)" />
          <ellipse cx="377" cy="355" rx="38" ry="65" fill="#78350F" transform="rotate(-18 377 355)" />
          <ellipse cx="180" cy="458" rx="42" ry="26" fill="#78350F" />
          <ellipse cx="332" cy="458" rx="42" ry="26" fill="#78350F" />
          {/* Head */}
          <ellipse cx="256" cy="208" rx="96" ry="86" fill="#B45309" stroke="#78350F" strokeWidth="3" />
          {/* Snout */}
          <ellipse cx="256" cy="245" rx="42" ry="30" fill="#FBBF24" />
          <ellipse cx="256" cy="232" rx="18" ry="12" fill="#451A03" />
          <path d="M 256 244 L 256 256" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
          <path d="M 242 256 Q 256 266 270 256" fill="none" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="212" cy="195" r="10" fill="#451A03" />
          <circle cx="210" cy="192" r="4" fill="#FFFFFF" />
          <circle cx="300" cy="195" r="10" fill="#451A03" />
          <circle cx="298" cy="192" r="4" fill="#FFFFFF" />
        </g>
      );

    case 'cat':
      return (
        <g id="animal-cat">
          {/* Triangular Cat Ears */}
          <polygon points="185,95 145,160 220,160" fill="#FB7185" stroke="#E11D48" strokeWidth="2" />
          <polygon points="185,110 155,152 210,152" fill="#FFE4E6" />
          <polygon points="327,95 292,160 367,160" fill="#FB7185" stroke="#E11D48" strokeWidth="2" />
          <polygon points="327,110 302,152 357,152" fill="#FFE4E6" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="100" ry="98" fill="#FFE4E6" stroke="#FDA4AF" strokeWidth="3" />
          <ellipse cx="256" cy="375" rx="55" ry="70" fill="#FFFFFF" />
          {/* Arms & Paws */}
          <ellipse cx="146" cy="355" rx="30" ry="58" fill="#FDA4AF" transform="rotate(18 146 355)" />
          <ellipse cx="366" cy="355" rx="30" ry="58" fill="#FDA4AF" transform="rotate(-18 366 355)" />
          <ellipse cx="185" cy="455" rx="36" ry="22" fill="#FDA4AF" />
          <ellipse cx="327" cy="455" rx="36" ry="22" fill="#FDA4AF" />
          {/* Head */}
          <ellipse cx="256" cy="210" rx="90" ry="80" fill="#FFF1F2" stroke="#FDA4AF" strokeWidth="3" />
          {/* Cute Nose */}
          <polygon points="256,238 248,228 264,228" fill="#E11D48" />
          <path d="M 256 238 L 256 248" stroke="#E11D48" strokeWidth="2" />
          <path d="M 246 248 Q 256 254 266 248" fill="none" stroke="#E11D48" strokeWidth="2" />
          {/* Whiskers */}
          <line x1="210" y1="235" x2="160" y2="230" stroke="#94A3B8" strokeWidth="1.8" />
          <line x1="210" y1="243" x2="162" y2="248" stroke="#94A3B8" strokeWidth="1.8" />
          <line x1="302" y1="235" x2="352" y2="230" stroke="#94A3B8" strokeWidth="1.8" />
          <line x1="302" y1="243" x2="350" y2="248" stroke="#94A3B8" strokeWidth="1.8" />
          {/* Eyes */}
          <circle cx="214" cy="198" r="10" fill="#0F172A" />
          <circle cx="212" cy="195" r="4" fill="#FFFFFF" />
          <circle cx="298" cy="198" r="10" fill="#0F172A" />
          <circle cx="296" cy="195" r="4" fill="#FFFFFF" />
        </g>
      );

    case 'dog':
      return (
        <g id="animal-dog">
          {/* Drooping Floppy Ears */}
          <ellipse cx="150" cy="190" rx="28" ry="60" fill="#D97706" transform="rotate(15 150 190)" />
          <ellipse cx="362" cy="190" rx="28" ry="60" fill="#D97706" transform="rotate(-15 362 190)" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="108" ry="100" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />
          <ellipse cx="256" cy="375" rx="60" ry="75" fill="#FEF3C7" />
          {/* Arms & Paws */}
          <ellipse cx="144" cy="355" rx="34" ry="60" fill="#F59E0B" transform="rotate(18 144 355)" />
          <ellipse cx="368" cy="355" rx="34" ry="60" fill="#F59E0B" transform="rotate(-18 368 355)" />
          <ellipse cx="182" cy="455" rx="38" ry="24" fill="#D97706" />
          <ellipse cx="330" cy="455" rx="38" ry="24" fill="#D97706" />
          {/* Head */}
          <ellipse cx="256" cy="205" rx="92" ry="82" fill="#FDE047" stroke="#D97706" strokeWidth="3" />
          {/* Snout & Tongue */}
          <ellipse cx="256" cy="242" rx="36" ry="24" fill="#FEF3C7" />
          <ellipse cx="256" cy="230" rx="16" ry="11" fill="#451A03" />
          <path d="M 256 241 L 256 250" stroke="#451A03" strokeWidth="2.5" />
          <path d="M 245 250 Q 256 258 267 250" fill="none" stroke="#451A03" strokeWidth="2.5" />
          {/* Happy Pink Tongue */}
          <path d="M 252 253 C 252 264 260 264 260 253 Z" fill="#F43F5E" />
          {/* Eyes */}
          <circle cx="215" cy="195" r="10" fill="#451A03" />
          <circle cx="213" cy="192" r="4" fill="#FFFFFF" />
          <circle cx="297" cy="195" r="10" fill="#451A03" />
          <circle cx="295" cy="192" r="4" fill="#FFFFFF" />
        </g>
      );

    case 'penguin':
      return (
        <g id="animal-penguin">
          {/* Penguin Body (Tuxedo dark blue/black) */}
          <ellipse cx="256" cy="340" rx="105" ry="120" fill="#0F172A" stroke="#020617" strokeWidth="3" />
          {/* Big White Tummy */}
          <ellipse cx="256" cy="355" rx="70" ry="92" fill="#FFFFFF" />
          {/* Flippers */}
          <ellipse cx="140" cy="335" rx="22" ry="64" fill="#1E293B" transform="rotate(25 140 335)" />
          <ellipse cx="372" cy="335" rx="22" ry="64" fill="#1E293B" transform="rotate(-25 372 335)" />
          {/* Orange Webbed Feet */}
          <ellipse cx="205" cy="455" rx="36" ry="18" fill="#F97316" />
          <ellipse cx="307" cy="455" rx="36" ry="18" fill="#F97316" />
          {/* Round Head */}
          <ellipse cx="256" cy="190" rx="82" ry="76" fill="#0F172A" />
          {/* White Eye Mask Surroundings */}
          <ellipse cx="220" cy="182" rx="24" ry="30" fill="#FFFFFF" />
          <ellipse cx="292" cy="182" rx="24" ry="30" fill="#FFFFFF" />
          {/* Eyes */}
          <circle cx="222" cy="182" r="9" fill="#0F172A" />
          <circle cx="220" cy="180" r="3.5" fill="#FFFFFF" />
          <circle cx="290" cy="182" r="9" fill="#0F172A" />
          <circle cx="288" cy="180" r="3.5" fill="#FFFFFF" />
          {/* Yellow Beak */}
          <polygon points="256,220 238,198 274,198" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
        </g>
      );

    case 'koala':
      return (
        <g id="animal-koala">
          {/* Big Fluffy Ears with Tufts */}
          <circle cx="150" cy="145" r="46" fill="#94A3B8" stroke="#64748B" strokeWidth="3" />
          <circle cx="150" cy="145" r="28" fill="#F1F5F9" />
          <circle cx="362" cy="145" r="46" fill="#94A3B8" stroke="#64748B" strokeWidth="3" />
          <circle cx="362" cy="145" r="28" fill="#F1F5F9" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="110" ry="100" fill="#94A3B8" stroke="#64748B" strokeWidth="3" />
          <ellipse cx="256" cy="375" rx="65" ry="75" fill="#F1F5F9" />
          {/* Arms & Paws */}
          <ellipse cx="142" cy="355" rx="34" ry="60" fill="#64748B" transform="rotate(18 142 355)" />
          <ellipse cx="370" cy="355" rx="34" ry="60" fill="#64748B" transform="rotate(-18 370 355)" />
          <ellipse cx="182" cy="455" rx="38" ry="24" fill="#64748B" />
          <ellipse cx="330" cy="455" rx="38" ry="24" fill="#64748B" />
          {/* Head */}
          <ellipse cx="256" cy="205" rx="92" ry="82" fill="#CBD5E1" stroke="#64748B" strokeWidth="3" />
          {/* Big Iconic Koala Oval Black Nose */}
          <ellipse cx="256" cy="222" rx="24" ry="34" fill="#1E293B" />
          <ellipse cx="252" cy="214" rx="8" ry="12" fill="#475569" opacity="0.6" />
          {/* Mouth */}
          <path d="M 246 262 Q 256 268 266 262" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="210" cy="192" r="9" fill="#1E293B" />
          <circle cx="208" cy="189" r="3.5" fill="#FFFFFF" />
          <circle cx="302" cy="192" r="9" fill="#1E293B" />
          <circle cx="300" cy="189" r="3.5" fill="#FFFFFF" />
        </g>
      );

    case 'monkey':
      return (
        <g id="animal-monkey">
          {/* Big Round Monkey Ears */}
          <circle cx="145" cy="195" r="40" fill="#B45309" stroke="#78350F" strokeWidth="2" />
          <circle cx="145" cy="195" r="24" fill="#FDE68A" />
          <circle cx="367" cy="195" r="40" fill="#B45309" stroke="#78350F" strokeWidth="2" />
          <circle cx="367" cy="195" r="24" fill="#FDE68A" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="105" ry="98" fill="#B45309" stroke="#78350F" strokeWidth="3" />
          <ellipse cx="256" cy="375" rx="60" ry="72" fill="#FDE68A" />
          {/* Curled Tail */}
          <path d="M 350 420 Q 420 400 420 340 Q 410 310 380 325" fill="none" stroke="#78350F" strokeWidth="12" strokeLinecap="round" />
          {/* Arms & Paws */}
          <ellipse cx="144" cy="355" rx="32" ry="60" fill="#78350F" transform="rotate(18 144 355)" />
          <ellipse cx="368" cy="355" rx="32" ry="60" fill="#78350F" transform="rotate(-18 368 355)" />
          <ellipse cx="185" cy="455" rx="36" ry="22" fill="#78350F" />
          <ellipse cx="327" cy="455" rx="36" ry="22" fill="#78350F" />
          {/* Head */}
          <ellipse cx="256" cy="205" rx="90" ry="80" fill="#92400E" stroke="#78350F" strokeWidth="3" />
          {/* Tan Heart Face Mask */}
          <path d="M 215 155 C 180 155 180 220 220 235 C 235 240 256 248 256 248 C 256 248 277 240 292 235 C 332 220 332 155 297 155 C 277 155 264 175 256 182 C 248 175 235 155 215 155 Z" fill="#FDE68A" />
          {/* Muzzle & Wide Smile */}
          <ellipse cx="256" cy="245" rx="42" ry="24" fill="#FEF3C7" />
          <ellipse cx="256" cy="235" rx="10" ry="7" fill="#451A03" />
          <path d="M 238 250 Q 256 264 274 250" fill="none" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="218" cy="192" r="9" fill="#451A03" />
          <circle cx="216" cy="189" r="3.5" fill="#FFFFFF" />
          <circle cx="294" cy="192" r="9" fill="#451A03" />
          <circle cx="292" cy="189" r="3.5" fill="#FFFFFF" />
        </g>
      );

    case 'elephant':
      return (
        <g id="animal-elephant">
          {/* Enormous Elephant Ears */}
          <ellipse cx="120" cy="185" rx="65" ry="85" fill="#94A3B8" stroke="#64748B" strokeWidth="3" />
          <ellipse cx="120" cy="185" rx="42" ry="62" fill="#FBCFE8" opacity="0.6" />
          <ellipse cx="392" cy="185" rx="65" ry="85" fill="#94A3B8" stroke="#64748B" strokeWidth="3" />
          <ellipse cx="392" cy="185" rx="42" ry="62" fill="#FBCFE8" opacity="0.6" />
          {/* Body */}
          <ellipse cx="256" cy="365" rx="125" ry="105" fill="#94A3B8" stroke="#64748B" strokeWidth="3" />
          <ellipse cx="256" cy="375" rx="75" ry="80" fill="#CBD5E1" />
          {/* Sturdy Elephant Legs/Paws */}
          <ellipse cx="132" cy="365" rx="40" ry="65" fill="#64748B" />
          <ellipse cx="380" cy="365" rx="40" ry="65" fill="#64748B" />
          <ellipse cx="178" cy="458" rx="44" ry="26" fill="#475569" />
          <ellipse cx="334" cy="458" rx="44" ry="26" fill="#475569" />
          {/* Head */}
          <ellipse cx="256" cy="195" rx="92" ry="84" fill="#CBD5E1" stroke="#64748B" strokeWidth="3" />
          {/* Curved Elephant Trunk */}
          <path d="M 246 220 Q 236 295 256 315 Q 275 325 285 305 Q 288 290 275 285 Q 262 288 264 298" fill="none" stroke="#94A3B8" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          {/* Kind Friendly Eyes */}
          <circle cx="210" cy="178" r="9" fill="#1E293B" />
          <circle cx="208" cy="175" r="3.5" fill="#FFFFFF" />
          <circle cx="302" cy="178" r="9" fill="#1E293B" />
          <circle cx="300" cy="175" r="3.5" fill="#FFFFFF" />
        </g>
      );

    default:
      // Fallback: Default friendly Fox mascot
      return renderAnimalBase('fox');
  }
}

// 2. ILLUSTRATED OUTFIT / CLOTHING ASSETS (Anchored to animal torso)
function renderOutfit(outfitId: string) {
  switch (outfitId) {
    case 'eng_coat':
      return (
        <g id="outfit-eng-coat">
          {/* Engineering Navy Blue Blazer */}
          <path d="M -90 100 L -65 -30 L -25 -5 L 0 -25 L 25 -5 L 65 -30 L 90 100 C 90 115 -90 115 -90 100 Z" fill="#1E3A8A" stroke="#0F172A" strokeWidth="3" />
          {/* Sharp Lapel Collar */}
          <polygon points="-65,-30 -30,25 -55,25" fill="#172554" stroke="#0F172A" strokeWidth="1.5" />
          <polygon points="65,-30 30,25 55,25" fill="#172554" stroke="#0F172A" strokeWidth="1.5" />
          {/* Inner Shirt V & Golden Buttons */}
          <polygon points="-25,-5 0,-25 25,-5 0,35" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
          <circle cx="0" cy="50" r="4.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
          <circle cx="0" cy="72" r="4.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
        </g>
      );

    case 'college_hoodie':
      return (
        <g id="outfit-college-hoodie">
          {/* Warm Heather Orange College Hoodie */}
          <path d="M -85 100 C -85 30 -50 -30 0 -30 C 50 -30 85 30 85 100 C 85 115 -85 115 -85 100 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="3" />
          {/* Hood Collar Fold */}
          <path d="M -45 -22 Q 0 5 45 -22" fill="none" stroke="#C2410C" strokeWidth="6" strokeLinecap="round" />
          {/* White Drawstrings */}
          <line x1="-15" y1="-8" x2="-18" y2="28" stroke="#FEF08A" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="15" y1="-8" x2="18" y2="28" stroke="#FEF08A" strokeWidth="3.5" strokeLinecap="round" />
          {/* Kangaroo Pocket */}
          <path d="M -45 55 L 45 55 L 35 95 L -35 95 Z" fill="#C2410C" stroke="#9A3412" strokeWidth="2" />
          {/* College Badge */}
          <rect x="-24" y="15" width="48" height="22" rx="5" fill="#9A3412" />
          <text x="0" y="31" fill="#FFFFFF" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">ENG</text>
        </g>
      );

    case 'formal_shirt':
      return (
        <g id="outfit-formal-shirt">
          {/* Formal Crisp Oxford Shirt */}
          <path d="M -85 100 L -60 -25 L 60 -25 L 85 100 C 85 115 -85 115 -85 100 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
          {/* Shirt Collars */}
          <polygon points="-60,-25 -15,-5 -35,-25" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
          <polygon points="60,-25 15,-5 35,-25" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* Engineering Royal Blue Necktie */}
          <polygon points="-10,-5 10,-5 15,65 0,80 -15,65" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1.5" />
          <polygon points="-9,-5 9,-5 6,8 -6,8" fill="#1D4ED8" />
        </g>
      );

    case 'lab_coat':
      return (
        <g id="outfit-lab-coat">
          {/* Scientist Lab Coat */}
          <path d="M -88 100 L -62 -28 L 62 -28 L 88 100 C 88 115 -88 115 -88 100 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="3" />
          <line x1="0" y1="-25" x2="0" y2="105" stroke="#E2E8F0" strokeWidth="3" />
          {/* Breast Pocket with Engineering Pens */}
          <rect x="-60" y="25" width="28" height="30" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="-52" y1="12" x2="-52" y2="25" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="-42" y1="10" x2="-42" y2="25" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="-32" y1="15" x2="-32" y2="25" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );

    case 'casual_jacket':
      return (
        <g id="outfit-casual-jacket">
          {/* Casual Bomber Jacket */}
          <path d="M -86 100 C -86 35 -55 -28 0 -28 C 55 -28 86 35 86 100 C 86 115 -86 115 -86 100 Z" fill="#334155" stroke="#1E293B" strokeWidth="3" />
          {/* Inner Tee Collar */}
          <path d="M -30 -25 Q 0 -10 30 -25" fill="none" stroke="#0D9488" strokeWidth="6" />
          {/* Heavy Zipper */}
          <line x1="0" y1="-18" x2="0" y2="105" stroke="#94A3B8" strokeWidth="3" strokeDasharray="3 3" />
        </g>
      );

    case 'safety_vest':
      return (
        <g id="outfit-safety-vest">
          {/* Hi-Vis Construction Safety Vest */}
          <path d="M -86 100 L -60 -28 L 60 -28 L 86 100 C 86 115 -86 115 -86 100 Z" fill="#F97316" stroke="#C2410C" strokeWidth="3" />
          {/* Silver Reflective Bands */}
          <rect x="-48" y="-25" width="18" height="130" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="30" y="-25" width="18" height="130" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="-86" y="55" width="172" height="18" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
        </g>
      );

    case 'grad_outfit':
      return (
        <g id="outfit-grad-outfit">
          {/* Academic Graduation Gown */}
          <path d="M -90 100 L -65 -30 L 65 -30 L 90 100 C 90 118 -90 118 -90 100 Z" fill="#0F172A" stroke="#020617" strokeWidth="3" />
          {/* Gold Engineering Honor Stole */}
          <path d="M -45 -28 L -26 80 L -8 80 L -18 -15 L 0 -22 L 18 -15 L 8 80 L 26 80 L 45 -28 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
        </g>
      );

    default:
      return null;
  }
}

// 3. ILLUSTRATED GLASSES ASSETS (Anchored to animal eyes)
function renderGlasses(glassesId: string) {
  switch (glassesId) {
    case 'round_glasses':
      return (
        <g id="glasses-round">
          {/* Scholar Round Wireframes */}
          <circle cx="-42" cy="0" r="28" fill="rgba(255,255,255,0.3)" stroke="#1E293B" strokeWidth="4.5" />
          <circle cx="42" cy="0" r="28" fill="rgba(255,255,255,0.3)" stroke="#1E293B" strokeWidth="4.5" />
          {/* Center Bridge */}
          <path d="M -14 0 Q 0 -10 14 0" fill="none" stroke="#1E293B" strokeWidth="4.5" strokeLinecap="round" />
          {/* Temples */}
          <line x1="-70" y1="0" x2="-88" y2="-6" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="70" y1="0" x2="88" y2="-6" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
          {/* Lens glare */}
          <path d="M -54 -12 L -44 8" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
          <path d="M 30 -12 L 40 8" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
        </g>
      );

    case 'square_glasses':
      return (
        <g id="glasses-square">
          {/* Modern Square Architect Frames */}
          <rect x="-70" y="-24" width="56" height="48" rx="8" fill="rgba(255,255,255,0.25)" stroke="#0F172A" strokeWidth="5" />
          <rect x="14" y="-24" width="56" height="48" rx="8" fill="rgba(255,255,255,0.25)" stroke="#0F172A" strokeWidth="5" />
          {/* Center Bridge */}
          <line x1="-14" y1="-4" x2="14" y2="-4" stroke="#0F172A" strokeWidth="5" />
          {/* Temples */}
          <line x1="-70" y1="-6" x2="-88" y2="-10" stroke="#0F172A" strokeWidth="4" />
          <line x1="70" y1="-6" x2="88" y2="-10" stroke="#0F172A" strokeWidth="4" />
        </g>
      );

    case 'sunglasses':
      return (
        <g id="glasses-sunglasses">
          {/* Engineering Wayfarer Sunglasses */}
          <path d="M -72 -20 L -14 -20 C -14 16 -30 28 -68 22 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="4" />
          <path d="M 14 -20 L 72 -20 C 68 28 30 16 14 22 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="4" />
          <rect x="-14" y="-20" width="28" height="8" fill="#0F172A" />
          {/* Cool White Highlights */}
          <path d="M -60 -12 L -45 10" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 28 -12 L 43 10" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );

    case 'safety_glasses':
      return (
        <g id="glasses-safety">
          {/* Laboratory Wrap-around Safety Goggles */}
          <rect x="-78" y="-24" width="156" height="48" rx="16" fill="rgba(6,182,212,0.3)" stroke="#0891B2" strokeWidth="4.5" />
          <line x1="0" y1="-24" x2="0" y2="24" stroke="#0891B2" strokeWidth="3" strokeDasharray="3 3" />
          {/* Side Protective Flaps */}
          <path d="M -78 -10 L -94 -4" stroke="#0891B2" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 78 -10 L 94 -4" stroke="#0891B2" strokeWidth="4.5" strokeLinecap="round" />
          {/* Cleanroom Reflection */}
          <line x1="-60" y1="-10" x2="-20" y2="-10" stroke="rgba(255,255,255,0.8)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="20" y1="-10" x2="60" y2="-10" stroke="rgba(255,255,255,0.8)" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );

    case 'nerd_glasses':
      return (
        <g id="glasses-nerd">
          {/* Bold Thick Nerd Glasses with Taped Bridge */}
          <rect x="-72" y="-25" width="58" height="50" rx="10" fill="rgba(255,255,255,0.35)" stroke="#111827" strokeWidth="6" />
          <rect x="14" y="-25" width="58" height="50" rx="10" fill="rgba(255,255,255,0.35)" stroke="#111827" strokeWidth="6" />
          <line x1="-14" y1="-6" x2="14" y2="-6" stroke="#111827" strokeWidth="6" />
          {/* White Center Tape */}
          <rect x="-8" y="-12" width="16" height="18" rx="2" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        </g>
      );

    default:
      return null;
  }
}

// 4. ILLUSTRATED HAT ASSETS (Anchored to animal crown/skull)
function renderHat(hatId: string) {
  switch (hatId) {
    case 'classic_cap':
      return (
        <g id="hat-classic-cap">
          {/* Navy Baseball Cap Dome */}
          <path d="M -60 5 C -60 -45 60 -45 60 5 Z" fill="#1E3A8A" stroke="#0F172A" strokeWidth="3" />
          {/* Cap Visor */}
          <path d="M -75 5 Q 0 -8 75 5 Q 92 12 70 20 Q 0 4 -70 20 Q -92 12 -75 5 Z" fill="#2563EB" stroke="#0F172A" strokeWidth="2.5" />
          {/* Top Gold Button */}
          <circle cx="0" cy="-42" r="6" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        </g>
      );

    case 'grad_cap':
      return (
        <g id="hat-grad-cap">
          {/* Mortarboard Diamond */}
          <polygon points="0,-48 95,-22 0,4 -95,-22" fill="#0F172A" stroke="#334155" strokeWidth="3" />
          {/* Skull Cap */}
          <path d="M -48 -12 L -48 10 C -48 25 48 25 48 10 L 48 -12 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="2.5" />
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
          <path d="M -68 8 C -68 -50 68 -50 68 8 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="3.5" />
          {/* Structural Center Ridge */}
          <path d="M -12 -45 C -12 -50 12 -50 12 -45 L 10 5 L -10 5 Z" fill="#FBBF24" />
          {/* Helmet Brim */}
          <path d="M -85 8 Q 0 0 85 8 Q 94 16 85 20 Q 0 10 -85 20 Q -94 16 -85 8 Z" fill="#D97706" stroke="#92400E" strokeWidth="2.5" />
          {/* Highlight Glare */}
          <path d="M -45 -22 Q -25 -32 -5 -28" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="4" strokeLinecap="round" />
        </g>
      );

    case 'detective_hat':
      return (
        <g id="hat-detective">
          {/* Fedora Crown with Indent */}
          <path d="M -50 -5 C -50 -40 -20 -35 0 -30 C 20 -35 50 -40 50 -5 Z" fill="#475569" stroke="#1E293B" strokeWidth="3" />
          {/* Brim */}
          <ellipse cx="0" cy="-3" rx="80" ry="16" fill="#334155" stroke="#0F172A" strokeWidth="3" />
          {/* Teal Hat Ribbon */}
          <path d="M -50 -12 Q 0 -8 50 -12 L 50 -3 Q 0 1 -50 -3 Z" fill="#0D9488" />
        </g>
      );

    case 'crown':
      return (
        <g id="hat-crown">
          {/* Royal Gold Crown */}
          <path d="M -55 8 L -62 -28 L -30 -12 L 0 -38 L 30 -12 L 62 -28 L 55 8 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />
          <rect x="-56" y="2" width="112" height="10" rx="3" fill="#D97706" />
          {/* Jewels */}
          <circle cx="0" cy="-38" r="6" fill="#EF4444" stroke="#991B1B" strokeWidth="1.5" />
          <circle cx="-62" cy="-28" r="5" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <circle cx="62" cy="-28" r="5" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
          <circle cx="-30" cy="-12" r="4.5" fill="#EC4899" />
          <circle cx="30" cy="-12" r="4.5" fill="#8B5CF6" />
        </g>
      );

    case 'party_hat':
      return (
        <g id="hat-party">
          {/* Party Cone with Colorful Stripes */}
          <polygon points="0,-68 -42,8 42,8" fill="#EC4899" stroke="#BE185D" strokeWidth="3" />
          <polygon points="0,-68 -28,-15 28,-15" fill="#8B5CF6" />
          <polygon points="0,-68 -16,-40 16,-40" fill="#06B6D4" />
          {/* Fluffy Gold Pom-pom */}
          <circle cx="0" cy="-68" r="8" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
        </g>
      );

    case 'beanie':
      return (
        <g id="hat-beanie">
          {/* Knitted Teal Beanie */}
          <path d="M -55 5 C -55 -45 55 -45 55 5 Z" fill="#0D9488" stroke="#042F2E" strokeWidth="3" />
          {/* Folded Brim */}
          <rect x="-62" y="-2" width="124" height="16" rx="5" fill="#14B8A6" stroke="#0F766E" strokeWidth="2.5" />
          {/* Top Fluffy Pom-pom */}
          <circle cx="0" cy="-45" r="9" fill="#CCFBF1" stroke="#0D9488" strokeWidth="2" />
        </g>
      );

    case 'top_hat':
      return (
        <g id="hat-top-hat">
          {/* Victorian Top Hat Crown */}
          <rect x="-40" y="-55" width="80" height="60" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="3" />
          {/* Hat Brim */}
          <ellipse cx="0" cy="5" rx="72" ry="14" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />
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
  glasses = 'none',
  outfit = 'none',
  size = 'md',
  className = '',
  showBadge = false
}) => {
  const safeAnimal = (animal || 'fox').toLowerCase();
  const config = ANIMAL_CONFIGS[safeAnimal] || ANIMAL_CONFIGS.fox;

  const hasHat = hat && hat !== 'none';
  const hasGlasses = glasses && glasses !== 'none';
  const hasOutfit = outfit && outfit !== 'none';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full drop-shadow-sm overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* LAYER 1: BASE CARTOON ANIMAL (Body, Head, Face, Ears, Limbs) */}
        {renderAnimalBase(safeAnimal)}

        {/* LAYER 2: OUTFIT (Anchored to animal shoulders and torso) */}
        {hasOutfit && (
          <g
            transform={`translate(${config.outfitAnchor.x}, ${config.outfitAnchor.y}) scale(${config.outfitAnchor.scale}) rotate(${config.outfitAnchor.rotation})`}
          >
            {renderOutfit(outfit)}
          </g>
        )}

        {/* LAYER 3: GLASSES (Anchored specifically to animal eyes) */}
        {hasGlasses && (
          <g
            transform={`translate(${config.glassesAnchor.x}, ${config.glassesAnchor.y}) scale(${config.glassesAnchor.scale}) rotate(${config.glassesAnchor.rotation})`}
          >
            {renderGlasses(glasses)}
          </g>
        )}

        {/* LAYER 4: HAT (Anchored specifically to animal head crown) */}
        {hasHat && (
          <g
            transform={`translate(${config.hatAnchor.x}, ${config.hatAnchor.y}) scale(${config.hatAnchor.scale}) rotate(${config.hatAnchor.rotation})`}
          >
            {renderHat(hat)}
          </g>
        )}
      </svg>

      {/* Optional Customized Status Badge */}
      {showBadge && (hasHat || hasGlasses || hasOutfit) && (
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
      )}
    </div>
  );
};
