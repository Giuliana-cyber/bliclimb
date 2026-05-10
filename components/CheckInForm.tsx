'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { loadTrainingPlan } from '@/lib/plan';
import { getTodaySession, type SessionWithContext } from '@/lib/training/current-session';

type CompletionValue = 'full' | 'partial' | 'skipped';

type CheckInDraft = {
  completed: CompletionValue;
  rpe: number;
  fingerPain: number;
  otherPain: string[];
  energy: number;
  sleep: number;
  notes: string;
};

const initialDraft: CheckInDraft = {
  completed: 'full',
  rpe: 7,
  fingerPain: 0,
  otherPain: [],
  energy: 3,
  sleep: 3,
  notes: ''
};

const completionOptions: Array<{ label: string; value: CompletionValue }> = [
  { label: 'Sí, completa', value: 'full' },
  { label: 'Parcial', value: 'partial' },
  { label: 'No pude', value: 'skipped' }
];

const fingerPainOptions = [
  { label: '0 Nada', value: 0 },
  { label: '1-3 Leve', value: 2 },
  { label: '4-6 Moderado', value: 5 },
  { label: '7-10 Fuerte', value: 8 }
];

const otherPainOptions = [
  { label: 'No', value: 'none' },
  { label: 'Codos', value: 'elbows' },
  { label: 'Hombros', value: 'shoulders' },
  { label: 'Espalda', value: 'back' },
  { label: 'Otro', value: 'other' }
];

const energyOptions = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 }
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function togglePain(currentValues: string[], value: string) {
  if (value === 'none') {
    return ['none'];
  }

  const withoutNone = currentValues.filter((item) => item !== 'none');

  if (withoutNone.includes(value)) {
    return withoutNone.filter((item) => item !== value);
  }

  return [...withoutNone, value];
}

export function CheckInForm() {
  const [sessionContext, setSessionContext] = useState<SessionWithContext | null>(null);
  const [draft, setDraft] = useState<CheckInDraft>(initialDraft);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const plan = loadTrainingPlan();
    setSessionContext(plan ? getTodaySession(plan) : null);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (!sessionContext) {
    return (
      <section className="space-y-6">
        <Link href="/session" className="inline-flex items-center gap-2 text-sm font-semibold text-white/62">
          <ChevronLeft aria-hidden="true" size={17} />
          Sesión
        </Link>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <h1 className="text-2xl font-bold">No hay sesión activa</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Necesitas un plan y una sesión activa para registrar un check-in.
          </p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Link href="/session" className="inline-flex items-center gap-2 text-sm font-semibold text-white/62">
        <ChevronLeft aria-hidden="true" size={17} />
        Sesión
      </Link>

      <div>
        <p className="text-sm font-semibold text-brand-mustard">
          {sessionContext.session.title}
        </p>
        <h1 className="mt-2 text-3xl font-bold">¿Cómo te fue hoy?</h1>
      </div>

      <FieldGroup title="¿Completaste la sesión?">
        <OptionGrid>
          {completionOptions.map((option) => (
            <OptionButton
              key={option.value}
              active={draft.completed === option.value}
              onClick={() => setDraft((current) => ({ ...current, completed: option.value }))}
            >
              {option.label}
            </OptionButton>
          ))}
        </OptionGrid>
      </FieldGroup>

      <FieldGroup title="Esfuerzo percibido (RPE)">
        <NumberScale
          min={1}
          max={10}
          value={draft.rpe}
          onChange={(rpe) => setDraft((current) => ({ ...current, rpe }))}
        />
        <div className="mt-2 flex justify-between text-xs font-semibold text-white/44">
          <span>Muy fácil</span>
          <span>Máximo esfuerzo</span>
        </div>
      </FieldGroup>

      <FieldGroup title="¿Dolor en dedos?">
        <OptionGrid>
          {fingerPainOptions.map((option) => (
            <OptionButton
              key={option.label}
              active={draft.fingerPain === option.value}
              onClick={() => setDraft((current) => ({ ...current, fingerPain: option.value }))}
            >
              {option.label}
            </OptionButton>
          ))}
        </OptionGrid>
      </FieldGroup>

      <FieldGroup title="¿Dolor en otras zonas?">
        <OptionGrid>
          {otherPainOptions.map((option) => (
            <OptionButton
              key={option.value}
              active={draft.otherPain.includes(option.value)}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  otherPain: togglePain(current.otherPain, option.value)
                }))
              }
            >
              {option.label}
            </OptionButton>
          ))}
        </OptionGrid>
      </FieldGroup>

      <FieldGroup title="Energía general hoy">
        <NumberScale
          min={1}
          max={5}
          value={draft.energy}
          onChange={(energy) => setDraft((current) => ({ ...current, energy }))}
        />
      </FieldGroup>

      <FieldGroup title="Sueño anoche">
        <NumberScale
          min={1}
          max={5}
          value={draft.sleep}
          onChange={(sleep) => setDraft((current) => ({ ...current, sleep }))}
        />
      </FieldGroup>

      <label className="block">
        <span className="mb-2 block text-base font-semibold">Notas (opcional)</span>
        <textarea
          value={draft.notes}
          rows={4}
          placeholder="Me costó la tercera serie, bajé intensidad y terminé bien..."
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
        />
      </label>

      {submitted ? (
        <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 p-4 text-sm leading-6 text-white/76">
          Check-in listo para guardar. La siguiente pieza lo persistirá en localStorage.
        </div>
      ) : null}

      <button
        type="submit"
        className="flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90"
      >
        Guardar check-in
      </button>
    </form>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-3">{children}</div>;
}

function OptionButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'min-h-12 rounded-md border px-3 py-3 text-sm font-bold transition',
        active
          ? 'border-brand-cyan bg-brand-cyan/14 text-brand-cyan'
          : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/24'
      )}
    >
      {children}
    </button>
  );
}

function NumberScale({
  min,
  max,
  value,
  onChange
}: {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {values.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={classNames(
            'grid aspect-square place-items-center rounded-md border text-sm font-bold transition',
            item === value
              ? 'border-brand-cyan bg-brand-cyan text-brand-dark'
              : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/24'
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
