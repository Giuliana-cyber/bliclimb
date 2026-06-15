'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, CheckCircle2, PencilLine } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
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
  { label: '0 · Nada', value: 0 },
  { label: '1-3 · Leve', value: 2 },
  { label: '4-6 · Moderado', value: 5 },
  { label: '7-10 · Fuerte', value: 8 }
];

const otherPainOptions = [
  { label: 'No', value: 'none' },
  { label: 'Codos', value: 'elbows' },
  { label: 'Hombros', value: 'shoulders' },
  { label: 'Espalda', value: 'back' },
  { label: 'Otro', value: 'other' }
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function togglePain(currentValues: string[], value: string) {
  if (value === 'none') return ['none'];
  const withoutNone = currentValues.filter((item) => item !== 'none');
  if (withoutNone.includes(value)) return withoutNone.filter((item) => item !== value);
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
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <Link
        href={
          sessionContext
            ? `/session?week=${sessionContext.week.weekNumber}&day=${sessionContext.session.dayNumber}`
            : '/'
        }
        className="inline-flex items-center gap-2 text-sm font-bold text-white/62 hover:text-white"
      >
        <ChevronLeft aria-hidden="true" size={17} />
        {sessionContext ? 'Volver a la sesión' : 'Volver al dashboard'}
      </Link>

      <header className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-mustard">
          {sessionContext ? sessionContext.session.title : 'Actividad manual'}
        </p>
        <h1 className="text-3xl font-extrabold leading-tight">
          {sessionContext ? '¿Cómo te fue hoy?' : 'Registra lo que hiciste'}
        </h1>
      </header>

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

      <FieldGroup title="Esfuerzo percibido (RPE)" hint="1 muy fácil · 10 máximo">
        <NumberScale
          min={1}
          max={10}
          value={draft.rpe}
          tone="cyan"
          onChange={(rpe) => setDraft((current) => ({ ...current, rpe }))}
        />
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

      <FieldGroup title="Energía general hoy" hint="1 baja · 5 alta">
        <NumberScale
          min={1}
          max={5}
          value={draft.energy}
          tone="mustard"
          onChange={(energy) => setDraft((current) => ({ ...current, energy }))}
        />
      </FieldGroup>

      <FieldGroup title="Sueño anoche" hint="1 malo · 5 reparador">
        <NumberScale
          min={1}
          max={5}
          value={draft.sleep}
          tone="cyan"
          onChange={(sleep) => setDraft((current) => ({ ...current, sleep }))}
        />
      </FieldGroup>

      <label className="block">
        <span className="mb-2 block text-sm font-extrabold text-white">Notas (opcional)</span>
        <textarea
          value={draft.notes}
          rows={4}
          placeholder="Me costó la tercera serie, bajé intensidad y terminé bien…"
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60 focus:bg-white/[0.05]"
        />
      </label>

      {savedCheckIn ? (
        <div className="space-y-3">
          <Banner
            tone="cyan"
            icon={CheckCircle2}
            title="Check-in guardado"
            description={`RPE ${savedCheckIn.rpe}/10 · Dedos ${savedCheckIn.fingerPain}/10 · Energía ${savedCheckIn.energy}/5`}
          />
          {alerts.map((alert) => (
            <Banner
              key={alert.id}
              tone={alert.tone === 'danger' ? 'danger' : alert.tone === 'warning' ? 'mustard' : 'cyan'}
              title={alert.title}
              description={alert.message}
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="submit" size="lg" className="w-full">
          Guardar check-in
        </Button>
        <Button variant="secondary" href="/" size="lg" className="w-full">
          Volver al dashboard
        </Button>
      </div>
    </motion.form>
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
    <Card>
      <button
        type="button"
        disabled={forced}
        onClick={() => update({ enabled: !value.enabled })}
        className="flex w-full items-center justify-between gap-4 text-left disabled:cursor-default"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-xl transition',
              active
                ? 'bg-gradient-cyan text-brand-dark shadow-glow'
                : 'bg-white/8 text-white/60'
            )}
          >
            <PencilLine aria-hidden="true" size={18} strokeWidth={2.3} />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-extrabold text-white">
              {forced ? 'Actividad fuera del plan' : 'Hice algo diferente al plan'}
            </span>
            <span className="mt-1 block text-sm leading-5 text-white/58">
              Guarda roca, gym, movilidad, fuerza o una adaptación hecha por ti.
            </span>
          </span>
        </span>
        {!forced ? (
          <span
            className={cn(
              'h-6 w-11 shrink-0 rounded-full border p-0.5 transition',
              active ? 'border-brand-cyan/60 bg-brand-cyan/24' : 'border-white/16 bg-white/[0.06]'
            )}
          >
            <span
              className={cn(
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
            <span className="mb-2 block text-sm font-bold text-white/76">Qué hiciste</span>
            <input
              value={value.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Bloque suave en roca, movilidad, fuerza en casa…"
              className="h-12 w-full rounded-xl border border-white/10 bg-brand-deep/40 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-white/76">Lugar</span>
              <input
                value={value.location}
                onChange={(event) => update({ location: event.target.value })}
                placeholder="roca, casa, gym, parque"
                className="h-12 w-full rounded-xl border border-white/10 bg-brand-deep/40 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-white/76">Minutos</span>
              <input
                inputMode="numeric"
                value={value.durationMinutes}
                onChange={(event) => update({ durationMinutes: event.target.value })}
                placeholder="90"
                className="h-12 w-full rounded-xl border border-white/10 bg-brand-deep/40 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-white/76">Detalle</span>
            <textarea
              value={value.details}
              rows={3}
              onChange={(event) => update({ details: event.target.value })}
              placeholder="Qué cambiaste, intensidad, volumen, rutas, molestias o por qué lo adaptaste…"
              className="w-full resize-none rounded-xl border border-white/10 bg-brand-deep/40 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60"
            />
          </label>

          <button
            type="button"
            onClick={() => update({ customizedPlan: !value.customizedPlan })}
            className={cn(
              'flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm font-bold transition',
              value.customizedPlan
                ? 'border-brand-cyan/55 bg-brand-cyan/[0.08] text-brand-cyan'
                : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/22'
            )}
          >
            <span>Fue una adaptación del plan</span>
            <span>{value.customizedPlan ? 'Sí' : 'No'}</span>
          </button>
        </div>
      ) : null}
    </Card>
  );
}

function FieldGroup({
  title,
  hint,
  children
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-extrabold text-white">{title}</h2>
        {hint ? (
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.10em] text-white/45">
            {hint}
          </span>
        ) : null}
      </div>
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
      className={cn(
        'min-h-12 rounded-xl border px-3 py-3 text-sm font-bold transition-all duration-150 active:scale-[0.99]',
        active
          ? 'border-brand-cyan/55 bg-brand-cyan/[0.12] text-brand-cyan shadow-glow'
          : 'border-white/10 bg-white/[0.03] text-white/74 hover:border-white/22'
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
  tone,
  onChange
}: {
  min: number;
  max: number;
  value: number;
  tone: 'cyan' | 'mustard';
  onChange: (value: number) => void;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  const activeBg = tone === 'cyan' ? 'bg-gradient-cyan shadow-glow' : 'bg-gradient-mustard shadow-glow-mustard';
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {values.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            'grid aspect-square place-items-center rounded-xl border text-sm font-extrabold transition active:scale-[0.97]',
            item === value
              ? `${activeBg} border-transparent text-brand-dark`
              : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/22'
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
