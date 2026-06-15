'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  HeartPulse,
  ListChecks,
  MessageCircleQuestion,
  Package,
  RefreshCw,
  Target,
  X,
  type LucideIcon
} from 'lucide-react';
import type { Exercise } from '@/lib/plan';
import { buildExerciseQuestion } from '@/components/ExerciseHelpLink';
import { loadProfile } from '@/lib/profile';

type ExerciseGuideProps = {
  exercise: Exercise;
  contextLabel?: string;
};

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function firstSentence(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return cleanText(value).split(/(?<=[.!?])\s+/)[0] ?? cleanText(value);
}

function toItems(value: string[] | string | null | undefined) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  return value
    .split(/\n|;/)
    .map(cleanText)
    .filter(Boolean);
}

function buildGuide(exercise: Exercise) {
  const intensityLabel = exercise.intensityPercent ?? exercise.intensity;
  const dosage = [
    exercise.prescription ?? null,
    exercise.sets ? `${exercise.sets} series` : null,
    exercise.reps ?? exercise.duration,
    exercise.rest ? `descansa ${exercise.rest}` : null,
    exercise.rpeTarget ? `RPE: ${exercise.rpeTarget}` : null,
    intensityLabel ? `intensidad: ${intensityLabel}` : null,
    exercise.tempo ? `tempo: ${exercise.tempo}` : null
  ].filter(Boolean);
  const fallbackStep = [exercise.description, dosage.length ? dosage.join(' · ') : null]
    .filter(Boolean)
    .join(' ');

  return {
    objective:
      exercise.objective ??
      firstSentence(exercise.description) ??
      'Ejecutar el bloque con control y técnica limpia.',
    howTo: toItems(exercise.howTo).length
      ? toItems(exercise.howTo)
      : [
          fallbackStep,
          'Empieza suave y sube intensidad solo si la técnica se mantiene estable.',
          'Respira entre intentos y respeta el descanso indicado.'
        ].filter(Boolean),
    feelCues: toItems(exercise.feelCues).length
      ? toItems(exercise.feelCues)
      : [
          exercise.intensity ? `Esfuerzo esperado: ${exercise.intensity}.` : 'Trabajo controlado, no máximo.',
          exercise.notes ?? 'Debe sentirse retador pero repetible.'
        ],
    commonMistakes: toItems(exercise.commonMistakes).length
      ? toItems(exercise.commonMistakes)
      : [
          'Apurar repeticiones cuando la técnica ya se rompió.',
          'Aumentar intensidad antes de calentar bien.',
          'Ignorar dolor o molestias que cambian tu movimiento.'
        ],
    stopIf: toItems(exercise.stopIf).length
      ? toItems(exercise.stopIf)
      : [
          'El dolor sube a 3/10 o aparece dolor punzante.',
          'Pierdes coordinación, agarre o control corporal.',
          'La técnica se rompe aunque descanses.'
        ],
    alternative:
      exercise.alternative ??
      'Reduce intensidad, baja volumen o cambia a movilidad y técnica sin dolor.',
    regressions: toItems(exercise.regressions).length
      ? toItems(exercise.regressions)
      : ['Reduce rango, volumen o intensidad y conserva técnica limpia.'],
    progressions: toItems(exercise.progressions).length
      ? toItems(exercise.progressions)
      : ['Sube solo una variable cuando termines con margen y sin dolor.'],
    equipment:
      exercise.requiredEquipment?.length
        ? exercise.requiredEquipment.join(', ')
        : exercise.equipment ?? 'Equipo indicado por tu plan y tu contexto disponible.'
  };
}

