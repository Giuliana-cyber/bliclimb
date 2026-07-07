'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Dumbbell,
  HeartPulse,
  Mountain,
  Sparkles,
  Target,
  UserRound,
  Zap
} from 'lucide-react';
import { saveProfile, type UserProfile } from '@/lib/profile';
import { loadLocalSession } from '@/lib/session';
import { Card } from '@/components/ui/Card';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import {
  ONBOARDING_DRAFT_DEBOUNCE_MS,
  clearDraft,
  initialForm,
  readDraft,
  writeDraft,
  type OnboardingForm
} from './onboarding-draft';

type DurationChoice = OnboardingForm['durationChoice'];

type Option = { label: string; value: string; helper?: string };

const climbingTimeOptions: Option[] = [
  { label: '<3 meses', value: 'start' },
  { label: '<1 año', value: 'less1' },
  { label: '1-3 años', value: '1to3' },
  { label: '3+ años', value: 'more3' }
];

const disciplineOptions: Option[] = [
  { label: 'Boulder', value: 'boulder' },
  { label: 'Deportiva', value: 'sport' },
  { label: 'Trad', value: 'trad' },
  { label: 'Todo', value: 'all' },
  { label: 'No sé', value: 'unsure' }
];

const levelOptions: Option[] = [
  { label: 'No sé mis grados', value: 'none' },
  { label: 'V0-V2 / 5.6-5.9', value: 'beginner' },
  { label: 'V3-V5 / 5.10-5.11', value: 'intermediate' },
  { label: 'V6-V8 / 5.12-5.13', value: 'advanced' },
  { label: 'V9+ / 5.14+', value: 'elite' }
];

