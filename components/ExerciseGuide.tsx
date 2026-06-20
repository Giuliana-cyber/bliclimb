'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const profile = loadProfile();
    if (profile?.character === 'senda' || profile?.character === 'bill') {
      setCharacter(profile.character);
    }
  }, []);

  // Bloquear scroll del body + ESC + focus trap mientras el modal está abierto.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    // Foco inicial en el botón de cerrar (target seguro y obvio).
    closeBtnRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

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
        // Overlay full-screen — el click sobre el overlay cierra; el contenido
        // del modal hace stopPropagation. inset-0 + position fixed garantiza
        // que cubra toda la pantalla sin importar el scroll del contenedor.
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            // max-h con 100dvh para que el viewport dinámico de mobile no
            // recorte el footer; padding-bottom respeta la safe-area de la
            // nav inferior cuando el modal está en una pantalla con barra
            // de gestos / home indicator.
            className="flex w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-brand-dark shadow-2xl sm:max-w-xl"
            style={{ maxHeight: 'calc(100dvh - 24px)' }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-cyan">Guía de ejercicio</p>
                <h2 id={titleId} className="mt-1 text-2xl font-bold">
                  {exercise.name}
                </h2>
                {contextLabel ? (
                  <p className="mt-1 text-xs font-semibold text-white/46">{contextLabel}</p>
                ) : null}
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setOpen(false)}
                // Touch target 44×44px en mobile (recomendación WCAG),
                // escala a 40 en pantallas grandes (más densas).
                className="grid size-11 shrink-0 place-items-center rounded-md border border-white/12 text-white/70 transition hover:bg-white/[0.06] hover:text-white sm:size-10"
                aria-label="Cerrar guía"
                title="Cerrar"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div
              className="flex-1 space-y-4 overflow-y-auto p-4"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            >
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <GuideMetric label="Series" value={exercise.sets ? String(exercise.sets) : null} />
                <GuideMetric label="Reps / tiempo" value={exercise.reps ?? exercise.duration ?? null} />
                <GuideMetric label="Descanso" value={exercise.rest} />
                <GuideMetric
                  label="Intensidad"
                  value={exercise.intensityPercent ?? exercise.intensity ?? exercise.rpeTarget ?? null}
                />
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
