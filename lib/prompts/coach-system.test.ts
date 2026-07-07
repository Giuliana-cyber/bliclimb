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
  'REGISTRO EN TEMAS ÍNTIMOS',
  'SALUD FEMENINA Y CICLO (aplica solo a Senda)',
  'DERIVACIONES CLÍNICAS (las sirve el sistema',
  'RED 3 — FALLBACK PARA DESCRIPCIÓN INDIRECTA',
  'ÁNGULO DEL TRABAJO MENTAL (aplica solo a Senda',
  // Distinción clave dentro del bloque de ciclo
  'VARIACIÓN NORMAL',
  'SEÑAL CLÍNICA'
];

// Los 3 mensajes de derivación clínica VERBATIM ya NO viven en el prompt —
// se sirven determinísticamente vía el orquestador de chat runtime,
// desde `lib/brain/messages/senda-derivations.ts`. El prompt solo tiene
// un puntero al sistema.
const SENDA_VERBATIM_NOT_IN_PROMPT = [
  'Gracias por contarme esto — y me alegra que lo notes',
  'este tema vale una consulta de verdad',
  'Gracias por confiarme esto. Que la menstruación',
  'un profesional que pueda verte de verdad',
  'Eso que me cuentas no suena a molestia normal',
  'Que alguien lo revise es cuidarte, no exagerar'
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

// -------------------- Derivaciones NO están inline en el prompt --------------------
// (viven en lib/brain/messages/senda-derivations.ts y las sirve el orquestador
//  de chat runtime — el prompt solo tiene un puntero al sistema)

describe('buildCoachSystemPrompt — derivaciones NO están inline en el prompt', () => {
  it('character="senda" NO incluye los verbatim inline (se sirven vía sistema)', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    for (const fragment of SENDA_VERBATIM_NOT_IN_PROMPT) {
      expect(
        p,
        `El prompt NO debe incluir el verbatim inline "${fragment}"`
      ).not.toContain(fragment);
    }
  });

  it('character="senda" tiene el puntero explícito al sistema', () => {
    const p = buildCoachSystemPrompt({ profile: baseProfile, character: 'senda' });
    expect(p).toContain('las sirve el sistema, NO las escribas vos');
  });
});
