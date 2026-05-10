'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type TimerProps = {
  initialSeconds: number;
  label?: string;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function playDoneSound() {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(720, context.currentTime);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.38);
}

export function Timer({ initialSeconds, label = 'Timer' }: TimerProps) {
  const safeInitialSeconds = Math.max(0, Math.floor(initialSeconds));
  const [remainingSeconds, setRemainingSeconds] = useState(safeInitialSeconds);
  const [running, setRunning] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    setRemainingSeconds(safeInitialSeconds);
    setRunning(false);
    completedRef.current = false;
  }, [safeInitialSeconds]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (remainingSeconds > 0 || completedRef.current) {
      return;
    }

    if (running) {
      setRunning(false);
      completedRef.current = true;
      playDoneSound();
    }
  }, [remainingSeconds, running]);

  const progress = useMemo(() => {
    if (safeInitialSeconds === 0) {
      return 100;
    }

    return ((safeInitialSeconds - remainingSeconds) / safeInitialSeconds) * 100;
  }, [remainingSeconds, safeInitialSeconds]);

  function resetTimer() {
    setRunning(false);
    setRemainingSeconds(safeInitialSeconds);
    completedRef.current = false;
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
            onClick={() => setRunning((current) => !current)}
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
