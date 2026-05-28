'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
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

type DurationChoice = '' | '4' | '8' | '12' | 'starter';

type OnboardingForm = {
  character: UserProfile['character'];
  name: string;
  age: string;
  sex: string;
  weight: string;
  height: string;
  climbingTime: string;
  disciplines: string[];
  level: string;
  setting: string;
  injuries: string[];
  injuryNotes: string;
  warmup: string;
  sleep: string;
  energy: string;
  daysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  equipment: string[];
  equipmentNotes: string;
  previousTraining: string;
  goals: string[];
  goalDescription: string;
  project: string;
  durationChoice: DurationChoice;
};

type Option = {
  label: string;
  value: string;
  helper?: string;
};

const initialForm: OnboardingForm = {
  character: 'bill',
  name: '',
  age: '',
  sex: '',
  weight: '',
  height: '',
  climbingTime: '',
  disciplines: [],
  level: '',
  setting: '',
  injuries: [],
  injuryNotes: '',
  warmup: '',
  sleep: '',
  energy: '',
  daysPerWeek: 0,
  availableDays: [],
  sessionDuration: 90,
  equipment: [],
  equipmentNotes: '',
  previousTraining: '',
  goals: [],
  goalDescription: '',
  project: '',
  durationChoice: ''
};

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

const equipmentOptions: Option[] = [
  { label: 'Gym de escalada', value: 'gym' },
  { label: 'Hangboard', value: 'hangboard' },
  { label: 'Campus board', value: 'campus' },
  { label: 'Gym de pesas', value: 'weights' },
  { label: 'Solo roca', value: 'rock' },
  { label: 'Casa sin equipo', value: 'home' },
  { label: 'Bandas elásticas', value: 'bands' },
  { label: 'Barra de dominadas', value: 'pullup_bar' }
];

const previousTrainingOptions: Option[] = [
  { label: 'Nunca', value: 'never' },
  { label: 'Sí pero informal', value: 'informal' },
  { label: 'Sí con estructura', value: 'structured' },
  { label: 'Sí con entrenador', value: 'coach' }
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
  { label: '4 semanas', value: '4' },
  { label: '8 semanas', value: '8' },
  { label: '12 semanas', value: '12' },
  { label: 'Solo quiero empezar', value: 'starter' }
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? 'Pendiente';
}

function getLabels(options: Option[], values: string[]) {
  if (!values.length) {
    return 'Pendiente';
  }

  return values.map((value) => getLabel(options, value)).join(' + ');
}

function getGoalSummary(goals: string[], goalDescription: string) {
  const selectedGoals = getLabels(goalOptions, goals);
  const description = goalDescription.trim();

  if (description && goals.length) {
    return `${selectedGoals} · ${description}`;
  }

  if (description) {
    return description;
  }

  return selectedGoals;
}

function toOptionalNumber(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && value.trim() !== '' ? parsedValue : null;
}

function createId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `profile-${Date.now()}`;
}

function toggleExclusiveList(currentValues: string[], value: string, exclusiveValues: string[]) {
  const isActive = currentValues.includes(value);

  if (isActive) {
    return currentValues.filter((item) => item !== value);
  }

  if (exclusiveValues.includes(value)) {
    return [value];
  }

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
      className={classNames(
        'flex min-h-12 items-center justify-between rounded-md border px-4 py-3 text-left text-sm font-semibold transition',
        active
          ? 'border-brand-cyan bg-brand-cyan/14 text-brand-cyan'
          : 'border-white/10 bg-white/[0.04] text-white/76 hover:border-white/24 hover:bg-white/[0.07]'
      )}
    >
      <span>{children}</span>
      {active ? <Check aria-hidden="true" size={18} strokeWidth={2.6} /> : null}
    </button>
  );
}

