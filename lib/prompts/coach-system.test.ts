import { describe, expect, it } from 'vitest';
import { buildCoachSystemPrompt } from './coach-system';
import type { UserProfile } from '@/lib/profile';

// -------------------- Perfil mínimo para reusar --------------------
// Casteo a UserProfile porque el schema tiene muchos opcionales que no
// interesan en estos tests (comportamiento del prompt, no shape del perfil).
const baseProfile: UserProfile = {
  id: 'test-uuid',
  character: 'bill',
  name: 'Test',
  age: '26-35',
  climbingTime: '1to3',
  disciplines: ['sport'],
  goals: [],
  daysPerWeek: 3,
  sessionDuration: 90,
  maxSessionDuration: 120,
  equipment: ['gym'],
  injuries: [],
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  sleep: 'good',
  planDuration: 4,
  trainingAggressiveness: 'balanced'
} as unknown as UserProfile;

// -------------------- Bloques COMUNES que deben estar en AMBOS --------------------

const COMMON_SAFETY_MARKERS = [
  'SEGURIDAD (prioridad sobre todo)',
  'MIEDO, SEGURIDAD Y TRABAJO MENTAL',
  'Miedo y seguridad física (regla dura)',
  'Visualización requiere conocimiento de la vía',
  'El trabajo mental no sustituye',
  'Foco singular con atención a seguridad',
  'PESO Y NUTRICIÓN BÁSICA',
  'FUENTES Y CITAS'
];

describe('buildCoachSystemPrompt — bloques COMUNES aplican a Bill y a Senda', () => {
  it('Bill contiene todos los bloques de seguridad comunes', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'bill' });
    for (const m of COMMON_SAFETY_MARKERS) {
      expect(p, `Bill debe incluir "${m}"`).toContain(m);
    }
  });

  it('Senda contiene todos los bloques de seguridad comunes', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    for (const m of COMMON_SAFETY_MARKERS) {
      expect(p, `Senda debe incluir "${m}"`).toContain(m);
    }
  });
});

// -------------------- SENDA_PERSONA_BLOCK — solo aparece con character='senda' --------------------

const SENDA_ONLY_MARKERS = [
  'VOZ Y TONO (aplica solo a Senda)',
  'SALUD FEMENINA Y CICLO (aplica solo a Senda)',
  'DERIVACIONES CLÍNICAS (verbatim',
  'ÁNGULO DEL TRABAJO MENTAL (aplica solo a Senda',
  // Distinción clave dentro del bloque de ciclo
  'VARIACIÓN NORMAL',
  'SEÑAL CLÍNICA',
  // Los 3 verbatim (fragmentos representativos + inconfundibles)
  'Gracias por contarme esto',                     // Derivación 1 opening
  'este tema vale una consulta de verdad',         // Derivación 1 closing
  'Gracias por confiarme esto',                    // Derivación 2 opening
  'un profesional que pueda verte de verdad',      // Derivación 2 closing
  'Eso que me cuentas no suena a molestia normal', // Derivación 3 opening
  'Que alguien lo revise es cuidarte, no exagerar' // Derivación 3 closing
];

describe('buildCoachSystemPrompt — SENDA_PERSONA_BLOCK solo aparece con Senda', () => {
  it('character="senda" incluye el bloque completo', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    for (const m of SENDA_ONLY_MARKERS) {
      expect(p, `Senda debe incluir "${m}"`).toContain(m);
    }
  });

  it('character="bill" NO incluye NINGÚN marker del bloque de Senda', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'bill' });
    for (const m of SENDA_ONLY_MARKERS) {
      expect(p, `Bill NO debe incluir "${m}"`).not.toContain(m);
    }
  });

  it('character no seteado → default Bill → no incluye bloque de Senda', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile });
    expect(p).not.toContain('SALUD FEMENINA');
    expect(p).not.toContain('DERIVACIONES CLÍNICAS');
  });
});

// -------------------- Header y voz por personaje --------------------

describe('buildCoachSystemPrompt — nombre y voz difieren en el header', () => {
  it('Bill: "Eres Bill" + voz directa/energética', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'bill' });
    expect(p).toContain('Eres Bill,');
    expect(p).toContain('Bill: directo, energético, accionable');
    expect(p).not.toContain('Eres Senda,');
  });

  it('Senda: "Eres Senda" + voz serena/técnica', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    expect(p).toContain('Eres Senda,');
    expect(p).toContain('Senda: serena, técnica, reflexiva');
    expect(p).not.toContain('Eres Bill,');
  });
});

// -------------------- Template blocks runtime (PERFIL/PLAN/CHECK-INS) --------------------

describe('buildCoachSystemPrompt — bloques de datos runtime en ambos', () => {
  it('PERFIL/PLAN/CHECK-INS aparecen para Bill y Senda', () => {
    for (const character of ['bill', 'senda'] as const) {
      const p = buildCoachSystemPrompt({ profile: baseProfile, character });
      expect(p).toContain('PERFIL:');
      expect(p).toContain('PLAN:');
      expect(p).toContain('CHECK-INS RECIENTES:');
    }
  });
});

// -------------------- Derivaciones son texto verbatim inalterado --------------------

describe('buildCoachSystemPrompt — derivaciones son verbatim inalteradas', () => {
  it('Derivación 1 completa aparece letra por letra', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    const d1 =
      'Gracias por contarme esto — y me alegra que lo notes, porque es importante. ' +
      'Que el ciclo desaparezca cuando subes la carga de entrenamiento no es algo para dejar pasar ni para resolver acá entre nosotras: es una señal de que tu cuerpo puede estar bajo más estrés del que puede sostener, y eso lo tiene que ver un profesional de salud. ' +
      'No es para asustarte, es para cuidarte. Mientras tanto seguimos con tu escalada, pero este tema vale una consulta de verdad.';
    expect(p).toContain(d1);
  });

  it('Derivación 2 completa aparece letra por letra', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    const d2 =
      'Gracias por confiarme esto. Que la menstruación no aparezca por varios meses es de esas cosas que conviene mirar con alguien de salud — no para alarmarte, sino porque tu cuerpo te está contando algo y vale la pena entender qué. ' +
      'No es un tema para resolver solo con el entrenamiento. Yo te acompaño con tu escalada como siempre, pero esto merece una consulta con un profesional que pueda verte de verdad.';
    expect(p).toContain(d2);
  });

  it('Derivación 3 completa aparece letra por letra', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    const d3 =
      'Eso que me cuentas no suena a molestia normal, y no quiero que lo aguantes como si lo fuera. ' +
      'Un dolor que te frena o que es fuerte de verdad lo tiene que ver un profesional de salud — no es algo que debamos manejar acá entre las dos. ' +
      'Seguimos con tu entrenamiento en lo que puedas, pero por favor no dejes pasar ese dolor. Que alguien lo revise es cuidarte, no exagerar.';
    expect(p).toContain(d3);
  });
});
