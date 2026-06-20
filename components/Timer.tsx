'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  isTimerSoundEnabled,
  playCountdownBeep,
  playFinishBeep,
  playStartBeep,
  setTimerSoundEnabled
} from '@/lib/audio/timer-sounds';

type TimerProps = {
  initialSeconds: number;
  label?: string;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function Timer({ initialSeconds, label = 'Timer' }: TimerProps) {
  const safeInitialSeconds = Math.max(0, Math.floor(initialSeconds));
  const [remainingSeconds, setRemainingSeconds] = useState(safeInitialSeconds);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const completedRef = useRef(false);
  const previousRemainingRef = useRef(safeInitialSeconds);

  // Cargar preferencia persistida al montar.
  useEffect(() => {
    setSoundOn(isTimerSoundEnabled());
  }, []);

  useEffect(() => {
    setRemainingSeconds(safeInitialSeconds);
    setRunning(false);
    completedRef.current = false;
    previousRemainingRef.current = safeInitialSeconds;
  }, [safeInitialSeconds]);

  useEffect(() => {
    if (!running) return undefined;

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  // Cuenta regresiva: cuando running, en los últimos 5 segundos disparamos
  // un countdown beep por cada tick (5, 4, 3, 2, 1). Lo hacemos comparando
  // el valor previo para que no suene en pausas.
  useEffect(() => {
    if (!running) {
      previousRemainingRef.current = remainingSeconds;
      return;
    }
    const previous = previousRemainingRef.current;
    if (
      previous !== remainingSeconds &&
      remainingSeconds > 0 &&
      remainingSeconds <= 5
    ) {
      playCountdownBeep();
    }
    previousRemainingRef.current = remainingSeconds;
  }, [running, remainingSeconds]);

  useEffect(() => {
    if (remainingSeconds > 0 || completedRef.current) return;
    if (running) {
      setRunning(false);
      completedRef.current = true;
      playFinishBeep();
    }
  }, [remainingSeconds, running]);

  const progress = useMemo(() => {
    if (safeInitialSeconds === 0) return 100;
    return ((safeInitialSeconds - remainingSeconds) / safeInitialSeconds) * 100;
  }, [remainingSeconds, safeInitialSeconds]);

  const handleToggleRun = useCallback(() => {
    setRunning((current) => {
      const next = !current;
      if (next) playStartBeep();
      return next;
    });
  }, []);

  function resetTimer() {
    setRunning(false);
    setRemainingSeconds(safeInitialSeconds);
    completedRef.current = false;
    previousRemainingRef.current = safeInitialSeconds;
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setTimerSoundEnabled(next);
  }

  return (
    <div className="rounded-md border border-white/10 bg-brand-dark/52 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white/46">{label}</p>
          <p className="mt-1 tabular-nums text-2xl font-bold text-white">
            {formatTime(remainingSeconds)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="grid size-10 place-items-center rounded-md border border-white/10 text-white/68 transition hover:border-white/24 hover:text-white"
            aria-label={
              soundOn ? 'Desactivar sonido del temporizador' : 'Activar sonido del temporizador'
            }
            aria-pressed={soundOn}
            title={soundOn ? 'Silenciar' : 'Activar sonido'}
          >
            {soundOn ? (
              <Volume2 aria-hidden="true" size={17} strokeWidth={2.4} />
            ) : (
              <VolumeX aria-hidden="true" size={17} strokeWidth={2.4} />
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleRun}
            disabled={safeInitialSeconds === 0}
            className="grid size-10 place-items-center rounded-md bg-brand-cyan text-brand-dark transition hover:bg-brand-cyan/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/36"
            aria-label={running ? 'Pausar timer' : 'Iniciar timer'}
            title={running ? 'Pausar' : 'Iniciar'}
          >
            {running ? (
              <Pause aria-hidden="true" size={18} strokeWidth={2.8} />
            ) : (
              <Play aria-hidden="true" size={18} strokeWidth={2.8} />
            )}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="grid size-10 place-items-center rounded-md border border-white/10 text-white/68 transition hover:border-white/24 hover:text-white"
            aria-label="Reiniciar timer"
            title="Reiniciar"
          >
            <RotateCcw aria-hidden="true" size={17} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-brand-cyan transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
