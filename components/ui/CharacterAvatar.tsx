'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Dumbbell, Mountain } from 'lucide-react';

type Character = 'bill' | 'senda';
// Solo 'avatar' — variante 'full' descartada 2026-07-18. El asset único
// es el disco verde horneado #24614D · siempre va sobre superficie
// crema/blanca (nunca sobre header verde · el casco se fundiría).
type Variant = 'avatar';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<Size, number> = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 96
};

const SIZE_CLS: Record<Size, string> = {
  sm: 'size-8',
  md: 'size-11',
  lg: 'size-16',
  xl: 'size-24'
};

type Props = {
  character: Character;
  variant?: Variant;
  size?: Size;
  className?: string;
};

export function CharacterAvatar({
  character,
  variant = 'avatar',
  size = 'md',
  className = ''
}: Props) {
  const [hasImage, setHasImage] = useState(true);
  const src = `/characters/${character}-${variant}.png`;
  const pixels = SIZE_PX[size];

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-gradient-card ${SIZE_CLS[size]} ${className}`}
    >
      {hasImage ? (
        <Image
          src={src}
          alt={`${character} avatar`}
          width={pixels}
          height={pixels}
          onError={() => setHasImage(false)}
          className="h-full w-full object-cover"
        />
      ) : (
        <FallbackAvatar character={character} />
      )}
    </div>
  );
}

function FallbackAvatar({ character }: { character: Character }) {
  const isBill = character === 'bill';
  return (
    <div
      className={`grid h-full w-full place-items-center ${
        isBill ? 'bg-brand-cyan/14 text-brand-cyan' : 'bg-brand-mustard/14 text-brand-mustard'
      }`}
    >
      {isBill ? (
        <Dumbbell aria-hidden="true" size={18} strokeWidth={2.4} />
      ) : (
        <Mountain aria-hidden="true" size={18} strokeWidth={2.4} />
      )}
    </div>
  );
}

