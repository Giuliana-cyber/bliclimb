'use client';

import Image from 'next/image';
import { useState } from 'react';

type Props = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 28, className = '' }: Props) {
  const [hasImage, setHasImage] = useState(true);

  if (hasImage) {
    return (
      <Image
        src="/brand/mark.png"
        alt="BilClimb.ai"
        width={size}
        height={size}
        onError={() => setHasImage(false)}
        className={className}
        priority
      />
    );
  }

  return <BrandMarkSvg size={size} className={className} />;
}

function BrandMarkSvg({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="brandmark-fallback" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#00d4aa" />
          <stop offset="100%" stopColor="#5ee9c5" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="26" height="26" rx="8" fill="url(#brandmark-fallback)" />
      <path
        d="M7 20 L12 10 L15.5 16 L19 12 L21 20 Z"
        fill="#0a0c14"
        stroke="#0a0c14"
        strokeWidth="0.5"
      />
    </svg>
  );
}
