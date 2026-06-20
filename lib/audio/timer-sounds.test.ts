/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isTimerSoundEnabled,
  playCountdownBeep,
  playFinishBeep,
  playStartBeep,
  setTimerSoundEnabled
} from './timer-sounds';

// ---------- Mock AudioContext ----------

const startCalls: number[] = [];

class FakeOscillator {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn() };
  connect = vi.fn();
  start = vi.fn((t: number) => {
    startCalls.push(t);
  });
  stop = vi.fn();
}

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  };
  connect = vi.fn();
}

class FakeAudioContext {
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  createOscillator() {
    return new FakeOscillator();
  }
  createGain() {
    return new FakeGain();
  }
}

let audioCtor: typeof FakeAudioContext | undefined;

beforeEach(() => {
  startCalls.length = 0;
  audioCtor = FakeAudioContext;
  // Inyectamos la fake en window. Limpio cache del módulo entre tests para
  // que getContext() vuelva a construir el contexto.
  (window as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext = FakeAudioContext;
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isTimerSoundEnabled / setTimerSoundEnabled', () => {
  it('default true cuando no hay storage', () => {
    expect(isTimerSoundEnabled()).toBe(true);
  });

  it('persiste apagado y se lee como tal', () => {
    setTimerSoundEnabled(false);
    expect(isTimerSoundEnabled()).toBe(false);
  });

  it('persiste encendido', () => {
    setTimerSoundEnabled(false);
    setTimerSoundEnabled(true);
    expect(isTimerSoundEnabled()).toBe(true);
  });
});

describe('beeps', () => {
  it('playStartBeep arranca un oscilador cuando el sonido está habilitado', async () => {
    // Forzamos un nuevo import para resetear el AudioContext cacheado.
    vi.resetModules();
    const { playStartBeep: localPlay } = await import('./timer-sounds');
    localPlay();
    expect(startCalls.length).toBe(1);
  });

  it('es no-op cuando setTimerSoundEnabled(false)', async () => {
    vi.resetModules();
    const { playStartBeep: localPlay, setTimerSoundEnabled: localSet } = await import(
      './timer-sounds'
    );
    localSet(false);
    localPlay();
    expect(startCalls.length).toBe(0);
  });

  it('countdown y finish también honran el toggle', async () => {
    vi.resetModules();
    const {
      playCountdownBeep: localCount,
      playFinishBeep: localFinish,
      setTimerSoundEnabled: localSet
    } = await import('./timer-sounds');
    localSet(false);
    localCount();
    localFinish();
    expect(startCalls.length).toBe(0);
  });

  it('countdown y finish disparan oscilador cuando habilitado', async () => {
    vi.resetModules();
    const { playCountdownBeep: localCount, playFinishBeep: localFinish } = await import(
      './timer-sounds'
    );
    localCount();
    localFinish();
    expect(startCalls.length).toBe(2);
  });

  it('no crashea cuando no hay AudioContext en el browser', async () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    audioCtor = undefined;
    vi.resetModules();
    const { playStartBeep: localPlay } = await import('./timer-sounds');
    expect(() => localPlay()).not.toThrow();
  });

  // Trivial: keep audioCtor reference to silence "declared but never used"
  // in environments where the assignment in beforeEach() is the only read.
  it('audioCtor está exportado en el cierre del test (no-op)', () => {
    expect(audioCtor === undefined || typeof audioCtor === 'function').toBe(true);
  });
});
