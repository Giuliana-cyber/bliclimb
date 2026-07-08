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

// H-03 (audit-360 Bloque 3): dos grids separados. Nos pasamos a un valor
// numérico exacto (no rangos) porque ahora el total combinado es el que
// alimenta el motor — necesitamos precisión, no un bucket.
const climbingDaysOptions = [
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6+', value: 6 }
];
const trainingDaysOptions = [
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 }
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
  // Bloque audit-360 post-diag: si el POST a /api/profile falla, mostramos
  // banner rojo inline y NO navegamos a /generating-plan. Antes hacíamos
  // console.warn silencioso + navegación, y el usuario quedaba sin plan
  // pero sin saber por qué. Ahora se entera en el momento.
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Bloque 4 audit-360: gate simplificado (recortes de warmup/energy en paso 4,
  // previousTraining en paso 5) + gate final útil que lista qué falta.
  const stepsDone = useMemo(() => {
    return {
      1: Boolean(form.character),
      2: Boolean(form.climbingTime && form.disciplines.length && form.level && form.setting),
      3: Boolean(form.age && form.sex),
      4: Boolean(form.injuries.length && form.sleep),
      5: Boolean(
        (form.climbingDaysPerWeek + form.trainingDaysPerWeek) >= 1 &&
          form.availableDays.length &&
          form.sessionDuration &&
          form.equipment.length
      ),
      6: Boolean((form.goals.length || form.goalDescription.trim()) && form.durationChoice),
      7: true
    };
  }, [form]);

  // Bloque 4 audit-360: gate final útil. Cuando falta algo, devolvemos
  // por paso los nombres user-facing de los campos incompletos. Se usa en
  // la lista al pie del paso 7.
  const missingByStep = useMemo(() => {
    const missing: Array<{ step: number; title: string; fields: string[] }> = [];
    if (!form.character) {
      missing.push({ step: 1, title: 'Elige tu compañer@', fields: ['Compañer@'] });
    }
    const step2: string[] = [];
    if (!form.climbingTime) step2.push('Tiempo escalando');
    if (!form.disciplines.length) step2.push('Disciplinas');
    if (!form.level) step2.push('Nivel');
    if (!form.setting) step2.push('Dónde escalas');
    if (step2.length) missing.push({ step: 2, title: 'Tu escalada', fields: step2 });
    const step3: string[] = [];
    if (!form.age) step3.push('Rango de edad');
    if (!form.sex) step3.push('Sexo biológico');
    if (step3.length) missing.push({ step: 3, title: 'Sobre ti', fields: step3 });
    const step4: string[] = [];
    if (!form.injuries.length) step4.push('Lesión activa (sí/no + zona)');
    if (!form.sleep) step4.push('Sueño');
    if (step4.length) missing.push({ step: 4, title: 'Tu cuerpo', fields: step4 });
    const step5: string[] = [];
    if (form.climbingDaysPerWeek + form.trainingDaysPerWeek < 1) step5.push('Días');
    if (!form.availableDays.length) step5.push('Días disponibles');
    if (!form.sessionDuration) step5.push('Duración sesión');
    if (!form.equipment.length) step5.push('Equipo');
    if (step5.length) missing.push({ step: 5, title: 'Tu entrenamiento', fields: step5 });
    const step6: string[] = [];
    if (!form.goals.length && !form.goalDescription.trim()) step6.push('Objetivo');
    if (!form.durationChoice) step6.push('Duración del ciclo');
    if (step6.length) missing.push({ step: 6, title: 'Tu objetivo', fields: step6 });
    return missing;
  }, [form]);

  const completedSteps = Object.values(stepsDone).filter(Boolean).length;
  const canSubmit = completedSteps === 7;
  const progressPercent = (completedSteps / 7) * 100;

  const durationWeeks = form.durationChoice === 'starter' ? 4 : Number(form.durationChoice);
  // H-03: total derivado (escalada + entrenamiento extra). Es el número que
  // ve el motor como `daysPerWeek`. El desglose viaja aparte al prompt.
  const totalDaysPerWeek = form.climbingDaysPerWeek + form.trainingDaysPerWeek;
  const daysLabel = totalDaysPerWeek > 0 ? `${totalDaysPerWeek}` : null;
  const daysMismatch =
    totalDaysPerWeek > 0 && form.availableDays.length > 0
      ? form.availableDays.length < totalDaysPerWeek
      : false;
  // H-02: hint honesto cuando pide "subir de grado" con ciclo corto.
  const showGradeShortCycleHint =
    form.goals.includes('grade') &&
    (form.durationChoice === '2' || form.durationChoice === '3');
  const durationLabel =
    durationOptions.find((option) => option.value === form.durationChoice)?.label ?? 'Pendiente';

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const now = new Date().toISOString();
    const goals = form.goals.length ? form.goals : ['other'];
    // Bloque 4 audit-360: solo campos que sobreviven al recorte del paso 5.
    const profile: UserProfile = {
      id: createId(),
      character: form.character,
      name: form.name.trim(),
      age: form.age,
      sex: form.sex,
      weight: toOptionalNumber(form.weight),
      climbingTime: form.climbingTime,
      disciplines: form.disciplines,
      level: form.level,
      setting: form.setting,
      injuries: form.injuries,
      injuryNotes: form.injuryNotes.trim(),
      sleep: form.sleep,
      daysPerWeek: totalDaysPerWeek,
      climbingDaysPerWeek: form.climbingDaysPerWeek,
      trainingDaysPerWeek: form.trainingDaysPerWeek,
      availableDays: form.availableDays,
      sessionDuration: form.sessionDuration,
      maxSessionDuration: form.maxSessionDuration,
      equipment: form.equipment,
      equipmentNotes: form.equipmentNotes.trim(),
      accessToCampusBoard: form.equipment.includes('campus'),
      accessToHangboard: form.equipment.includes('hangboard'),
      accessToTRX: form.equipment.includes('trx'),
      accessToWeights: form.equipment.includes('weights'),
      pullUpAbility: form.pullUpAbility || 'unknown',
      fingerTrainingExperience: form.fingerTrainingExperience || 'unknown',
      // Audit-360 · rediseño lesión: los 3 dolores se movieron al check-in
      // (solo dedos) + lesión declarada. No los llenamos desde el onboarding
      // nuevo. `deriveXPain` en generate-plan los reconstruye para §1.3.
      wantsConservativePlan: form.trainingAggressiveness === 'conservative',
      trainingAggressiveness: form.trainingAggressiveness,
      pullupsBodyweight: toOptionalInt(form.pullupsBodyweight),
      pullupsAddedWeight5Reps: toOptionalInt(form.pullupsAddedWeight5Reps),
      hangboard20mmSeconds: toOptionalInt(form.hangboard20mmSeconds),
      hangboard20mmAddedWeight7s: toOptionalInt(form.hangboard20mmAddedWeight7s),
      goal: goals[0],
      goals,
      // Bloque 4: textareas del paso 6 fusionadas — una sola.
      goalDescription: form.goalDescription.trim(),
      sleepQuality: form.sleep,
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
    // Bloque 4 audit-360: payload alineado con /api/profile ProfileSchema +
    // migración 0013. Cero campos huérfanos que el server descarte.
    const dbPayload = {
      character: profile.character,
      name: profile.name,
      age: profile.age,
      sex: profile.sex,
      weight: profile.weight,
      climbingTime: profile.climbingTime,
      disciplines: profile.disciplines,
      level: profile.level,
      setting: profile.setting,
      goals: profile.goals,
      goalDescription: profile.goalDescription,
      equipment: profile.equipment,
      equipmentNotes: profile.equipmentNotes,
      daysPerWeek: profile.daysPerWeek,
      climbingDaysPerWeek: profile.climbingDaysPerWeek,
      trainingDaysPerWeek: profile.trainingDaysPerWeek,
      availableDays: profile.availableDays,
      sessionDuration: profile.sessionDuration,
      maxSessionDuration: profile.maxSessionDuration,
      planDuration: profile.planDuration,
      injuries: profile.injuries,
      injuryDescription: profile.injuryDescription,
      injuryNotes: profile.injuryNotes,
      // Audit-360 · rediseño lesión: no van al dbPayload (no existen en el profile nuevo).
      wantsConservativePlan: profile.wantsConservativePlan,
      trainingAggressiveness: profile.trainingAggressiveness,
      sleepQuality: profile.sleepQuality,
      sleep: profile.sleep,
      pullUpAbility: profile.pullUpAbility,
      fingerTrainingExperience: profile.fingerTrainingExperience,
      pullupsBodyweight: profile.pullupsBodyweight,
      pullupsAddedWeight5Reps: profile.pullupsAddedWeight5Reps,
      hangboard20mmSeconds: profile.hangboard20mmSeconds,
      hangboard20mmAddedWeight7s: profile.hangboard20mmAddedWeight7s
    };
    // Bloque audit-360 post-diag: si el POST falla, se muestra banner y NO
    // se navega a /generating-plan. Sin este cambio el usuario quedaba con
    // la fila de profiles en defaults y un plan generado sobre localStorage
    // que jamás persistía a Supabase.
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });
      if (!res.ok) {
        setSubmitError('No pudimos guardar tu perfil. Vuelve a intentar.');
        setSubmitting(false);
        return;
      }
    } catch {
      setSubmitError('No pudimos guardar tu perfil. Vuelve a intentar.');
      setSubmitting(false);
      return;
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
            {/* Bloque 4 audit-360: campo "Estatura" recortado (sin uso en motor). */}
          </div>
        </StepSection>

        <StepSection number={4} title="Tu cuerpo" icon={HeartPulse} done={stepsDone[4]}>
          <p className="text-sm leading-6 text-white/64">
            Bill/Senda adapta el plan según lo que reportes. Si tienes alguna molestia, cuéntanos.
          </p>

          <FieldGroup title="¿Tienes alguna lesión activa o algo que te impida escalar normalmente?">
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionButton
                active={form.injuries.length > 0 && form.injuries.includes('none')}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    injuries: ['none'],
                    injuryNotes: ''
                  }))
                }
              >
                No, estoy bien
              </OptionButton>
              <OptionButton
                active={form.injuries.length > 0 && !form.injuries.includes('none')}
                onClick={() =>
                  setForm((current) => {
                    // Si venía en 'none' o vacío, arrancamos con array vacío
                    // para que muestre el multi-select. Si ya tenía zonas, no las tocamos.
                    if (current.injuries.length === 0 || current.injuries.includes('none')) {
                      return { ...current, injuries: [] };
                    }
                    return current;
                  })
                }
              >
                Sí
              </OptionButton>
            </div>
          </FieldGroup>

          {form.injuries.length > 0 && !form.injuries.includes('none') ? (
            <>
              <FieldGroup title="¿Dónde?" hint="Marca todas las que apliquen">
                <OptionGrid>
                  {injuryOptions
                    .filter((option) => option.value !== 'none')
                    .map((option) => (
                      <OptionButton
                        key={option.value}
                        active={form.injuries.includes(option.value)}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            injuries: current.injuries.includes(option.value)
                              ? current.injuries.filter((item) => item !== option.value)
                              : [...current.injuries, option.value]
                          }))
                        }
                      >
                        {option.label}
                      </OptionButton>
                    ))}
                </OptionGrid>
              </FieldGroup>

              <TextareaField
                label="Cuéntanos más si quieres"
                value={form.injuryNotes}
                placeholder="Cuándo empezó, qué la agrava, si vas al fisio..."
                onChange={(value) => setForm((current) => ({ ...current, injuryNotes: value }))}
              />
            </>
          ) : null}

          {/* Audit-360 · rediseño lesión (07/07/2026): los 3 sliders de dolor
              (dedos/hombro/codo) se quitaron del onboarding. Dolor de dedos se
              captura en el check-in; codo/hombro se cubren por lesión declarada
              arriba (equivale a dolor 5/10 en esa zona). Ver
              lib/brain/derive-pain-signals.ts. */}

          {/* Bloque 4 audit-360: "¿Calientas antes de escalar?" y "¿Cómo es
              tu energía general?" recortados (sin uso en motor ni safety). */}

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
        </StepSection>

        <StepSection number={5} title="Tu entrenamiento" icon={Dumbbell} done={stepsDone[5]}>
          <FieldGroup
            title="¿Cuántos días por semana escalas?"
            hint="Días que vas al gym de escalada o a roca."
          >
            <OptionGrid columns={4}>
              {climbingDaysOptions.map((option) => (
                <OptionButton
                  key={`climb-${option.value}`}
                  active={form.climbingDaysPerWeek === option.value}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      climbingDaysPerWeek: option.value
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          <FieldGroup
            title="¿Cuántos días extra puedes dedicar a entrenar?"
            hint="Días en el gym de pesas, tabla de suspensión (hangboard) en casa, o cualquier trabajo que NO sea escalar. Puede ser 0."
          >
            <OptionGrid columns={5}>
              {trainingDaysOptions.map((option) => (
                <OptionButton
                  key={`train-${option.value}`}
                  active={form.trainingDaysPerWeek === option.value}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      trainingDaysPerWeek: option.value
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </OptionGrid>
          </FieldGroup>

          {totalDaysPerWeek > 0 ? (
            <p
              className="-mt-2 text-sm font-bold text-brand-cyan"
              data-testid="onboarding-days-total"
            >
              En total van {totalDaysPerWeek} {totalDaysPerWeek === 1 ? 'día' : 'días'} por semana.
            </p>
          ) : null}

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
            {daysMismatch ? (
              <p
                className="mt-3 rounded-xl border border-brand-mustard/40 bg-brand-mustard/[0.10] px-3 py-2 text-xs font-bold text-brand-mustard"
                data-testid="onboarding-days-mismatch"
              >
                Marcaste {totalDaysPerWeek} días de actividad pero elegiste solo{' '}
                {form.availableDays.length} disponibles. Ajusta uno de los dos.
              </p>
            ) : null}
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

          {/* Bloque 4 audit-360: "¿Has seguido algún plan antes?" recortado. */}

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

          {/* Bloque 4 audit-360: "Experiencia con campus" y "Frecuencia en
              roca" recortados. */}

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

          {/* Bloque 4 audit-360: las 3 textareas (goalDescription + project +
              rockProjectDescription) se fusionan en una sola. El motor recibe
              todo el texto en `goalDescription`. */}
          <TextareaField
            label="Cuéntame más de tu objetivo o proyecto (opcional)"
            value={form.goalDescription}
            placeholder="Por ejemplo: quiero encadenar La Catrina 5.12a en El Salto antes de diciembre. Es un desplome, crux en el paso 5. Vengo de dos meses sin escalar por trabajo."
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                goalDescription: value,
                goals: value.trim() && !current.goals.length ? ['other'] : current.goals
              }))
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
            {showGradeShortCycleHint ? (
              <p
                className="mt-3 rounded-xl border border-brand-cyan/30 bg-brand-cyan/[0.08] px-3 py-2 text-xs font-bold text-brand-cyan"
                data-testid="onboarding-grade-hint"
              >
                Subir de grado suele tomar 8–12 semanas. Este ciclo corto trabaja las
                bases que te acercan.
              </p>
            ) : null}
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
              {/* Audit-360 · rediseño lesión: fila "Dolor actual" removida.
                  El dolor de dedos se captura en el check-in; codo/hombro por
                  lesión declarada. */}
              <SummaryRow
                label="Carga"
                value={getLabel(trainingAggressivenessOptions, form.trainingAggressiveness)}
              />
              <SummaryRow label="Duración" value={durationLabel} />
            </dl>
          </div>

          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className={cn(
              'flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-extrabold transition-all duration-150',
              canSubmit && !submitting
                ? 'bg-gradient-cyan text-brand-dark shadow-glow-strong hover:brightness-110 active:scale-[0.99]'
                : 'cursor-not-allowed bg-white/[0.06] text-white/35'
            )}
          >
            {submitting ? 'Guardando…' : 'Generar mi plan de entrenamiento'}
            {!submitting ? <ArrowRight aria-hidden="true" size={20} strokeWidth={2.8} /> : null}
          </button>

          {submitError ? (
            // Bloque audit-360 post-diag: banner visible cuando falla el POST
            // a /api/profile. Antes el user quedaba sin plan sin saber por qué.
            <div
              className="rounded-xl border border-red-400/40 bg-red-400/[0.08] px-4 py-3 text-sm leading-6 text-red-200"
              data-testid="onboarding-submit-error"
              role="alert"
            >
              <p className="font-extrabold">{submitError}</p>
            </div>
          ) : null}

          {!canSubmit ? (
            // Bloque 4 audit-360: gate final útil — lista concreta de qué falta.
            <div
              className="rounded-xl border border-brand-mustard/30 bg-brand-mustard/[0.08] px-4 py-3 text-xs leading-6 text-white/72"
              data-testid="onboarding-missing-list"
            >
              <p className="font-extrabold text-brand-mustard">Te falta completar:</p>
              <ul className="mt-2 space-y-1">
                {missingByStep.map((entry) => (
                  <li key={`missing-step-${entry.step}`}>
                    <span className="font-bold text-white">Paso {entry.step} — {entry.title}:</span>{' '}
                    {entry.fields.join(' · ')}
                  </li>
                ))}
              </ul>
            </div>
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
  columns?: 2 | 3 | 4 | 5;
}) {
  const classes =
    columns === 5
      ? 'grid gap-2 grid-cols-5'
      : columns === 4
        ? 'grid gap-2 grid-cols-4'
        : columns === 3
          ? 'grid gap-2 grid-cols-3'
          : 'grid gap-2 sm:grid-cols-2';
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
  // Bloque 4 audit-360: colapsado por defecto. Copy en tono "está bien no
  // saberlas" para bajar la fricción del paso 5. Bench/squat/deadlift OUT.
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-brand-cyan/15 bg-brand-cyan/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl p-5 text-left"
        aria-expanded={open}
        data-testid="onboarding-strength-disclosure"
      >
        <span className="text-sm font-extrabold text-white">
          ¿Conoces tus marcas de fuerza? (opcional — la mayoría no las sabe y
          está perfecto)
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
          {open ? 'Cerrar' : 'Abrir'}
        </span>
      </button>
      {open ? (
        <div className="space-y-5 p-5 pt-0">
          <div className="space-y-4">
            <p className="text-sm font-extrabold text-white">Dominadas</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="A peso corporal (máx reps)"
                value={form.pullupsBodyweight}
                inputMode="numeric"
                placeholder="ej. 12 dominadas"
                onChange={(value) =>
                  setForm((current) => ({ ...current, pullupsBodyweight: value }))
                }
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
            <p className="text-sm font-extrabold text-white">Suspensión en regleta de 20 mm</p>
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
        </div>
      ) : null}
    </div>
  );
}
