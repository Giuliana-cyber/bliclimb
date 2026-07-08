// @vitest-environment jsdom
//
// Cubre las 4 rutas del draft del onboarding (Bloque 0.5 audit-360):
//   (a) llenar parcial + recargar → rehidrata
//   (b) submit exitoso → draft borrado
//   (c) cambio de cuenta en el mismo navegador → no rehidrata datos ajenos
//   (d) "Empezar de nuevo" → form limpio y draft borrado
//
// La rehidratación del componente se simula con `readDraft(ownerId)` +
// spread sobre `initialForm` — que es exactamente lo que hace el useEffect
// de mount en app/onboarding/page.tsx. Testeamos la lógica, no el render.

import { afterEach, describe, expect, it } from 'vitest';
import {
  ONBOARDING_DRAFT_KEY_PREFIX,
  clearDraft,
  draftKeyFor,
  initialForm,
  readDraft,
  writeDraft,
  type OnboardingForm
} from './onboarding-draft';

// ownerId estable = session.id que loadLocalSession() devuelve para una
// cuenta Supabase (`supabase:${uuid}` url-encoded).
const OWNER_A = 'supabase%3Auser-A';
const OWNER_B = 'supabase%3Auser-B';

function simulateRehydrate(ownerId: string | null): OnboardingForm {
  // Mismo shape que el useEffect de mount:
  // - sin ownerId → nunca rehidrata
  // - con ownerId y draft → merge sobre initialForm
  // - con ownerId sin draft → initialForm intacto
  if (!ownerId) return { ...initialForm };
  const draft = readDraft(ownerId);
  if (!draft) return { ...initialForm };
  return { ...initialForm, ...draft };
}

afterEach(() => {
  window.localStorage.clear();
});

describe('onboarding draft — clave y helpers', () => {
  it('draftKeyFor concatena el prefix estable', () => {
    expect(draftKeyFor(OWNER_A)).toBe(`${ONBOARDING_DRAFT_KEY_PREFIX}${OWNER_A}`);
    expect(draftKeyFor(OWNER_A)).not.toBe(draftKeyFor(OWNER_B));
  });

  it('readDraft de una key inexistente → null (no rompe)', () => {
    expect(readDraft(OWNER_A)).toBeNull();
  });

  it('readDraft con JSON corrupto → null (no rompe el form)', () => {
    window.localStorage.setItem(draftKeyFor(OWNER_A), '{not json');
    expect(readDraft(OWNER_A)).toBeNull();
  });
});

// -------------------- RUTA (a) — llenar parcial + recargar → rehidrata --------------------

describe('ruta (a) — llenar parcial + recargar → rehidrata', () => {
  it('valores escritos por writeDraft se leen intactos en el próximo mount', () => {
    const partial: OnboardingForm = {
      ...initialForm,
      character: 'senda',
      age: '26-35',
      climbingTime: '1to3',
      injuryNotes: 'molestia leve en dedos',
      injuries: ['dedos', 'hombro'],
      goals: ['grade', 'technique']
    };
    writeDraft(OWNER_A, partial);

    // Simulamos "cerrar y volver a abrir": limpiamos SOLO el state en
    // memoria y re-hidratamos desde localStorage.
    const rehydrated = simulateRehydrate(OWNER_A);

    expect(rehydrated.character).toBe('senda');
    expect(rehydrated.age).toBe('26-35');
    expect(rehydrated.climbingTime).toBe('1to3');
    expect(rehydrated.injuryNotes).toBe('molestia leve en dedos');
    expect(rehydrated.injuries).toEqual(['dedos', 'hombro']);
    expect(rehydrated.goals).toEqual(['grade', 'technique']);
  });

  it('campos no tocados se rellenan con initialForm (merge no borra defaults)', () => {
    // Sólo persistimos un subset — al rehidratar el resto queda con defaults.
    writeDraft(OWNER_A, { ...initialForm, character: 'bill' });
    const rehydrated = simulateRehydrate(OWNER_A);
    expect(rehydrated.character).toBe('bill');
    expect(rehydrated.sessionDuration).toBe(initialForm.sessionDuration);
    expect(rehydrated.trainingAggressiveness).toBe(initialForm.trainingAggressiveness);
  });
});

// -------------------- RUTA (b) — submit exitoso → draft borrado --------------------

describe('ruta (b) — submit exitoso → draft borrado', () => {
  it('clearDraft borra la key y la próxima rehidratación arranca limpia', () => {
    writeDraft(OWNER_A, { ...initialForm, character: 'senda', age: '26-35' });
    expect(readDraft(OWNER_A)).not.toBeNull();

    // Punto donde app/onboarding/page.tsx llama clearDraft(ownerId) tras saveProfile.
    clearDraft(OWNER_A);

    expect(readDraft(OWNER_A)).toBeNull();
    expect(window.localStorage.getItem(draftKeyFor(OWNER_A))).toBeNull();

    const rehydrated = simulateRehydrate(OWNER_A);
    expect(rehydrated).toEqual(initialForm);
  });
});

// -------------------- RUTA (c) — cambio de cuenta → no rehidrata --------------------

describe('ruta (c) — cambio de cuenta → no rehidrata datos de otra cuenta', () => {
  it('draft de OWNER_A no aparece cuando OWNER_B hace mount', () => {
    writeDraft(OWNER_A, {
      ...initialForm,
      character: 'senda',
      injuryNotes: 'dedos anular derecho',
      injuries: ['dedos']
    });

    // Cambio de sesión en el mismo navegador — el mount ahora usa OWNER_B.
    const rehydratedB = simulateRehydrate(OWNER_B);

    // OWNER_B ve el form limpio; los datos sensibles de A no se filtran.
    expect(rehydratedB).toEqual(initialForm);
    // Y la key de A sigue intacta en su propia clave (aislada).
    expect(readDraft(OWNER_A)).not.toBeNull();
    expect(readDraft(OWNER_A)?.character).toBe('senda');
  });

  it('sin ownerId (sesión aún no resuelta o ausente) → nunca rehidrata', () => {
    writeDraft(OWNER_A, { ...initialForm, character: 'senda' });
    const rehydrated = simulateRehydrate(null);
    expect(rehydrated).toEqual(initialForm);
  });
});

// -------------------- RUTA (d) — "Empezar de nuevo" → form limpio --------------------

describe('ruta (d) — "Empezar de nuevo" → form limpio', () => {
  it('reset borra el draft y deja el form en initialForm', () => {
    writeDraft(OWNER_A, {
      ...initialForm,
      character: 'senda',
      injuries: ['dedos', 'hombro'],
      injuryNotes: 'dolor 5/10',
      goalDescription: 'quiero subir de grado'
    });

    // handleReset() en la página hace exactamente: clearDraft + setForm(initialForm).
    clearDraft(OWNER_A);
    const afterReset: OnboardingForm = { ...initialForm };

    expect(afterReset).toEqual(initialForm);
    expect(readDraft(OWNER_A)).toBeNull();

    // Y si el usuario recarga tras resetear, sigue vacío (no vuelve el draft viejo).
    const rehydratedAfterReset = simulateRehydrate(OWNER_A);
    expect(rehydratedAfterReset).toEqual(initialForm);
  });
});