const settingOptions: Option[] = [
  { label: 'Indoor', value: 'indoor' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Ambos', value: 'both' }
];

const ageOptions: Option[] = [
  { label: '<16', value: 'u16' },
  { label: '16-25', value: '16-25' },
  { label: '26-35', value: '26-35' },
  { label: '36-45', value: '36-45' },
  { label: '46+', value: '46+' }
];

const sexOptions: Option[] = [
  { label: 'Hombre', value: 'male' },
  { label: 'Mujer', value: 'female' },
  { label: 'Prefiero no decir', value: 'na' }
];

const injuryOptions: Option[] = [
  { label: 'No, estoy bien', value: 'none' },
  { label: 'Dedos/manos', value: 'fingers' },
  { label: 'Codos', value: 'elbows' },
  { label: 'Hombros', value: 'shoulders' },
  { label: 'Rodillas', value: 'knees' },
  { label: 'Espalda', value: 'back' },
  { label: 'Muñecas', value: 'wrists' },
  { label: 'Otra zona', value: 'other' },
  { label: 'Regresando de lesión', value: 'returning' }
];

const warmupOptions: Option[] = [
  { label: 'Siempre', value: 'always' },
  { label: 'A veces', value: 'sometimes' },
  { label: 'Casi nunca', value: 'rarely' }
];

const sleepOptions: Option[] = [
  { label: 'Bien (7-9 hrs)', value: 'good' },
  { label: 'Regular (5-7 hrs)', value: 'regular' },
  { label: 'Mal (<5 hrs)', value: 'bad' }
];

const energyOptions: Option[] = [
  { label: 'Alta', value: 'high' },
  { label: 'Normal', value: 'normal' },
  { label: 'Baja', value: 'low' },
  { label: 'Variable', value: 'variable' }
];

const daysOptions = [
  { label: '1-2', value: 2 },
  { label: '3', value: 3 },
  { label: '4-5', value: 5 },
  { label: '6+', value: 6 }
];

const availableDayOptions: Option[] = [
  { label: 'Lun', value: 'monday' },
  { label: 'Mar', value: 'tuesday' },
  { label: 'Mié', value: 'wednesday' },
  { label: 'Jue', value: 'thursday' },
  { label: 'Vie', value: 'friday' },
  { label: 'Sáb', value: 'saturday' },
  { label: 'Dom', value: 'sunday' }
];

const sessionDurationOptions = [
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
  { label: '90 min', value: 90 },
  { label: '120 min', value: 120 }
];

const painScaleOptions = [0, 1, 2, 3, 4, 5];

const equipmentOptions: Option[] = [
  { label: 'Gym de escalada', value: 'gym' },
  { label: 'Hangboard', value: 'hangboard' },
  { label: 'Campus board', value: 'campus' },
  { label: 'Gym de pesas', value: 'weights' },
  { label: 'Solo roca', value: 'rock' },
  { label: 'Casa sin equipo', value: 'home' },
  { label: 'Bandas elásticas', value: 'bands' },
  { label: 'Barra de dominadas', value: 'pullup_bar' },
  { label: 'TRX / anillas', value: 'trx' }
];

const previousTrainingOptions: Option[] = [
  { label: 'Nunca', value: 'never' },
  { label: 'Sí pero informal', value: 'informal' },
  { label: 'Sí con estructura', value: 'structured' },
  { label: 'Sí con entrenador', value: 'coach' }
];

const pullUpAbilityOptions: Option[] = [
  { label: 'No sé / no hago', value: 'unknown' },
  { label: '0 estrictas', value: 'none' },
  { label: '1-3 estrictas', value: '1to3' },
  { label: '4-8 estrictas', value: '4to8' },
  { label: '9+ estrictas', value: '9plus' },
  { label: 'Con peso', value: 'weighted' }
];

const trainingExperienceOptions: Option[] = [
  { label: 'No sé', value: 'unknown' },
  { label: 'Nunca', value: 'none' },
  { label: 'Poca', value: 'light' },
  { label: 'Estructurada', value: 'structured' },
  { label: 'Avanzada', value: 'advanced' }
];

const campusExperienceOptions: Option[] = [
  { label: 'Nunca', value: 'none' },
  { label: 'Pocas veces', value: 'light' },
  { label: 'Con estructura', value: 'structured' },
  { label: 'Avanzada', value: 'advanced' }
];

const outdoorFrequencyOptions: Option[] = [
  { label: 'Casi nunca', value: 'rarely' },
  { label: '1 vez/mes', value: 'monthly' },
  { label: '1 vez/semana', value: 'weekly' },
  { label: 'Varias/semana', value: 'multiple_weekly' }
];

const trainingAggressivenessOptions: Option[] = [
  { label: 'Conservador', value: 'conservative' },
  { label: 'Balanceado', value: 'balanced' },
  { label: 'Retador', value: 'aggressive' }
];

const goalOptions: Option[] = [
  { label: 'Subir de grado en general', value: 'grade' },
  { label: 'Encadenar un proyecto específico', value: 'project' },
  { label: 'Mejorar técnica', value: 'technique' },
  { label: 'Ganar fuerza de dedos', value: 'fingers' },
  { label: 'Mejorar resistencia', value: 'endurance' },
  { label: 'Prepararme para competir', value: 'compete' },
  { label: 'Prevenir lesiones', value: 'injury_prevention' },
  { label: 'Volver después de lesión/pausa', value: 'return' },
  { label: 'Otro / más específico', value: 'other' }
];

const durationOptions: Array<{ label: string; value: DurationChoice }> = [
  { label: '2 semanas', value: '2' },
  { label: '3 semanas', value: '3' },
  { label: '4 semanas', value: '4' },
  { label: 'Solo quiero empezar', value: 'starter' }
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? 'Pendiente';
}

function getLabels(options: Option[], values: string[]) {
  if (!values.length) return 'Pendiente';
  return values.map((value) => getLabel(options, value)).join(' + ');
}

function getGoalSummary(goals: string[], goalDescription: string) {
  const selectedGoals = getLabels(goalOptions, goals);
  const description = goalDescription.trim();
  if (description && goals.length) return `${selectedGoals} · ${description}`;
  if (description) return description;
  return selectedGoals;
}

function toOptionalNumber(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && value.trim() !== '' ? parsedValue : null;
}

function toOptionalInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function createId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `profile-${Date.now()}`;
}

function toggleExclusiveList(currentValues: string[], value: string, exclusiveValues: string[]) {
  const isActive = currentValues.includes(value);
  if (isActive) return currentValues.filter((item) => item !== value);
  if (exclusiveValues.includes(value)) return [value];
  return [...currentValues.filter((item) => !exclusiveValues.includes(item)), value];
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
        'group flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all duration-150 active:scale-[0.99]',
        active
          ? 'border-brand-cyan/60 bg-brand-cyan/[0.12] text-brand-cyan shadow-glow'
          : 'border-white/10 bg-white/[0.03] text-white/78 hover:border-white/22 hover:bg-white/[0.05]'
      )}
    >
      <span>{children}</span>
      {active ? <Check aria-hidden="true" size={17} strokeWidth={2.8} /> : null}
    </button>
  );
}

