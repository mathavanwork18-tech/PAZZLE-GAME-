import React from 'react';
import { HatId, GlassesId, OutfitId } from '../types/game';
import { AvatarComposer } from './AvatarComposer';

export interface AvatarRendererProps {
  animalId: string;
  hatId?: HatId | string;
  glassesId?: GlassesId | string;
  outfitId?: OutfitId | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
}

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  animalId,
  hatId = 'none',
  glassesId = 'none',
  outfitId = 'none',
  size = 'md',
  className = '',
  showBadge = false
}) => {
  return (
    <AvatarComposer
      animal={animalId}
      hat={hatId}
      glasses={glassesId}
      outfit={outfitId}
      size={size}
      className={className}
      showBadge={showBadge}
    />
  );
};

export { AvatarComposer };
export default AvatarRenderer;
