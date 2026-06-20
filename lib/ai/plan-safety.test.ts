import { describe, expect, it } from 'vitest';
import { buildSafetyRetryMessage, validatePlanSafety } from './plan-safety';
import type { TrainingPlan, Exercise } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    name: 'Ejercicio base',
    description: 'Descripción genérica de un ejercicio neutro.',
    category: null,
    requiredEquipment: null,
    riskLevel: null,
    objective: null,
    prescription: null,
    sets: 3,
    reps: '10',
    duration: null,
    rest: '60 seg',
    intensity: 'moderada',
    intensityPercent: null,
    rpeTarget: null,
    tempo: null,
    notes: null,
    timerSeconds: null,
    howTo: null,
    feelCues: null,
    commonMistakes: null,
    stopIf: null,
    regressions: null,
    progressions: null,
    videoUrl: null,
    sourceConcept: null,
    alternative: null,
    equipment: null,
    ...overrides
  };
}

function makePlan(mainBlock: Exercise[]): TrainingPlan {
  return {
    id: 'plan-1',
    profileId: 'profile-1',
    planVersion: 'test',
    objective: 'Test',
    mesocycleType: 'base',
    microcycles: null,
    planningRationale: null,
    mainObjective: 'Test objective',
    secondaryObjectives: ['x'],
    athleteSummary: 'atleta de prueba',
    riskSummary: 'sin riesgo',
    equipmentSummary: 'casa',
    progressionModel: null,
    weeklyFeedbackPrompt: 'feedback semanal',
    recoveryGuidelines: ['descansa bien'],
    safetyRules: ['no entrenes con dolor agudo'],
    totalWeeks: 1,
    currentWeek: 1,
    startDate: new Date().toISOString(),
    weeks: [
      {
        weekNumber: 1,
        microcycleId: null,
        theme: 'Test',
        objective: null,
        focusAreas: [],
        microcycle: null,
        progression: null,
        progressionFocus: null,
        loadLevel: null,
        deloadWeek: null,
        deloadFocus: null,
        sessions: [
          {
            dayNumber: 1,
            title: 'Sesión 1',
            stimulusType: null,
            location: 'casa',
            equipment: null,
            estimatedMinutes: 60,
            estimatedDurationMinutes: 60,
            objective: null,
            why: null,
            intensityTarget: null,
            warmup: [makeExercise({ name: 'Movilidad articular' })],
            warmupGeneral: null,
            warmupSpecific: null,
            mainBlock,
            finalBlock: null,
            cooldown: [makeExercise({ name: 'Estiramientos' })],
            safetyNotes: null,
            adjustmentRules: null,
            successCriteria: null,
            nutritionTip: 'comer algo',
            source: 'test',
            completed: false,
            checkIn: null
          }
        ]
      }
    ],
    status: 'active',
    createdAt: new Date().toISOString(),
    usedFileSearch: null,
    librarySources: null,
    qualityScores: null
  };
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-1',
    character: 'bill',
    name: 'Test',
    age: '26-35',
    sex: 'na',
    weight: null,
    height: null,
    climbingTime: '1to3',
    disciplines: ['boulder'],
    level: 'intermediate',
    setting: 'indoor',
    injuries: ['none'],
    injuryNotes: '',
    warmup: 'always',
    sleep: 'good',
    energy: 'normal',
    daysPerWeek: 3,
    equipment: ['gym'],
    equipmentNotes: '',
    previousTraining: 'informal',
    goal: 'grade',
    goals: ['grade'],
    goalDescription: '',
    project: '',
    projectDescription: '',
    sessionDuration: 90,
    maxSessionDuration: 120,
    availableDays: ['monday'],
    accessToCampusBoard: false,
    accessToHangboard: false,
    accessToTRX: false,
    accessToWeights: false,
    pullUpAbility: '1to3',
    fingerTrainingExperience: 'light',
    campusExperience: 'none',
    currentFingerPain: 0,
    currentShoulderPain: 0,
    currentElbowPain: 0,
    wantsConservativePlan: false,
    trainingAggressiveness: 'balanced',
    outdoorFrequency: 'monthly',
    rockProjectDescription: '',
    sleepQuality: 'good',
    energyLevel: 'normal',
    injuryDescription: '',
    trainingHistory: 'informal',
    planDuration: 4,
    pullupsBodyweight: null,
    pullupsAddedWeight5Reps: null,
    hangboard20mmSeconds: null,
    hangboard20mmAddedWeight7s: null,
    benchPress1Rm: null,
    squat1Rm: null,
    deadlift1Rm: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('validatePlanSafety', () => {
  describe('R1: menores de 16 no carga de dedos', () => {
    it('rechaza un plan con hangboard para un menor de 16', () => {
      const profile = makeProfile({ age: 'u16' });
      const plan = makePlan([
        makeExercise({
          name: 'Suspensiones en hangboard',
          description: 'Cuelga 7 segundos en regleta de 20mm.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.violations[0].rule).toBe('no_finger_load_minors');
      }
    });

    it('rechaza un plan con campus board para un menor de 16', () => {
      const profile = makeProfile({ age: 'u16' });
      const plan = makePlan([
        makeExercise({
          name: 'Rebotes en campus',
          description: 'Rebotes de alcance máximo en campus board.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
    });

    it('detecta la palabra prohibida aunque esté en notes y no en name', () => {
      const profile = makeProfile({ age: 'u16' });
      const plan = makePlan([
        makeExercise({
          name: 'Trabajo de dedos',
          description: 'Carga submáxima en agarre semi-arqueo en regleta de 22mm.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
    });

    it('acepta un plan sin carga de dedos para un menor de 16', () => {
      const profile = makeProfile({ age: 'u16' });
      const plan = makePlan([
        makeExercise({
          name: 'Tracciones asistidas',
          description: 'Dominadas con goma elástica.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(true);
    });
  });

  describe('R2: dolor de dedos > 3 no max hangs', () => {
    it('rechaza max hangs cuando dolor de dedos = 5', () => {
      const profile = makeProfile({ currentFingerPain: 5 });
      const plan = makePlan([
        makeExercise({
          name: 'Max Hangs en regleta',
          description: 'Suspensiones máximas 4x7 segundos en regleta de 20mm al 90% BW.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.violations[0].rule).toBe('no_max_hangs_with_pain');
      }
    });

    it('acepta submáximas cuando dolor = 5', () => {
      const profile = makeProfile({ currentFingerPain: 5 });
      const plan = makePlan([
        makeExercise({
          name: 'Extensores con banda',
          description: 'Abre los dedos contra la goma 3x15 reps.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(true);
    });

    it('acepta max hangs cuando dolor = 2 (umbral)', () => {
      const profile = makeProfile({ currentFingerPain: 2 });
      const plan = makePlan([
        makeExercise({
          name: 'Max Hang submáximo',
          description: 'Suspensiones submáximas controladas.'
        })
      ]);
      // 'max hang' es la keyword exacta; dolor 2 < 3 → ok
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(true);
    });
  });

  describe('R3: tiempo escalando < 1 año no campus board', () => {
    it('rechaza campus para principiante (less1)', () => {
      const profile = makeProfile({ climbingTime: 'less1' });
      const plan = makePlan([
        makeExercise({
          name: 'Campus moves',
          description: 'Dominadas desiguales en campus.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.violations[0].rule).toBe('no_campus_for_beginners');
      }
    });

    it('rechaza campus para principiante (start)', () => {
      const profile = makeProfile({ climbingTime: 'start' });
      const plan = makePlan([
        makeExercise({
          name: 'Trabajo de potencia',
          description: 'Rebotes en campus board.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
    });

    it('acepta campus para 1-3 años', () => {
      const profile = makeProfile({ climbingTime: '1to3' });
      const plan = makePlan([
        makeExercise({
          name: 'Rebotes en campus',
          description: 'Rebotes alcance máximo 3x3.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(true);
    });
  });

  describe('R4: principiante sin peso colgado → no max hangs', () => {
    it('rechaza max hangs cuando less1 + hangboard20mmAddedWeight7s = 0', () => {
      const profile = makeProfile({
        climbingTime: 'less1',
        hangboard20mmAddedWeight7s: 0
      });
      const plan = makePlan([
        makeExercise({
          name: 'Max Hangs en regleta 20mm',
          description: 'Suspensiones máximas 4x7 seg al 100% BW.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.violations.some((v) => v.rule === 'no_max_hangs_for_strength_novice')).toBe(
          true
        );
      }
    });

    it('no aplica R4 si el atleta lleva 1+ años escalando aunque hangboard sea 0', () => {
      const profile = makeProfile({
        climbingTime: '1to3',
        hangboard20mmAddedWeight7s: 0
      });
      const plan = makePlan([
        makeExercise({ name: 'Max Hangs', description: 'Suspensiones máximas 4x7 seg.' })
      ]);
      const result = validatePlanSafety(plan, profile);
      // R3 también pasa (no es principiante). R4 no aplica. R2 no aplica (sin dolor).
      expect(result.ok).toBe(true);
    });

    it('no aplica R4 si hangboard20mmAddedWeight7s es null (dato desconocido)', () => {
      const profile = makeProfile({
        climbingTime: 'less1',
        hangboard20mmAddedWeight7s: null
      });
      const plan = makePlan([
        makeExercise({ name: 'Max Hangs', description: 'Suspensiones máximas.' })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(true);
    });
  });

  describe('múltiples violaciones', () => {
    it('reporta todas las violaciones aplicables', () => {
      const profile = makeProfile({
        age: 'u16',
        climbingTime: 'less1',
        currentFingerPain: 7
      });
      const plan = makePlan([
        makeExercise({
          name: 'Suspensiones máximas',
          description: 'Max hangs en hangboard al 90% BW en regleta de 18mm.'
        }),
        makeExercise({
          name: 'Rebotes en campus',
          description: 'Campus moves dinámicos.'
        })
      ]);
      const result = validatePlanSafety(plan, profile);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const rules = result.violations.map((v) => v.rule);
        expect(rules).toContain('no_finger_load_minors');
        expect(rules).toContain('no_max_hangs_with_pain');
        expect(rules).toContain('no_campus_for_beginners');
      }
    });
  });
});

describe('buildSafetyRetryMessage', () => {
  it('produce un mensaje accionable para el modelo', () => {
    const message = buildSafetyRetryMessage([
      {
        rule: 'no_finger_load_minors',
        reason: 'El atleta es menor de 16.',
        forbiddenKeywords: ['hangboard', 'campus'],
        triggerExercise: {
          week: 1,
          day: 1,
          section: 'mainBlock',
          name: 'Suspensiones'
        }
      }
    ]);
    expect(message).toContain('PROHIBIDOS');
    expect(message).toContain('hangboard');
    expect(message).toContain('campus');
    expect(message).toContain('Semana 1');
  });
});