function StepSection({
  number,
  title,
  children,
  icon: Icon,
  done
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  icon: typeof UserRound;
  done: boolean;
}) {
  return (
    <section className="py-8 first:pt-4">
      <Card className="space-y-7 p-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-2xl transition',
              done
                ? 'bg-gradient-cyan text-brand-dark shadow-glow'
                : 'bg-brand-cyan/14 text-brand-cyan'
            )}
          >
            {done ? (
              <Check aria-hidden="true" size={20} strokeWidth={3} />
            ) : (
              <Icon aria-hidden="true" size={20} strokeWidth={2.3} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-mustard">
              Paso {number} de 7
            </p>
            <h2 className="mt-0.5 text-xl font-extrabold leading-tight">{title}</h2>
          </div>
        </div>
        {children}
      </Card>
    </section>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  // Draft state:
  // - ownerId: session.id de la cuenta actual, o null si aún no la resolvimos
  //   / no hay sesión. Sin ownerId no autosaveamos (no queremos drafts huérfanos).
  // - draftReady: true una vez terminado el intento de rehidratación al montar.
  //   Sin esto, el autosave se dispararía en el primer render con `initialForm`
  //   y pisaría un draft válido antes de que lo leamos.
  // - rehydrated: true si el form arrancó con datos guardados. Dispara el
  //   banner "Retomamos donde quedaste" y se apaga con "Empezar de nuevo".
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    // Resolver dueño del draft de forma síncrona: loadLocalSession() lee
    // localStorage/cookie, no toca red. Si no hay sesión, no rehidratamos
    // ni autosaveamos — el draft debe estar atado a un usuario concreto
    // para evitar filtrar datos de salud entre cuentas del mismo navegador.
    const session = loadLocalSession();
    const id = session?.id ?? null;
    setOwnerId(id);
    if (id) {
      const draft = readDraft(id);
      if (draft) {
        setForm((current) => ({ ...current, ...draft }));
        setRehydrated(true);
      }
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    // Autosave con debounce: cada cambio en `form` reinicia el timer.
    // Cero autosave hasta terminar la rehidratación y sin ownerId.
    if (!draftReady || !ownerId) return;
    const timeout = window.setTimeout(() => {
      writeDraft(ownerId, form);
    }, ONBOARDING_DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [form, draftReady, ownerId]);

  function handleReset() {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Vas a borrar todo lo que llevas del onboarding. Esta acción no se puede deshacer. ¿Continuar?'
      );
      if (!confirmed) return;
    }
    if (ownerId) clearDraft(ownerId);
    setForm(initialForm);
    setRehydrated(false);
  }

  const stepsDone = useMemo(() => {
    return {
      1: Boolean(form.character),
      2: Boolean(form.climbingTime && form.disciplines.length && form.level && form.setting),
      3: Boolean(form.age && form.sex),
      4: Boolean(form.injuries.length && form.warmup && form.sleep && form.energy),
      5: Boolean(
        form.daysPerWeek &&
          form.availableDays.length &&
          form.sessionDuration &&
          form.equipment.length &&
          form.previousTraining
      ),
      6: Boolean((form.goals.length || form.goalDescription.trim()) && form.durationChoice),
      7: true
    };
  }, [form]);

  const completedSteps = Object.values(stepsDone).filter(Boolean).length;
  const canSubmit = completedSteps === 7;
  const progressPercent = (completedSteps / 7) * 100;

  const durationWeeks = form.durationChoice === 'starter' ? 4 : Number(form.durationChoice);
  const daysLabel = daysOptions.find((option) => option.value === form.daysPerWeek)?.label;
  const durationLabel =
    durationOptions.find((option) => option.value === form.durationChoice)?.label ?? 'Pendiente';

  async function handleSubmit() {
    if (!canSubmit) return;

    const now = new Date().toISOString();
    const goals = form.goals.length ? form.goals : ['other'];
    const profile: UserProfile = {
      id: createId(),
      character: form.character,
      name: form.name.trim(),
      age: form.age,
      sex: form.sex,
      weight: toOptionalNumber(form.weight),
      height: toOptionalNumber(form.height),
      climbingTime: form.climbingTime,
      disciplines: form.disciplines,
      level: form.level,
      setting: form.setting,
      injuries: form.injuries,
      injuryNotes: form.injuryNotes.trim(),
      warmup: form.warmup,
      sleep: form.sleep,
      energy: form.energy,
      daysPerWeek: form.daysPerWeek,
      availableDays: form.availableDays,
      sessionDuration: form.sessionDuration,
      maxSessionDuration: form.maxSessionDuration,
      equipment: form.equipment,
      equipmentNotes: form.equipmentNotes.trim(),
      previousTraining: form.previousTraining,
      trainingHistory: form.previousTraining,
      accessToCampusBoard: form.equipment.includes('campus'),
      accessToHangboard: form.equipment.includes('hangboard'),
      accessToTRX: form.equipment.includes('trx'),
      accessToWeights: form.equipment.includes('weights'),
      pullUpAbility: form.pullUpAbility || 'unknown',
      fingerTrainingExperience: form.fingerTrainingExperience || 'unknown',
      campusExperience: form.campusExperience || 'none',
      currentFingerPain: form.currentFingerPain,
      currentShoulderPain: form.currentShoulderPain,
      currentElbowPain: form.currentElbowPain,
      wantsConservativePlan: form.trainingAggressiveness === 'conservative',
      trainingAggressiveness: form.trainingAggressiveness,
      outdoorFrequency: form.outdoorFrequency || 'unknown',
      pullupsBodyweight: toOptionalInt(form.pullupsBodyweight),
      pullupsAddedWeight5Reps: toOptionalInt(form.pullupsAddedWeight5Reps),
      hangboard20mmSeconds: toOptionalInt(form.hangboard20mmSeconds),
      hangboard20mmAddedWeight7s: toOptionalInt(form.hangboard20mmAddedWeight7s),
      benchPress1Rm: toOptionalInt(form.benchPress1Rm),
      squat1Rm: toOptionalInt(form.squat1Rm),
      deadlift1Rm: toOptionalInt(form.deadlift1Rm),
      goal: goals[0],
      goals,
      goalDescription: form.goalDescription.trim(),
      project: form.project.trim(),
      projectDescription: form.project.trim(),
      rockProjectDescription: form.rockProjectDescription.trim() || form.project.trim(),
      sleepQuality: form.sleep,
      energyLevel: form.energy,
      injuryDescription: form.injuryNotes.trim(),
      planDuration: durationWeeks,
      createdAt: now,
      updatedAt: now
    };

    saveProfile(profile);

    // Draft cumplió su función — se borra SIEMPRE al submit exitoso para
    // que no quede huérfano en el navegador (contiene datos de salud:
    // lesiones, dolor, sueño). Va antes del POST/redirect: si algo
    // falla después, `profile` ya está en localStorage vía saveProfile.
    if (ownerId) clearDraft(ownerId);

    // Persist to Supabase. saveProfile() solo escribe a localStorage; sin
    // este POST, public.profiles queda con todos los campos en null y los
    // gates/RAG/coach panel no ven nada del onboarding.
    //
    // Esperamos a que termine (con timeout corto) para no perder datos
    // si el usuario tiene red lenta y la página de generating-plan
    // empieza a leer el perfil server-side. Si falla, navegamos igual
    // — localStorage está intacto y el reconciliador puede reintentar.
    const dbPayload = {
      character: profile.character,
      name: profile.name,
      age: profile.age,
      sex: profile.sex,
      weight: profile.weight,
      height: profile.height,
      climbingTime: profile.climbingTime,
      level: profile.level,
      goals: profile.goals,
      goalDescription: profile.goalDescription,
      project: profile.project,
      projectDescription: profile.projectDescription,
      trainingHistory: profile.trainingHistory,
      previousTraining: profile.previousTraining,
      equipment: profile.equipment,
      equipmentNotes: profile.equipmentNotes,
      daysPerWeek: profile.daysPerWeek,
      sessionDuration: profile.sessionDuration,
      planDuration: profile.planDuration,
      injuries: profile.injuries,
      injuryDescription: profile.injuryDescription,
      injuryNotes: profile.injuryNotes,
      currentFingerPain: profile.currentFingerPain,
      currentShoulderPain: profile.currentShoulderPain,
      currentElbowPain: profile.currentElbowPain,
      wantsConservativePlan: profile.wantsConservativePlan,
      trainingAggressiveness: profile.trainingAggressiveness,
      energyLevel: profile.energyLevel,
      energy: profile.energy,
      sleepQuality: profile.sleepQuality,
      sleep: profile.sleep,
      pullupsBodyweight: profile.pullupsBodyweight,
      pullupsAddedWeight5Reps: profile.pullupsAddedWeight5Reps,
      hangboard20mmSeconds: profile.hangboard20mmSeconds,
      hangboard20mmAddedWeight7s: profile.hangboard20mmAddedWeight7s,
      benchPress1Rm: profile.benchPress1Rm,
      squat1Rm: profile.squat1Rm,
      deadlift1Rm: profile.deadlift1Rm
    };
    try {
      // eslint-disable-next-line no-console
      console.log('[onboarding] POST /api/profile', {
        fields: Object.keys(dbPayload).filter(
          (k) => (dbPayload as Record<string, unknown>)[k] !== undefined
        ).length
      });
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
        keepalive: true
      });
      // eslint-disable-next-line no-console
      console.log('[onboarding] /api/profile response', {
        status: res.status,
        ok: res.ok
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        // eslint-disable-next-line no-console
        console.warn('[onboarding] /api/profile failed', errBody);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[onboarding] /api/profile threw', error);
    }

    router.push('/generating-plan');
  }

  return (
    <main className="min-h-screen text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-glow"
      />

      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-brand-dark/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">
                BilClimb.ai
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold">Onboarding</h1>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.10em] text-white/50">
                Pasos
              </p>
              <p className="text-lg font-extrabold text-brand-cyan">
                {completedSteps}<span className="text-white/40">/7</span>
              </p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-cyan shadow-glow transition-[width] duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {rehydrated ? (
            <div
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-cyan/25 bg-brand-cyan/[0.08] px-3 py-2 text-xs"
              data-testid="onboarding-rehydrated-banner"
            >
              <p className="font-bold text-brand-cyan">
                Retomamos donde quedaste. Tus respuestas están guardadas.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-white/10 px-2.5 py-1 font-bold text-white/72 transition hover:border-white/30 hover:text-white"
              >
                Empezar de nuevo
              </button>
            </div>
          ) : ownerId ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-[0.68rem] font-bold uppercase tracking-[0.10em] text-white/40 transition hover:text-white/70"
              >
                Empezar de nuevo
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-16">
        <StepSection number={1} title="Elige tu compañer@" icon={Sparkles} done={stepsDone[1]}>
          <p className="text-base font-bold">¿Con quién quieres entrenar?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <CharacterCard
              active={form.character === 'bill'}
              character="bill"
              name="Bill"
              description="Entrenamiento general, fuerza, periodización."
              onClick={() => setForm((current) => ({ ...current, character: 'bill' }))}
            />
            <CharacterCard
              active={form.character === 'senda'}
              character="senda"
              name="Senda"
              description="Entrenamiento general + especialista en escalada femenina."
              onClick={() => setForm((current) => ({ ...current, character: 'senda' }))}
            />
          </div>
        </StepSection>

        <StepSection number={2} title="Tu escalada" icon={Mountain} done={stepsDone[2]}>
          <FieldGroup title="¿Cuánto tiempo llevas escalando?">
            <OptionGrid>
              {climbingTimeOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.climbingTime === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, climbingTime: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="¿Qué tipo de escalada practicas?" hint="Selecciona varias">
            <OptionGrid>
              {disciplineOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.disciplines.includes(option.value)}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      disciplines: toggleExclusiveList(current.disciplines, option.value, [
                        'all',
                        'unsure'
                      ])
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="¿Cuál es tu nivel?">
            <OptionGrid>
              {levelOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.level === option.value}
                  onClick={() => setForm((current) => ({ ...current, level: option.value }))}
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="¿Dónde escalas más?">
            <OptionGrid>
              {settingOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.setting === option.value}
                  onClick={() => setForm((current) => ({ ...current, setting: option.value }))}
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>
        </StepSection>

        <StepSection number={3} title="Sobre ti" icon={UserRound} done={stepsDone[3]}>
          <FieldGroup title="Rango de edad">
            <OptionGrid>
              {ageOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.age === option.value}
                  onClick={() => setForm((current) => ({ ...current, age: option.value }))}
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="Sexo biológico" hint="Para temas de salud">
            <OptionGrid>
              {sexOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.sex === option.value}
                  onClick={() => setForm((current) => ({ ...current, sex: option.value }))}
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Peso aproximado (kg)"
              optional
              value={form.weight}
              inputMode="decimal"
              onChange={(value) => setForm((current) => ({ ...current, weight: value }))}
            />
            <InputField
              label="Estatura (cm)"
              optional
              value={form.height}
              inputMode="decimal"
              onChange={(value) => setForm((current) => ({ ...current, height: value }))}
            />
          </div>
        </StepSection>

        <StepSection number={4} title="Tu cuerpo" icon={HeartPulse} done={stepsDone[4]}>
          <FieldGroup title="¿Tienes alguna lesión o molestia?" hint="Selecciona todas">
            <OptionGrid>
              {injuryOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.injuries.includes(option.value)}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      injuries: toggleExclusiveList(current.injuries, option.value, ['none'])
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <TextareaField
            label="Si tienes lesión, descríbela brevemente"
            value={form.injuryNotes}
            placeholder="Me duele el anular de la mano izquierda desde hace 2 semanas cuando crimpo fuerte..."
            onChange={(value) => setForm((current) => ({ ...current, injuryNotes: value }))}
          />

          <PainScaleField
            title="Dolor de dedos hoy"
            value={form.currentFingerPain}
            onChange={(value) => setForm((current) => ({ ...current, currentFingerPain: value }))}
          />

          <PainScaleField
            title="Dolor de hombro hoy"
            value={form.currentShoulderPain}
            onChange={(value) =>
              setForm((current) => ({ ...current, currentShoulderPain: value }))
            }
          />

          <PainScaleField
            title="Dolor de codo hoy"
            value={form.currentElbowPain}
            onChange={(value) => setForm((current) => ({ ...current, currentElbowPain: value }))}
          />

          <FieldGroup title="¿Calientas antes de escalar?">
            <OptionGrid>
              {warmupOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.warmup === option.value}
                  onClick={() => setForm((current) => ({ ...current, warmup: option.value }))}
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="¿Cómo duermes normalmente?">
            <OptionGrid>
              {sleepOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.sleep === option.value}
                  onClick={() => setForm((current) => ({ ...current, sleep: option.value }))}
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="¿Cómo es tu energía general?">
            <OptionGrid>
              {energyOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.energy === option.value}
                  onClick={() => setForm((current) => ({ ...current, energy: option.value }))}
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>
        </StepSection>

        <StepSection number={5} title="Tu entrenamiento" icon={Dumbbell} done={stepsDone[5]}>
          <FieldGroup title="¿Cuántos días por semana puedes entrenar?">
            <OptionGrid>
              {daysOptions.map((option) => (
                <OptionButton
                  key={option.label}
                  active={form.daysPerWeek === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, daysPerWeek: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="¿Qué días sueles tener disponibles?">
            <div className="grid grid-cols-7 gap-2">
              {availableDayOptions.map((option) => {
                const active = form.availableDays.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        availableDays: current.availableDays.includes(option.value)
                          ? current.availableDays.filter((item) => item !== option.value)
                          : [...current.availableDays, option.value]
                      }))
                    }
                    className={cn(
                      'grid h-12 place-items-center rounded-xl border text-sm font-bold transition active:scale-[0.97]',
                      active
                        ? 'border-brand-cyan/60 bg-brand-cyan/15 text-brand-cyan shadow-glow'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/22'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          <FieldGroup title="¿Cuánto dura normalmente tu sesión?">
            <OptionGrid columns={3}>
              {sessionDurationOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.sessionDuration === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, sessionDuration: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="Máximo real si una sesión se alarga">
            <OptionGrid columns={3}>
              {sessionDurationOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.maxSessionDuration === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, maxSessionDuration: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="¿A qué tienes acceso?" hint="Selecciona todo">
            <OptionGrid>
              {equipmentOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.equipment.includes(option.value)}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      equipment: current.equipment.includes(option.value)
                        ? current.equipment.filter((item) => item !== option.value)
                        : [...current.equipment, option.value]
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <TextareaField
            label="Describe tu setup"
            value={form.equipmentNotes}
            placeholder="Voy a Adamanta 3 veces por semana, tengo un Beastmaker 1000 en casa y bandas de resistencia..."
            onChange={(value) => setForm((current) => ({ ...current, equipmentNotes: value }))}
          />

          <FieldGroup title="¿Has seguido algún plan de entrenamiento antes?">
            <OptionGrid>
              {previousTrainingOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.previousTraining === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, previousTraining: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="Dominadas estrictas actuales">
            <OptionGrid columns={3}>
              {pullUpAbilityOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.pullUpAbility === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, pullUpAbility: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="Experiencia entrenando dedos">
            <OptionGrid>
              {trainingExperienceOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.fingerTrainingExperience === option.value}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      fingerTrainingExperience: option.value
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="Experiencia con campus board">
            <OptionGrid>
              {campusExperienceOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.campusExperience === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, campusExperience: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup title="Frecuencia en roca">
            <OptionGrid>
              {outdoorFrequencyOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.outdoorFrequency === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, outdoorFrequency: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <StrengthFields form={form} setForm={setForm} />

          <FieldGroup title="Qué tan agresivo quieres el plan">
            <OptionGrid columns={3}>
              {trainingAggressivenessOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.trainingAggressiveness === option.value}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      trainingAggressiveness: option.value
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>
        </StepSection>

        <StepSection number={6} title="Tu objetivo" icon={Target} done={stepsDone[6]}>
          <FieldGroup title="¿Qué objetivos quieres trabajar?" hint="Selecciona varios">
            <OptionGrid>
              {goalOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.goals.includes(option.value)}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      goals: current.goals.includes(option.value)
                        ? current.goals.filter((item) => item !== option.value)
                        : [...current.goals, option.value]
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <TextareaField
            label="Redacta lo que buscas"
            value={form.goalDescription}
            placeholder="Quiero sentirme más fuerte en desplomes, mejorar lectura de boulder y llegar sin dolor de dedos a mi viaje de roca..."
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                goalDescription: value,
                goals: value.trim() && !current.goals.length ? ['other'] : current.goals
              }))
            }
          />

          <TextareaField
            label="¿Tienes un proyecto o ruta específica?"
            value={form.project}
            placeholder="Quiero encadenar La Catrina 5.12a en El Salto antes de diciembre"
            onChange={(value) => setForm((current) => ({ ...current, project: value }))}
          />

          <TextareaField
            label="Contexto del proyecto en roca"
            value={form.rockProjectDescription}
            placeholder="Tipo de ruta, estilo, crux, agarres, desplome/placa, fecha del viaje, miedos o limitantes..."
            onChange={(value) =>
              setForm((current) => ({ ...current, rockProjectDescription: value }))
            }
          />

          <FieldGroup title="¿En cuántas semanas quieres ver resultados?">
            <OptionGrid columns={2}>
              {durationOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  active={form.durationChoice === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, durationChoice: option.value }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>
        </StepSection>

        <StepSection number={7} title="Resumen + generar" icon={Zap} done={stepsDone[7]}>
          <InputField
            label="¿Cómo te llamas?"
            optional
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />

          <div className="rounded-2xl border border-white/8 bg-gradient-card p-5">
            <h3 className="text-base font-extrabold">Resumen de tu perfil</h3>
            <dl className="mt-5 grid gap-3 text-sm">
              <SummaryRow label="Compañer@" value={form.character === 'bill' ? 'Bill' : 'Senda'} />
              <SummaryRow
                label="Experiencia"
                value={getLabel(climbingTimeOptions, form.climbingTime)}
              />
              <SummaryRow label="Nivel" value={getLabel(levelOptions, form.level)} />
              <SummaryRow
                label="Objetivo"
                value={getGoalSummary(form.goals, form.goalDescription)}
              />
              <SummaryRow
                label="Días"
                value={
                  daysLabel
                    ? `${daysLabel}/semana · ${getLabels(availableDayOptions, form.availableDays)}`
                    : 'Pendiente'
                }
              />
              <SummaryRow label="Duración sesión" value={`${form.sessionDuration} min`} />
              <SummaryRow label="Equipo" value={getLabels(equipmentOptions, form.equipment)} />
              <SummaryRow label="Lesión" value={getLabels(injuryOptions, form.injuries)} />
              <SummaryRow
                label="Dolor actual"
                value={`Dedos ${form.currentFingerPain}/5 · hombro ${form.currentShoulderPain}/5 · codo ${form.currentElbowPain}/5`}
              />
              <SummaryRow
                label="Carga"
                value={getLabel(trainingAggressivenessOptions, form.trainingAggressiveness)}
              />
              <SummaryRow label="Duración" value={durationLabel} />
            </dl>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              'flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-extrabold transition-all duration-150',
              canSubmit
                ? 'bg-gradient-cyan text-brand-dark shadow-glow-strong hover:brightness-110 active:scale-[0.99]'
                : 'cursor-not-allowed bg-white/[0.06] text-white/35'
            )}
          >
            Generar mi plan de entrenamiento
            <ArrowRight aria-hidden="true" size={20} strokeWidth={2.8} />
          </button>

          {!canSubmit ? (
            <p className="text-center text-xs text-white/55">
              Te faltan {7 - completedSteps} {7 - completedSteps === 1 ? 'paso' : 'pasos'} para
              poder generar el plan.
            </p>
          ) : null}
        </StepSection>
      </div>
    </main>
  );
}

function CharacterCard({
  active,
  character,
  name,
  description,
  onClick
}: {
  active: boolean;
  character: 'bill' | 'senda';
  name: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 active:scale-[0.99]',
        active
          ? 'border-brand-cyan/60 bg-brand-cyan/[0.08] shadow-glow'
          : 'border-white/10 bg-white/[0.03] hover:border-white/22 hover:bg-white/[0.05]'
      )}
    >
      <div className="mb-4 grid h-44 place-items-end overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
        <CharacterAvatar character={character} variant="full" className="h-44 w-auto mx-auto" />
      </div>
      <h3 className="text-xl font-extrabold">{name}</h3>
      <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>
    </button>
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
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm font-extrabold text-white">{title}</p>
        {hint ? (
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.10em] text-white/45">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function OptionGrid({
  children,
  columns = 2
}: {
  children: React.ReactNode;
  columns?: 2 | 3;
}) {
  const classes = columns === 3 ? 'grid gap-2 grid-cols-3' : 'grid gap-2 sm:grid-cols-2';
  return <div className={classes}>{children}</div>;
}

function PainScaleField({
  title,
  value,
  onChange
}: {
  title: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <FieldGroup title={title} hint="0 sin dolor · 5 fuerte">
      <div className="grid grid-cols-6 gap-2">
        {painScaleOptions.map((score) => {
          const active = value === score;
          const intensity = score / 5;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'grid h-11 place-items-center rounded-xl border text-sm font-extrabold transition active:scale-[0.97]',
                active
                  ? 'border-brand-coral/60 text-brand-coral shadow-glow'
                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/22'
              )}
              style={
                active
                  ? {
                      background: `linear-gradient(180deg, rgba(255,122,89,${0.10 + intensity * 0.18}) 0%, rgba(255,122,89,${0.04 + intensity * 0.08}) 100%)`
                    }
                  : undefined
              }
            >
              {score}
            </button>
          );
        })}
      </div>
    </FieldGroup>
  );
}

function InputField({
  label,
  optional,
  value,
  inputMode,
  placeholder,
  onChange
}: {
  label: string;
  optional?: boolean;
  value: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-extrabold text-white">{label}</span>
        {optional ? (
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.10em] text-white/40">
            Opcional
          </span>
        ) : null}
      </span>
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60 focus:bg-white/[0.05]"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-white">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60 focus:bg-white/[0.05]"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-white/45">{label}</dt>
      <dd className="text-sm font-bold text-white/86">{value}</dd>
    </div>
  );
}

// ---- B1: sub-sección "Fuerza actual" (montada dentro del paso 5) ----

function StrengthFields({
  form,
  setForm
}: {
  form: OnboardingForm;
  setForm: React.Dispatch<React.SetStateAction<OnboardingForm>>;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-brand-cyan/15 bg-brand-cyan/[0.04] p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-cyan">
          Fuerza actual
        </p>
        <p className="mt-2 text-sm leading-6 text-white/72">
          Estos datos ayudan a Bill y Senda a calcular intensidades reales para tu plan. Si
          no sabes alguno, déjalo en blanco — lo iremos calibrando con tus check-ins.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-extrabold text-white">Dominadas</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="A peso corporal (máx reps)"
            value={form.pullupsBodyweight}
            inputMode="numeric"
            placeholder="ej. 12 dominadas"
            onChange={(value) => setForm((current) => ({ ...current, pullupsBodyweight: value }))}
          />
          <InputField
            label="Peso extra para 5 reps (kg)"
            optional
            value={form.pullupsAddedWeight5Reps}
            inputMode="numeric"
            placeholder="ej. 15 kg"
            onChange={(value) =>
              setForm((current) => ({ ...current, pullupsAddedWeight5Reps: value }))
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-extrabold text-white">Suspensión en regleta de 20mm</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Segundos a peso corporal"
            value={form.hangboard20mmSeconds}
            inputMode="numeric"
            placeholder="ej. 15 seg"
            onChange={(value) =>
              setForm((current) => ({ ...current, hangboard20mmSeconds: value }))
            }
          />
          <InputField
            label="Peso extra para 7 seg (kg)"
            optional
            value={form.hangboard20mmAddedWeight7s}
            inputMode="numeric"
            placeholder="ej. 10 kg"
            onChange={(value) =>
              setForm((current) => ({ ...current, hangboard20mmAddedWeight7s: value }))
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-extrabold text-white">Pesas (opcional)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            label="Press banca 1RM (kg)"
            optional
            value={form.benchPress1Rm}
            inputMode="numeric"
            placeholder="ej. 80"
            onChange={(value) => setForm((current) => ({ ...current, benchPress1Rm: value }))}
          />
          <InputField
            label="Sentadilla 1RM (kg)"
            optional
            value={form.squat1Rm}
            inputMode="numeric"
            placeholder="ej. 110"
            onChange={(value) => setForm((current) => ({ ...current, squat1Rm: value }))}
          />
          <InputField
            label="Peso muerto 1RM (kg)"
            optional
            value={form.deadlift1Rm}
            inputMode="numeric"
            placeholder="ej. 140"
            onChange={(value) => setForm((current) => ({ ...current, deadlift1Rm: value }))}
          />
        </div>
      </div>
    </div>
  );
}