function StepSection({
  number,
  title,
  children,
  icon: Icon
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  icon: typeof UserRound;
}) {
  return (
    <section className="border-b border-white/10 py-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-cyan/14 text-brand-cyan">
          <Icon aria-hidden="true" size={20} strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-mustard">Paso {number} de 7</p>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function updateScrollProgress() {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress =
        scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 100;

      setScrollProgress(Math.max(0, Math.min(100, nextProgress)));
    }

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, []);

  const completedSteps = useMemo(() => {
    return [
      Boolean(form.character),
      Boolean(form.climbingTime && form.disciplines.length && form.level && form.setting),
      Boolean(form.age && form.sex),
      Boolean(form.injuries.length && form.warmup && form.sleep && form.energy),
      Boolean(
        form.daysPerWeek &&
          form.availableDays.length &&
          form.sessionDuration &&
          form.equipment.length &&
          form.previousTraining
      ),
      Boolean((form.goals.length || form.goalDescription.trim()) && form.durationChoice),
      true
    ].filter(Boolean).length;
  }, [form]);

  const canSubmit = completedSteps === 7;

  const durationWeeks = form.durationChoice === 'starter' ? 4 : Number(form.durationChoice);
  const daysLabel = daysOptions.find((option) => option.value === form.daysPerWeek)?.label;
  const durationLabel =
    durationOptions.find((option) => option.value === form.durationChoice)?.label ?? 'Pendiente';

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }

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
      equipment: form.equipment,
      equipmentNotes: form.equipmentNotes.trim(),
      previousTraining: form.previousTraining,
      trainingHistory: form.previousTraining,
      goal: goals[0],
      goals,
      goalDescription: form.goalDescription.trim(),
      project: form.project.trim(),
      projectDescription: form.project.trim(),
      sleepQuality: form.sleep,
      energyLevel: form.energy,
      injuryDescription: form.injuryNotes.trim(),
      planDuration: durationWeeks,
      createdAt: now,
      updatedAt: now
    };

    saveProfile(profile);
    router.push('/generating-plan');
  }

  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-brand-dark/96 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-cyan">BilClimb.ai</p>
              <h1 className="text-xl font-bold">Onboarding</h1>
            </div>
            <p className="text-sm font-semibold text-white/70">{completedSteps}/7</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div
              className="h-full rounded-full bg-brand-cyan transition-[width]"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-12">
        <StepSection number={1} title="Elige tu compañer@" icon={Sparkles}>
          <p className="mb-4 text-lg font-semibold">¿Con quién quieres entrenar?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, character: 'bill' }))}
              className={classNames(
                'rounded-lg border p-5 text-left transition',
                form.character === 'bill'
                  ? 'border-brand-cyan bg-brand-cyan/12'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/24'
              )}
            >
              <div className="mb-5 flex h-24 items-center justify-center rounded-md bg-white/[0.05] text-brand-cyan">
                <Dumbbell aria-hidden="true" size={40} strokeWidth={2.2} />
              </div>
              <h3 className="text-xl font-bold">Bill</h3>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Entrenamiento general, fuerza, periodización.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, character: 'senda' }))}
              className={classNames(
                'rounded-lg border p-5 text-left transition',
                form.character === 'senda'
                  ? 'border-brand-cyan bg-brand-cyan/12'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/24'
              )}
            >
              <div className="mb-5 flex h-24 items-center justify-center rounded-md bg-white/[0.05] text-brand-mustard">
                <Mountain aria-hidden="true" size={40} strokeWidth={2.2} />
              </div>
              <h3 className="text-xl font-bold">Senda</h3>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Entrenamiento general + especialista en escalada femenina.
              </p>
            </button>
          </div>
        </StepSection>

        <StepSection number={2} title="Tu escalada" icon={Mountain}>
          <div className="space-y-7">
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

            <FieldGroup title="¿Qué tipo de escalada practicas? (selecciona varias)">
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
          </div>
        </StepSection>

        <StepSection number={3} title="Sobre ti" icon={UserRound}>
          <div className="space-y-7">
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

            <FieldGroup title="Sexo biológico (para temas de salud)">
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
                label="Peso aproximado en kg (opcional)"
                value={form.weight}
                inputMode="decimal"
                onChange={(value) => setForm((current) => ({ ...current, weight: value }))}
              />
              <InputField
                label="Estatura en cm (opcional)"
                value={form.height}
                inputMode="decimal"
                onChange={(value) => setForm((current) => ({ ...current, height: value }))}
              />
            </div>
          </div>
        </StepSection>

        <StepSection number={4} title="Tu cuerpo" icon={HeartPulse}>
          <div className="space-y-7">
            <FieldGroup title="¿Tienes alguna lesión o molestia? (selecciona todas)">
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
          </div>
        </StepSection>

        <StepSection number={5} title="Tu entrenamiento" icon={Dumbbell}>
          <div className="space-y-7">
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
              <OptionGrid>
                {availableDayOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    active={form.availableDays.includes(option.value)}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        availableDays: current.availableDays.includes(option.value)
                          ? current.availableDays.filter((item) => item !== option.value)
                          : [...current.availableDays, option.value]
                      }))
                    }
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </OptionGrid>
            </FieldGroup>

            <FieldGroup title="¿Cuánto dura normalmente tu sesión?">
              <OptionGrid>
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

            <FieldGroup title="¿A qué tienes acceso? (selecciona todo)">
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
          </div>
        </StepSection>

        <StepSection number={6} title="Tu objetivo" icon={Target}>
          <div className="space-y-7">
            <FieldGroup title="¿Qué objetivos quieres trabajar? (selecciona varios)">
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
                  goals:
                    value.trim() && !current.goals.length
                      ? ['other']
                      : current.goals
                }))
              }
            />

            <TextareaField
              label="¿Tienes un proyecto o ruta específica?"
              value={form.project}
              placeholder="Quiero encadenar La Catrina 5.12a en El Salto antes de diciembre"
              onChange={(value) => setForm((current) => ({ ...current, project: value }))}
            />

            <FieldGroup title="¿En cuántas semanas quieres ver resultados?">
              <OptionGrid>
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
          </div>
        </StepSection>

        <StepSection number={7} title="Nombre + Confirmación" icon={Zap}>
          <div className="space-y-7">
            <InputField
              label="¿Cómo te llamas? (opcional)"
              value={form.name}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            />

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-lg font-bold">Resumen visual de perfil</h3>
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
                <SummaryRow label="Duración" value={durationLabel} />
              </dl>
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={classNames(
                'flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-base font-bold transition',
                canSubmit
                  ? 'bg-brand-cyan text-brand-dark hover:bg-brand-cyan/90'
                  : 'cursor-not-allowed bg-white/10 text-white/40'
              )}
            >
              Generar mi plan de entrenamiento
              <Zap aria-hidden="true" size={19} strokeWidth={2.6} />
            </button>
          </div>
        </StepSection>
      </div>
    </main>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-base font-semibold text-white">{title}</p>
      {children}
    </div>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>;
}

function InputField({
  label,
  value,
  inputMode,
  onChange
}: {
  label: string;
  value: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-semibold text-white">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-md border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
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
      <span className="mb-2 block text-base font-semibold text-white">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-white/48">{label}</dt>
      <dd className="font-semibold text-white/86">{value}</dd>
    </div>
  );
}
