/**
 * Perfiles + focus de los 5 golden cases del documento canónico v3.0.
 * Compartidos entre suite pool (offline) y suite live (con LLM).
 */

import type { FocusObject, Profile } from '../types';

// GC-001 · Caso Giuliana / regreso
// 32 años; 10+ años escalando; condición actual baja; 25mm ~5s; 3 domi
export const GC001_PROFILE: Profile = {
  age: 'adult',
  climbingTime: 'more3',
  hang25mmSeconds: 5,
  maxPullupReps: 3,
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  equipment: ['gym', 'hangboard', 'home', 'bands', 'weights', 'pullup_bar'],
  character: 'bill',
};

export const GC001_FOCUS: FocusObject = {
  phase: 'reconstruccion',
  primaryPriority: 'Tolerancia y técnica en muro',
  secondaryPriority: 'Dedos asistidos',
  avoid: ['Máximos', 'Borde mínimo', 'Lastre'],
  narrative:
    'Tu historial no define tu condición actual; reconstruimos desde donde estás.',
  maxRiskLevel: 'medium',
};

// GC-002 · Principiante del boom
// 6 meses; gym; condición principiante; sensible a precio; equipo limitado
export const GC002_PROFILE: Profile = {
  age: 'adult',
  climbingTime: 'less1',
  hang25mmSeconds: null, // aún no evaluado
  maxPullupReps: 2,
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  equipment: ['gym'], // solo gym, sin hangboard ni bandas
  character: 'bill',
};

export const GC002_FOCUS: FocusObject = {
  phase: 'base',
  primaryPriority: 'Base técnica en muro',
  secondaryPriority: 'Primer valor completable hoy',
  avoid: ['Jerga', 'Campus', 'Fingerboard de alto riesgo', 'Sesiones largas'],
  narrative:
    'Primera sesión: valor concreto hoy. Aprender antes de cargar. Técnica en el muro es lo que más rinde ahora.',
  maxRiskLevel: 'low-medium',
};

// GC-003 · Avanzado en forma
// V8 actual; 15s+ en 25mm; sin dolor; equipo disponible
// El TEST CRÍTICO: valida que el motor permite hangboard/PE al fuerte.
export const GC003_PROFILE: Profile = {
  age: 'adult',
  climbingTime: 'more3',
  hang25mmSeconds: 22, // 15s+ · desbloquea fuerza específica
  maxPullupReps: 18,   // 15+ · desbloquea pullups-weighted
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  equipment: ['gym', 'hangboard', 'campus', 'weights', 'rock', 'home', 'bands', 'pullup_bar'],
  character: 'bill',
};

export const GC003_FOCUS: FocusObject = {
  phase: 'especifica',
  primaryPriority: 'Fuerza específica de dedos',
  secondaryPriority: 'Power endurance selectivo',
  avoid: ['Full crimp forzado', 'Mono agarre sin base', 'Tests máximos automáticos'],
  narrative:
    'Condición actual desbloquea estímulos específicos. Cargamos con control y sin autorizar full crimp automático.',
  maxRiskLevel: 'high',
};

// GC-004 · Usuario "no sé"
// No conoce grado ni capacidad de dedos
export const GC004_PROFILE: Profile = {
  age: 'adult',
  climbingTime: '1to3',
  hang25mmSeconds: null, // no sabe
  maxPullupReps: null,   // no sabe
  currentFingerPain: 0,
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  equipment: ['gym', 'home'],
  character: 'bill',
};

export const GC004_FOCUS: FocusObject = {
  phase: 'conservador',
  primaryPriority: 'Práctica técnica y carga baja',
  secondaryPriority: 'Retest adelantado guiado',
  avoid: ['Máximos automáticos', 'Estímulos avanzados', 'Inferir capacidad'],
  narrative:
    'Todavía nos faltan datos: empezamos conservador y aprendemos con vos en las próximas sesiones.',
  maxRiskLevel: 'low-medium',
};

// GC-005 · Dolor actual
// Dolor actual en dedos (7/10) antes/durante sesión
export const GC005_PROFILE: Profile = {
  age: 'adult',
  climbingTime: 'more3',
  hang25mmSeconds: 15,
  maxPullupReps: 10,
  currentFingerPain: 7, // >= 3 · dispara gates de dolor
  currentShoulderPain: 0,
  currentElbowPain: 0,
  injuries: [],
  equipment: ['gym', 'hangboard', 'home', 'bands'],
  character: 'bill',
};

export const GC005_FOCUS: FocusObject = {
  phase: 'seguridad',
  primaryPriority: 'Seguridad y valoración',
  secondaryPriority: 'Contenido no relacionado con la zona afectada',
  avoid: ['Carga específica de la zona afectada', 'Diagnosticar'],
  narrative:
    'Primero protegemos la zona que hoy presenta dolor. El dolor manda hoy, la carga específica no.',
  maxRiskLevel: 'low',
};
