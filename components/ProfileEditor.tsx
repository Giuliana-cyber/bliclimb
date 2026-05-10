'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Save } from 'lucide-react';
import { loadProfile, saveProfile, type UserProfile } from '@/lib/profile';

type Option = {
  label: string;
  value: string;
};

const characterOptions: Option[] = [
  { label: 'Bill', value: 'bill' },
  { label: 'Senda', value: 'senda' }
];

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
  { label: 'Volver después de lesión/pausa', value: 'return' }
];

const durationOptions = [
  { label: '4 semanas', value: 4 },
  { label: '8 semanas', value: 8 },
  { label: '12 semanas', value: 12 }
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function toggleValue(values: string[], value: string, exclusiveValues: string[] = []) {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  if (exclusiveValues.includes(value)) {
    return [value];
  }

  return [...values.filter((item) => !exclusiveValues.includes(item)), value];
}

function toNumberOrNull(value: string) {
  const parsedValue = Number(value);
  return value.trim() && Number.isFinite(parsedValue) ? parsedValue : null;
}

export function ProfileEditor() {
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedProfile = loadProfile();
    setInitialProfile(storedProfile);
    setProfile(storedProfile);
  }, []);

  const significantChange = useMemo(() => {
    if (!initialProfile || !profile) {
      return false;
    }

    return (
      initialProfile.goal !== profile.goal ||
      initialProfile.project !== profile.project ||
      initialProfile.daysPerWeek !== profile.daysPerWeek ||
      initialProfile.planDuration !== profile.planDuration ||
      initialProfile.injuryNotes !== profile.injuryNotes ||
      initialProfile.injuries.join(',') !== profile.injuries.join(',') ||
      initialProfile.equipment.join(',') !== profile.equipment.join(',')
    );
  }, [initialProfile, profile]);

  function updateProfileField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const nextProfile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };

    saveProfile(nextProfile);
    setProfile(nextProfile);
    setInitialProfile(nextProfile);
    setSaved(true);
  }

  if (!profile) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-brand-cyan">Mi Perfil</p>
          <h1 className="mt-2 text-3xl font-bold">Datos de escalada</h1>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-bold">Aún no hay perfil</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Completa el onboarding para crear tu perfil base.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark"
          >
            Ir al onboarding
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand-cyan">Mi Perfil</p>
        <h1 className="mt-2 text-3xl font-bold">Datos de escalada</h1>
        <p className="mt-2 text-sm leading-6 text-white/58">
          Edita tu contexto sin borrar historial. Cambios fuertes pueden necesitar regenerar el
          plan.
        </p>
      </div>

      {significantChange ? (
        <div className="rounded-lg border border-brand-mustard/30 bg-brand-mustard/10 p-4 text-sm leading-6 text-white/76">
          Cambiaste datos que afectan el entrenamiento. Guarda el perfil y regenera tu plan para
          que BilClimb lo use.
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 p-4 text-sm font-semibold text-white/78">
          Perfil guardado.
        </div>
      ) : null}

      <ProfileSection title="Identidad">
        <InputField
          label="Nombre"
          value={profile.name}
          onChange={(value) => updateProfileField('name', value)}
        />
        <FieldGroup title="Compañer@">
          <OptionGrid>
            {characterOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.character === option.value}
                onClick={() => updateProfileField('character', option.value as UserProfile['character'])}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
      </ProfileSection>

      <ProfileSection title="Tu escalada">
        <FieldGroup title="Tiempo escalando">
          <OptionGrid>
            {climbingTimeOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.climbingTime === option.value}
                onClick={() => updateProfileField('climbingTime', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Disciplinas">
          <OptionGrid>
            {disciplineOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.disciplines.includes(option.value)}
                onClick={() =>
                  updateProfileField(
                    'disciplines',
                    toggleValue(profile.disciplines, option.value, ['all', 'unsure'])
                  )
                }
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Nivel">
          <OptionGrid>
            {levelOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.level === option.value}
                onClick={() => updateProfileField('level', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Dónde escalas más">
          <OptionGrid>
            {settingOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.setting === option.value}
                onClick={() => updateProfileField('setting', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
      </ProfileSection>

      <ProfileSection title="Sobre ti">
        <FieldGroup title="Edad">
          <OptionGrid>
            {ageOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.age === option.value}
                onClick={() => updateProfileField('age', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Sexo biológico">
          <OptionGrid>
            {sexOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.sex === option.value}
                onClick={() => updateProfileField('sex', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Peso kg"
            value={profile.weight?.toString() ?? ''}
            inputMode="decimal"
            onChange={(value) => updateProfileField('weight', toNumberOrNull(value))}
          />
          <InputField
            label="Estatura cm"
            value={profile.height?.toString() ?? ''}
            inputMode="decimal"
            onChange={(value) => updateProfileField('height', toNumberOrNull(value))}
          />
        </div>
      </ProfileSection>

      <ProfileSection title="Cuerpo y recuperación">
        <FieldGroup title="Lesiones o molestias">
          <OptionGrid>
            {injuryOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.injuries.includes(option.value)}
                onClick={() =>
                  updateProfileField('injuries', toggleValue(profile.injuries, option.value, ['none']))
                }
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <TextareaField
          label="Notas de lesión"
          value={profile.injuryNotes}
          onChange={(value) => updateProfileField('injuryNotes', value)}
        />
        <FieldGroup title="Calentamiento">
          <OptionGrid>
            {warmupOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.warmup === option.value}
                onClick={() => updateProfileField('warmup', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Sueño">
          <OptionGrid>
            {sleepOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.sleep === option.value}
                onClick={() => updateProfileField('sleep', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Energía">
          <OptionGrid>
            {energyOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.energy === option.value}
                onClick={() => updateProfileField('energy', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
      </ProfileSection>

      <ProfileSection title="Entrenamiento">
        <FieldGroup title="Días por semana">
          <OptionGrid>
            {daysOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.daysPerWeek === option.value}
                onClick={() => updateProfileField('daysPerWeek', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Equipo disponible">
          <OptionGrid>
            {equipmentOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.equipment.includes(option.value)}
                onClick={() => updateProfileField('equipment', toggleValue(profile.equipment, option.value))}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <TextareaField
          label="Describe tu setup"
          value={profile.equipmentNotes}
          onChange={(value) => updateProfileField('equipmentNotes', value)}
        />
        <FieldGroup title="Plan anterior">
          <OptionGrid>
            {previousTrainingOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.previousTraining === option.value}
                onClick={() => updateProfileField('previousTraining', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
      </ProfileSection>

      <ProfileSection title="Objetivo">
        <FieldGroup title="Objetivo principal">
          <OptionGrid>
            {goalOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.goal === option.value}
                onClick={() => updateProfileField('goal', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <TextareaField
          label="Proyecto o ruta específica"
          value={profile.project}
          onChange={(value) => updateProfileField('project', value)}
        />
        <FieldGroup title="Duración del plan">
          <OptionGrid>
            {durationOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.planDuration === option.value}
                onClick={() => updateProfileField('planDuration', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
      </ProfileSection>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-cyan px-4 py-4 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90"
        >
          <Save aria-hidden="true" size={18} />
          Guardar perfil
        </button>
        <Link
          href="/generating-plan"
          className="inline-flex items-center justify-center rounded-md border border-white/12 px-4 py-4 text-base font-bold text-white/78 transition hover:bg-white/[0.05]"
        >
          Regenerar plan
        </Link>
      </div>
    </form>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-white/76">{title}</p>
      {children}
    </div>
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
        'flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm font-bold transition',
        active
          ? 'border-brand-cyan bg-brand-cyan/14 text-brand-cyan'
          : 'border-white/10 bg-white/[0.04] text-white/68 hover:border-white/24'
      )}
    >
      <span>{children}</span>
      {active ? <Check aria-hidden="true" size={15} strokeWidth={3} /> : null}
    </button>
  );
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
      <span className="mb-2 block text-sm font-bold text-white/76">{label}</span>
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
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white/76">{label}</span>
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/34 focus:border-brand-cyan"
      />
    </label>
  );
}