export function ExerciseGuide({ exercise, contextLabel }: ExerciseGuideProps) {
  const [open, setOpen] = useState(false);
  const [character, setCharacter] = useState<'bill' | 'senda'>('bill');

  useEffect(() => {
    const profile = loadProfile();
    if (profile?.character === 'senda' || profile?.character === 'bill') {
      setCharacter(profile.character);
    }
  }, []);

  const characterName = character === 'senda' ? 'Senda' : 'Bill';
  const params = new URLSearchParams({
    character,
    ask: buildExerciseQuestion(exercise, contextLabel, character)
  });
  const guide = buildGuide(exercise);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-brand-cyan/24 px-2.5 py-2 text-xs font-bold text-brand-cyan transition hover:bg-brand-cyan/10"
        aria-label={`Abrir guía de ${exercise.name}`}
        title="Guía"
      >
        <BookOpen aria-hidden="true" size={15} />
        Guía
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/64 p-3 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Guía de ${exercise.name}`}
        >
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-lg border border-white/10 bg-brand-dark p-4 shadow-2xl sm:max-w-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-cyan">Guía de ejercicio</p>
                <h2 className="mt-1 text-2xl font-bold">{exercise.name}</h2>
                {contextLabel ? (
                  <p className="mt-1 text-xs font-semibold text-white/46">{contextLabel}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-white/12 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar guía"
                title="Cerrar"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">
                <GuideMetric label="Series" value={exercise.sets ? String(exercise.sets) : null} />
                <GuideMetric label="Dosis" value={exercise.prescription ?? exercise.reps ?? exercise.duration ?? null} />
                <GuideMetric label="Descanso" value={exercise.rest} />
                <GuideMetric label="Intensidad" value={exercise.intensityPercent ?? exercise.rpeTarget ?? exercise.intensity} />
                <GuideMetric label="Riesgo" value={exercise.riskLevel ?? null} />
                <GuideMetric label="Equipo" value={guide.equipment} />
              </div>

              {exercise.category ? (
                <div className="rounded-md border border-brand-cyan/18 bg-brand-cyan/8 px-3 py-2 text-xs font-bold text-brand-cyan">
                  Categoría: {exercise.category}
                </div>
              ) : null}

              {exercise.videoUrl ? (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-brand-cyan/24 bg-brand-cyan/10 p-3 text-sm font-bold text-brand-cyan"
                >
                  Ver video de referencia
                </a>
              ) : null}

              <VisualGuideCard icon={Target} title="Objetivo" items={[guide.objective]} />
              <VisualGuideCard icon={ListChecks} title="Paso a paso" items={guide.howTo} />
              <VisualGuideCard icon={HeartPulse} title="Qué debes sentir" items={guide.feelCues} />
              <VisualGuideCard
                icon={AlertTriangle}
                title="Errores comunes"
                items={guide.commonMistakes}
                tone="warning"
              />
              <VisualGuideCard icon={Activity} title="Señales para parar" items={guide.stopIf} tone="danger" />
              <VisualGuideCard icon={RefreshCw} title="Regresión" items={guide.regressions} />
              <VisualGuideCard icon={Activity} title="Progresión" items={guide.progressions} />
              <VisualGuideCard icon={RefreshCw} title="Alternativa" items={[guide.alternative]} />
              {exercise.sourceConcept ? (
                <VisualGuideCard icon={BookOpen} title="Concepto fuente" items={[exercise.sourceConcept]} />
              ) : null}

              <Link
                href={`/chat?${params.toString()}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/12 px-4 py-3 text-sm font-bold text-white/76 transition hover:border-brand-cyan/40 hover:bg-brand-cyan/10 hover:text-brand-cyan"
                onClick={() => setOpen(false)}
              >
                <MessageCircleQuestion aria-hidden="true" size={17} />
                Preguntar a {characterName}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function VisualGuideCard({
  icon: Icon,
  title,
  items,
  tone = 'neutral'
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  const toneClassName =
    tone === 'danger'
      ? 'border-red-400/24 bg-red-400/10 text-red-100'
      : tone === 'warning'
        ? 'border-brand-mustard/24 bg-brand-mustard/10 text-brand-mustard'
        : 'border-white/10 bg-white/[0.04] text-brand-cyan';

  return (
    <section className={`rounded-md border p-3 ${toneClassName}`}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white/8">
          <Icon aria-hidden="true" size={17} strokeWidth={2.4} />
        </span>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em]">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-white/74">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GuideMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-2">
      <p className="inline-flex items-center gap-1 text-xs font-semibold text-white/42">
        {label === 'Equipo' ? <Package aria-hidden="true" size={12} /> : null}
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white/82">{value ?? '-'}</p>
    </div>
  );
}
