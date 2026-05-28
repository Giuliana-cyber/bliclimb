'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { ChevronLeft, CheckCircle2, PencilLine } from 'lucide-react';
import { saveCheckIn, type CheckIn } from '@/lib/checkin';
import { loadCheckIns } from '@/lib/checkin';
import { loadTrainingPlan, saveSessionCheckIn } from '@/lib/plan';
import { getCheckInAlerts, type CheckInAlert } from '@/lib/training/alerts';
import {
  getSessionWithContext,
  getTodaySession,
  withDerivedCurrentWeek,
  type SessionWithContext
} from '@/lib/training/current-session';

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

type ManualActivityDraft = {
  enabled: boolean;
  title: string;
  location: string;
  durationMinutes: string;
  details: string;
  customizedPlan: boolean;
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

const initialManualActivity: ManualActivityDraft = {
  enabled: false,
  title: '',
  location: '',
  durationMinutes: '',
  details: '',
  customizedPlan: false
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

function createId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `checkin-${Date.now()}`;
}

function parseOptionalMinutes(value: string) {
  const minutes = Number.parseInt(value, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

export function CheckInForm() {
  const [sessionContext, setSessionContext] = useState<SessionWithContext | null>(null);
  const [fallbackPlanId, setFallbackPlanId] = useState('manual');
  const [draft, setDraft] = useState<CheckInDraft>(initialDraft);
  const [manualActivity, setManualActivity] =
    useState<ManualActivityDraft>(initialManualActivity);
  const [savedCheckIn, setSavedCheckIn] = useState<CheckIn | null>(null);
  const [alerts, setAlerts] = useState<CheckInAlert[]>([]);

  useEffect(() => {
    const storedPlan = loadTrainingPlan();
    const plan = storedPlan ? withDerivedCurrentWeek(storedPlan) : null;
    const params = new URLSearchParams(window.location.search);
    const weekNumber = Number(params.get('week'));
    const dayNumber = Number(params.get('day'));
    const selectedSession =
      plan && Number.isInteger(weekNumber) && Number.isInteger(dayNumber)
        ? getSessionWithContext(plan, weekNumber, dayNumber)
        : null;
    const activeSession = selectedSession ?? (plan ? getTodaySession(plan) : null);

    setFallbackPlanId(plan?.id ?? 'manual');
    setSessionContext(activeSession);

    if (!activeSession || params.get('manual') === '1' || params.get('adapt') === '1') {
      setManualActivity((current) => ({
        ...current,
        enabled: true,
        customizedPlan: params.get('adapt') === '1' ? true : current.customizedPlan
      }));
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const shouldUseManualActivity = manualActivity.enabled || !sessionContext;
    const manualActivityDetails = shouldUseManualActivity
      ? {
          title: manualActivity.title.trim() || 'Actividad libre',
          location: manualActivity.location.trim() || sessionContext?.session.location || 'libre',
          durationMinutes: parseOptionalMinutes(manualActivity.durationMinutes),
          details: manualActivity.details.trim(),
          customizedPlan: manualActivity.customizedPlan
        }
      : null;

    const checkIn: CheckIn = {
      id: createId(),
      sessionId: sessionContext?.sessionId ?? `manual-${Date.now()}`,
      planId: sessionContext?.plan.id ?? fallbackPlanId,
      date: new Date().toISOString(),
      completed: draft.completed,
      rpe: draft.rpe,
      fingerPain: draft.fingerPain,
      otherPain: draft.otherPain.filter((item) => item !== 'none'),
      energy: draft.energy,
      sleep: draft.sleep,
      notes: draft.notes.trim(),
      manualActivity: manualActivityDetails
    };

    const previousCheckIns = loadCheckIns();
    saveCheckIn(checkIn);

    if (sessionContext) {
      saveSessionCheckIn({
        weekNumber: sessionContext.week.weekNumber,
        dayNumber: sessionContext.session.dayNumber,
        checkIn
      });
    }

    setSavedCheckIn(checkIn);
    setAlerts(getCheckInAlerts(checkIn, previousCheckIns));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Link
        href={
          sessionContext
            ? `/session?week=${sessionContext.week.weekNumber}&day=${sessionContext.session.dayNumber}`
            : '/'
        }
        className="inline-flex items-center gap-2 text-sm font-semibold text-white/62"
      >
        <ChevronLeft aria-hidden="true" size={17} />
        {sessionContext ? 'Sesión' : 'Dashboard'}
      </Link>

      <div>
        <p className="text-sm font-semibold text-brand-mustard">
          {sessionContext ? sessionContext.session.title : 'Actividad manual'}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {sessionContext ? '¿Cómo te fue hoy?' : 'Registra lo que hiciste'}
        </h1>
      </div>

      <ManualActivitySection
        forced={!sessionContext}
        value={manualActivity}
        onChange={setManualActivity}
      />

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

      {savedCheckIn ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 p-4 text-sm leading-6 text-white/76">
            <div className="flex items-start gap-3">
              <CheckCircle2 aria-hidden="true" size={22} className="mt-0.5 shrink-0 text-brand-cyan" />
              <div>
                <p className="font-bold text-white">Check-in guardado</p>
                <p className="mt-1 text-white/70">
                  RPE {savedCheckIn.rpe}/10 · Dedos {savedCheckIn.fingerPain}/10 · Energía{' '}
                  {savedCheckIn.energy}/5
                </p>
              </div>
            </div>
          </div>

          {alerts.map((alert) => (
            <PostCheckInAlert key={alert.id} alert={alert} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90"
        >
          Guardar check-in
        </button>
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-md border border-white/12 px-4 py-4 text-base font-bold text-white/76 transition hover:bg-white/[0.05]"
        >
          Volver al dashboard
        </Link>
      </div>
    </form>
  );
}

function PostCheckInAlert({ alert }: { alert: CheckInAlert }) {
  const toneClassName =
    alert.tone === 'danger'
      ? 'border-red-400/30 bg-red-400/10'
      : alert.tone === 'warning'
        ? 'border-brand-mustard/30 bg-brand-mustard/10'
        : 'border-brand-cyan/30 bg-brand-cyan/10';

  const titleClassName =
    alert.tone === 'danger'
      ? 'text-red-200'
      : alert.tone === 'warning'
        ? 'text-brand-mustard'
        : 'text-brand-cyan';

  return (
    <div className={`rounded-lg border p-4 text-sm leading-6 text-white/76 ${toneClassName}`}>
      <p className={`font-bold ${titleClassName}`}>{alert.title}</p>
      <p className="mt-1">{alert.message}</p>
    </div>
  );
}

function ManualActivitySection({
  forced,
  value,
  onChange
}: {
  forced: boolean;
  value: ManualActivityDraft;
  onChange: Dispatch<SetStateAction<ManualActivityDraft>>;
}) {
  const active = forced || value.enabled;

  function update(updates: Partial<ManualActivityDraft>) {
    onChange((current) => ({ ...current, ...updates }));
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <button
        type="button"
        disabled={forced}
        onClick={() => update({ enabled: !value.enabled })}
        className="flex w-full items-center justify-between gap-4 text-left disabled:cursor-default"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={classNames(
              'grid size-10 shrink-0 place-items-center rounded-md',
              active ? 'bg-brand-cyan text-brand-dark' : 'bg-white/8 text-white/58'
            )}
          >
            <PencilLine aria-hidden="true" size={19} strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold text-white">
              {forced ? 'Actividad fuera del plan' : 'Hice algo diferente al plan'}
            </span>
            <span className="mt-1 block text-sm leading-5 text-white/58">
              Guarda roca, gym, movilidad, fuerza o una adaptación hecha por ti.
            </span>
          </span>
        </span>
        {!forced ? (
          <span
            className={classNames(
              'h-6 w-11 shrink-0 rounded-full border p-0.5 transition',
              active ? 'border-brand-cyan bg-brand-cyan/24' : 'border-white/16 bg-white/6'
            )}
          >
            <span
              className={classNames(
                'block size-4 rounded-full transition',
                active ? 'translate-x-5 bg-brand-cyan' : 'translate-x-0 bg-white/50'
              )}
            />
          </span>
        ) : null}
      </button>

      {active ? (
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/76">Qué hiciste</span>
            <input
              value={value.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Ej. Bloque suave en roca, movilidad, fuerza en casa"
              className="h-12 w-full rounded-md border border-white/10 bg-brand-dark/40 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white/76">Lugar</span>
              <input
                value={value.location}
                onChange={(event) => update({ location: event.target.value })}
                placeholder="roca, casa, gym, parque"
                className="h-12 w-full rounded-md border border-white/10 bg-brand-dark/40 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white/76">Minutos</span>
              <input
                inputMode="numeric"
                value={value.durationMinutes}
                onChange={(event) => update({ durationMinutes: event.target.value })}
                placeholder="90"
                className="h-12 w-full rounded-md border border-white/10 bg-brand-dark/40 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/76">Detalle</span>
            <textarea
              value={value.details}
              rows={3}
              onChange={(event) => update({ details: event.target.value })}
              placeholder="Qué cambiaste, intensidad, volumen, rutas, molestias o por qué lo adaptaste..."
              className="w-full resize-none rounded-md border border-white/10 bg-brand-dark/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
            />
          </label>

          <button
            type="button"
            onClick={() => update({ customizedPlan: !value.customizedPlan })}
            className={classNames(
              'flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 py-3 text-left text-sm font-bold transition',
              value.customizedPlan
                ? 'border-brand-cyan bg-brand-cyan/14 text-brand-cyan'
                : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/24'
            )}
          >
            <span>Fue una adaptación del plan</span>
            <span>{value.customizedPlan ? 'Sí' : 'No'}</span>
          </button>
        </div>
      ) : null}
    </section>
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
