/**
 * Step 1 · Selección de coach.
 * Traducción de docs/design/carpeta_3/selecci_n_de_coach_bilclimb.
 * Bill = bil-green · Senda = bil-navy · Chips grandes con avatar.
 */

'use client';

import Image from 'next/image';
import type { Character, OnboardingState } from '../types';

export interface CoachStepProps {
  state: OnboardingState;
  onSelect: (coach: Character) => void;
}

export function CoachStep({ state, onSelect }: CoachStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-headline-lg-mobile text-bil-ink font-bold">
          ¿Quién quieres que te acompañe?
        </h2>
        <p className="text-body-md text-bil-ink/70 mt-2">
          Puedes cambiarlo después desde tu perfil.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <CoachCard
          character="bill"
          selected={state.coach === 'bill'}
          onSelect={() => onSelect('bill')}
          tag="TE GUÍA"
          description="Directo, claro y seguro. Te dice exactamente qué hacer hoy."
        />
        <CoachCard
          character="senda"
          selected={state.coach === 'senda'}
          onSelect={() => onSelect('senda')}
          tag="TE ACOMPAÑA"
          description="Introspectiva y cercana. Descubren juntas cómo responde tu cuerpo."
        />
      </div>
    </div>
  );
}

function CoachCard({
  character,
  selected,
  onSelect,
  tag,
  description,
}: {
  character: Character;
  selected: boolean;
  onSelect: () => void;
  tag: string;
  description: string;
}) {
  const accent = character === 'bill' ? 'border-bil-green' : 'border-bil-navy';
  const accentActive =
    character === 'bill'
      ? 'bg-bil-green/10 border-bil-green'
      : 'bg-bil-navy/10 border-bil-navy';
  const tagColor = character === 'bill' ? 'text-bil-green' : 'text-bil-navy';
  const name = character === 'bill' ? 'Bill' : 'Senda';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full bg-white rounded-DEFAULT p-5 border-2 transition-all active:scale-[0.98] flex items-center gap-4 text-left ${
        selected ? accentActive : 'border-bil-ink/10 hover:border-bil-ink/20'
      }`}
    >
      <div
        className={`flex-shrink-0 w-20 h-20 rounded-full overflow-hidden border-4 ${accent}`}
      >
        <Image
          src={`/characters/${character}-avatar.png`}
          alt={`Coach ${name}`}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-label-md font-bold uppercase tracking-wider ${tagColor}`}>
          {tag}
        </p>
        <h3 className="text-headline-md text-bil-ink font-bold mt-1">{name}</h3>
        <p className="text-body-md text-bil-ink/70 mt-1 leading-snug">{description}</p>
      </div>
    </button>
  );
}
