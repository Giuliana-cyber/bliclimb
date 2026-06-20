'use client';

/**
 * Beeps del temporizador generados con Web Audio API. Sin assets, sin
 * latencia de fetch, funciona offline.
 *
 * Stack:
 *   1. AudioContext (single instance, lazy)
 *   2. OscillatorNode + GainNode con envelope (attack 20ms, decay corto)
 *   3. Stop al final del decay para liberar nodos
 *
 * En iOS y algunos Chrome el contexto arranca suspended. Lo resumimos
 * sincrónicamente; como las funciones se llaman en respuesta a
 * interacciones del usuario (botón play o tick del timer post-play), el
 * navegador no debería bloquear.
 */

const STORAGE_KEY = 'bilclimb_timer_sound_enabled';

let cachedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (cachedContext) return cachedContext;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    cachedContext = new Ctor();
  } catch {
    cachedContext = null;
  }
  return cachedContext;
}

export function isTimerSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // default on
    return raw === '1';
  } catch {
    return true;
  }
}

export function setTimerSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // privado / cookies bloqueadas → silencioso
  }
}

type BeepParams = {
  /** Hz */
  frequency: number;
  /** Segundos totales del beep */
  duration: number;
  /** Pico de gain (0..1). El default es bajo (0.18) — ~oscilador suena fuerte. */
  peakGain?: number;
  /** sine | square | triangle | sawtooth */
  type?: OscillatorType;
};

function playTone({ frequency, duration, peakGain = 0.18, type = 'sine' }: BeepParams) {
  if (!isTimerSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    // Envelope: silencio → ataque rápido → decay exponencial → silencio.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  } catch {
    // Fallo silencioso — no queremos que un browser raro rompa la sesión.
  }
}

/** Beep al arrancar el timer. Tono medio (440 Hz), corto. */
export function playStartBeep(): void {
  playTone({ frequency: 440, duration: 0.15, peakGain: 0.16, type: 'sine' });
}

/** Beep de cuenta regresiva (5..1). Tono alto, muy corto. */
export function playCountdownBeep(): void {
  playTone({ frequency: 880, duration: 0.1, peakGain: 0.18, type: 'sine' });
}

/** Beep final tipo gym buzzer: tono bajo, largo, ligeramente más fuerte. */
export function playFinishBeep(): void {
  playTone({ frequency: 220, duration: 0.6, peakGain: 0.28, type: 'square' });
}
