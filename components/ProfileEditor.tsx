'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, LogOut, Save, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import {
  loadProfile,
  loadProfileNeedsRegeneration,
  markProfileNeedsRegeneration,
  saveProfile,
  type UserProfile
} from '@/lib/profile';
import { clearLocalSession, loadLocalSession, type LocalSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/client';

type Option = { label: string; value: string };

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

const durationOptions = [
  { label: '4 semanas', value: 4 },
  { label: '8 semanas', value: 8 },
  { label: '12 semanas', value: 12 }
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function toggleValue(values: string[], value: string, exclusiveValues: string[] = []) {
  if (values.includes(value)) return values.filter((item) => item !== value);
  if (exclusiveValues.includes(value)) return [value];
  return [...values.filter((item) => !exclusiveValues.includes(item)), value];
}

function toNumberOrNull(value: string) {
  const parsedValue = Number(value);
  return value.trim() && Number.isFinite(parsedValue) ? parsedValue : null;
}

export function ProfileEditor() {
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSession(loadLocalSession());
    const storedProfile = loadProfile();
    setInitialProfile(storedProfile);
    setProfile(storedProfile);
    setNeedsRegeneration(loadProfileNeedsRegeneration());
  }, []);

  const significantChange = useMemo(() => {
    if (!initialProfile || !profile) return false;
    return (
      initialProfile.goal !== profile.goal ||
      initialProfile.goals.join(',') !== profile.goals.join(',') ||
      initialProfile.goalDescription !== profile.goalDescription ||
      initialProfile.project !== profile.project ||
      initialProfile.level !== profile.level ||
      initialProfile.daysPerWeek !== profile.daysPerWeek ||
      initialProfile.availableDays.join(',') !== profile.availableDays.join(',') ||
      initialProfile.sessionDuration !== profile.sessionDuration ||
      initialProfile.maxSessionDuration !== profile.maxSessionDuration ||
      initialProfile.planDuration !== profile.planDuration ||
      initialProfile.injuryNotes !== profile.injuryNotes ||
      initialProfile.injuries.join(',') !== profile.injuries.join(',') ||
      initialProfile.equipment.join(',') !== profile.equipment.join(',') ||
      initialProfile.equipmentNotes !== profile.equipmentNotes ||
      initialProfile.currentFingerPain !== profile.currentFingerPain ||
      initialProfile.currentShoulderPain !== profile.currentShoulderPain ||
      initialProfile.currentElbowPain !== profile.currentElbowPain ||
      initialProfile.fingerTrainingExperience !== profile.fingerTrainingExperience ||
      initialProfile.campusExperience !== profile.campusExperience ||
      initialProfile.pullUpAbility !== profile.pullUpAbility ||
      initialProfile.trainingAggressiveness !== profile.trainingAggressiveness ||
      initialProfile.outdoorFrequency !== profile.outdoorFrequency ||
      initialProfile.rockProjectDescription !== profile.rockProjectDescription
    );
  }, [initialProfile, profile]);

  function updateProfileField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  function updateProfileGoals(goals: string[]) {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        goals,
        goal: goals[0] ?? (current.goalDescription.trim() ? 'other' : '')
      };
    });
    setSaved(false);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    const nextProfile = {
      ...profile,
      accessToCampusBoard: profile.equipment.includes('campus'),
      accessToHangboard: profile.equipment.includes('hangboard'),
      accessToTRX: profile.equipment.includes('trx'),
      accessToWeights: profile.equipment.includes('weights'),
      wantsConservativePlan: profile.trainingAggressiveness === 'conservative',
      projectDescription: profile.project.trim(),
      sleepQuality: profile.sleep,
      energyLevel: profile.energy,
      injuryDescription: profile.injuryNotes.trim(),
      trainingHistory: profile.previousTraining,
      updatedAt: new Date().toISOString()
    };

    saveProfile(nextProfile);

    if (significantChange) {
      markProfileNeedsRegeneration();
      setNeedsRegeneration(true);
    }

    setProfile(nextProfile);
    setInitialProfile(nextProfile);
    setSaved(true);
  }

  if (!profile) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <header className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">Mi perfil</p>
          <h1 className="text-3xl font-extrabold leading-tight">Datos de escalada</h1>
        </header>
        <Card variant="hero">
          <h2 className="text-2xl font-extrabold">Aún no hay perfil</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Completa el onboarding para crear tu perfil base.
          </p>
          <Button href="/onboarding" size="lg" className="mt-5 w-full">
            Ir al onboarding
          </Button>
        </Card>
        <SessionCard session={session} />
      </motion.section>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={handleSave}
      className="space-y-7"
    >
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">Mi perfil</p>
        <h1 className="text-3xl font-extrabold leading-tight">Datos de escalada</h1>
        <p className="text-sm leading-6 text-white/64">
          Edita tu contexto sin borrar historial. Cambios fuertes pueden necesitar regenerar el
          plan.
        </p>
      </header>

      <SessionCard session={session} />

      {significantChange || needsRegeneration ? (
        <Banner
          tone="mustard"
          icon={Sparkles}
          title="Plan necesita regeneración"
          description={
            significantChange
              ? 'Cambiaste objetivo, nivel, equipo, lesión o disponibilidad. Guarda el perfil y regenera tu plan para que BilClimb lo use.'
              : 'Tu perfil guardado cambió datos importantes. Regenera tu plan para usar el contexto nuevo.'
          }
        />
      ) : null}

      {saved ? (
        <Banner tone="cyan" title="Perfil guardado" description="Tus cambios están seguros." />
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
            label="Peso (kg)"
            value={profile.weight?.toString() ?? ''}
            inputMode="decimal"
            onChange={(value) => updateProfileField('weight', toNumberOrNull(value))}
          />
          <InputField
            label="Estatura (cm)"
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
        <PainScaleField
          title="Dolor de dedos hoy"
          value={profile.currentFingerPain}
          onChange={(value) => updateProfileField('currentFingerPain', value)}
        />
        <PainScaleField
          title="Dolor de hombro hoy"
          value={profile.currentShoulderPain}
          onChange={(value) => updateProfileField('currentShoulderPain', value)}
        />
        <PainScaleField
          title="Dolor de codo hoy"
          value={profile.currentElbowPain}
          onChange={(value) => updateProfileField('currentElbowPain', value)}
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
        <FieldGroup title="Días disponibles">
          <OptionGrid>
            {availableDayOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.availableDays.includes(option.value)}
                onClick={() =>
                  updateProfileField('availableDays', toggleValue(profile.availableDays, option.value))
                }
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Duración por sesión">
          <OptionGrid>
            {sessionDurationOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.sessionDuration === option.value}
                onClick={() => updateProfileField('sessionDuration', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Máximo real si una sesión se alarga">
          <OptionGrid>
            {sessionDurationOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.maxSessionDuration === option.value}
                onClick={() => updateProfileField('maxSessionDuration', option.value)}
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
        <FieldGroup title="Dominadas estrictas actuales">
          <OptionGrid>
            {pullUpAbilityOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.pullUpAbility === option.value}
                onClick={() => updateProfileField('pullUpAbility', option.value)}
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
                active={profile.fingerTrainingExperience === option.value}
                onClick={() => updateProfileField('fingerTrainingExperience', option.value)}
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
                active={profile.campusExperience === option.value}
                onClick={() => updateProfileField('campusExperience', option.value)}
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
                active={profile.outdoorFrequency === option.value}
                onClick={() => updateProfileField('outdoorFrequency', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <FieldGroup title="Qué tan agresivo quieres el plan">
          <OptionGrid>
            {trainingAggressivenessOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.trainingAggressiveness === option.value}
                onClick={() => updateProfileField('trainingAggressiveness', option.value)}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
      </ProfileSection>

      <ProfileSection title="Objetivo">
        <FieldGroup title="Objetivos">
          <OptionGrid>
            {goalOptions.map((option) => (
              <OptionButton
                key={option.value}
                active={profile.goals.includes(option.value)}
                onClick={() => updateProfileGoals(toggleValue(profile.goals, option.value))}
              >
                {option.label}
              </OptionButton>
            ))}
          </OptionGrid>
        </FieldGroup>
        <TextareaField
          label="Redacta lo que buscas"
          value={profile.goalDescription}
          placeholder="Quiero mejorar técnica en placa, tener más resistencia para rutas largas…"
          onChange={(value) => {
            const goals = value.trim() && !profile.goals.length ? ['other'] : profile.goals;
            setProfile((current) =>
              current
                ? {
                    ...current,
                    goalDescription: value,
                    goals,
                    goal: goals[0] ?? (value.trim() ? 'other' : '')
                  }
                : current
            );
            setSaved(false);
          }}
        />
        <TextareaField
          label="Proyecto o ruta específica"
          value={profile.project}
          placeholder="Ruta, boulder, fecha, zona o grado que traes en mente…"
          onChange={(value) => updateProfileField('project', value)}
        />
        <TextareaField
          label="Contexto del proyecto en roca"
          value={profile.rockProjectDescription}
          placeholder="Tipo de ruta, estilo, crux, agarres, desplome/placa, fecha del viaje…"
          onChange={(value) => updateProfileField('rockProjectDescription', value)}
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
        <Button type="submit" size="lg" icon={<Save size={18} />} className="w-full">
          Guardar perfil
        </Button>
        <Button
          variant={significantChange ? 'secondary' : 'mustard'}
          href="/generating-plan"
          size="lg"
          className="w-full"
          onClick={(event) => {
            if (significantChange) event.preventDefault();
          }}
          aria-disabled={significantChange}
        >
          {significantChange ? 'Guarda antes de regenerar' : 'Regenerar plan'}
        </Button>
      </div>
    </motion.form>
  );
}

function SessionCard({ session }: { session: LocalSession | null }) {
  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore — we'll still clear local and redirect
    }
    clearLocalSession();
    window.location.href = '/sign-in';
  }

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">Sesión</p>
      <h2 className="mt-1 text-xl font-extrabold">{session?.name ?? 'Cuenta'}</h2>
      <p className="mt-1 text-sm text-white/60">{session?.email ?? 'Sin correo activo'}</p>
      <Button
        variant="secondary"
        onClick={handleLogout}
        icon={<LogOut size={17} />}
        className="mt-4 w-full"
      >
        Cerrar sesión
      </Button>
    </Card>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-extrabold text-white/82">{title}</p>
      {children}
    </div>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-3">{children}</div>;
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
    <FieldGroup title={`${title} (0-5)`}>
      <div className="grid grid-cols-6 gap-2">
        {painScaleOptions.map((score) => {
          const active = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'grid h-11 place-items-center rounded-xl border text-sm font-extrabold transition active:scale-[0.97]',
                active
                  ? 'border-brand-coral/55 bg-brand-coral/[0.15] text-brand-coral'
                  : 'border-white/10 bg-white/[0.03] text-white/68 hover:border-white/22'
              )}
            >
              {score}
            </button>
          );
        })}
      </div>
    </FieldGroup>
  );
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
        'flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-all duration-150 active:scale-[0.99]',
        active
          ? 'border-brand-cyan/55 bg-brand-cyan/[0.12] text-brand-cyan shadow-glow'
          : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/22'
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
      <span className="mb-2 block text-sm font-extrabold text-white/82">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
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
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-white/82">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan/60 focus:bg-white/[0.05]"
      />
    </label>
  );
}
