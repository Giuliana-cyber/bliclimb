/**
 * Chip reusable para selección single/multi en onboarding.
 * Estilo consistente: rounded-full, h-12, border-2.
 * Activo: bg-bil-green/10 + border-bil-green + text-bil-green.
 * Inactivo: border-bil-ink/15 + text-bil-ink/70.
 */

'use client';

import type { ReactNode } from 'react';

export interface ChipButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: string; // Material symbol name
  fullWidth?: boolean;
  tone?: 'green' | 'gold' | 'red';
}

export function ChipButton({
  active,
  onClick,
  children,
  icon,
  fullWidth = false,
  tone = 'green',
}: ChipButtonProps) {
  const activeCls =
    tone === 'gold'
      ? 'border-bil-gold bg-bil-gold/10 text-bil-gold'
      : tone === 'red'
        ? 'border-bil-red bg-bil-red/10 text-bil-red'
        : 'border-bil-green bg-bil-green/10 text-bil-green';
  const idleCls = 'border-bil-ink/15 text-bil-ink/70 hover:border-bil-ink/30';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${
        fullWidth ? 'w-full' : ''
      } h-12 px-4 rounded-full border-2 transition-all active:scale-95 font-semibold text-sm flex items-center justify-center gap-2 ${
        active ? activeCls : idleCls
      }`}
    >
      {icon && (
        <span
          className="material-symbols-outlined text-[18px]"
          style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
