'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, BarChart3, CheckCircle2 } from 'lucide-react';
import { loadCheckIns, type CheckIn } from '@/lib/checkin';
import { loadTrainingPlan, type TrainingPlan } from '@/lib/plan';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short'
  }).format(date);
}

function getAverage(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ProgressDashboard() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    setPlan(loadTrainingPlan());
    setCheckIns(loadCheckIns());
  }, []);

  const allSessions = useMemo(() => {
    return plan?.weeks.flatMap((week) => week.sessions) ?? [];
  }, [plan]);

  const completedSessions = allSessions.filter((session) => session.completed).length;
  const adherence = allSessions.length ? Math.round((completedSessions / allSessions.length) * 100) : 0;
  const averageRpe = getAverage(checkIns.map((checkIn) => checkIn.rpe));
  const averageEnergy = getAverage(checkIns.map((checkIn) => checkIn.energy));
  const latestFingerPain = checkIns[0]?.fingerPain ?? 0;
  const chartCheckIns = [...checkIns].reverse().slice(-8);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand-cyan">Mi Progreso</p>
        <h1 className="mt-2 text-3xl font-bold">Historial de entrenamiento</h1>
        <p className="mt-2 text-sm leading-6 text-white/58">
          Tendencias simples para entender carga, energía y señales de dolor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={CheckCircle2}
          label="Sesiones completadas"
          value={plan ? `${completedSessions}/${allSessions.length}` : '0'}
        />
        <Metric icon={BarChart3} label="Adherencia" value={`${adherence}%`} />
        <Metric icon={Activity} label="RPE promedio" value={averageRpe ? averageRpe.toFixed(1) : '-'} />
        <Metric icon={AlertTriangle} label="Dolor dedos" value={`${latestFingerPain}/10`} />
      </div>

      <LineChart
        title="RPE por sesión"
        max={10}
        values={chartCheckIns.map((checkIn) => checkIn.rpe)}
        labels={chartCheckIns.map((checkIn, index) => `S${index + 1}`)}
        color="#00d4aa"
      />

      <LineChart
        title="Dolor de dedos"
        max={10}
        values={chartCheckIns.map((checkIn) => checkIn.fingerPain)}
        labels={chartCheckIns.map((checkIn, index) => `S${index + 1}`)}
        color="#e8b931"
      />

      {averageEnergy > 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-bold text-white">Energía promedio</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-cyan"
              style={{ width: `${(averageEnergy / 5) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-white/58">{averageEnergy.toFixed(1)} de 5</p>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-xl font-bold">Últimos check-ins</h2>
        {checkIns.length ? (
          <div className="space-y-3">
            {checkIns.slice(0, 8).map((checkIn) => (
              <article key={checkIn.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{formatDate(checkIn.date)}</p>
                    <p className="mt-1 text-sm text-white/58">
                      RPE: {checkIn.rpe} | Dedos: {checkIn.fingerPain} | Energía: {checkIn.energy}
                    </p>
                  </div>
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs font-bold text-white/58">
                    {checkIn.completed}
                  </span>
                </div>
                {checkIn.notes ? (
                  <p className="mt-3 text-sm leading-6 text-white/68">{checkIn.notes}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm leading-6 text-white/68">
              Todavía no hay check-ins. Registra cómo te fue al terminar tu próxima sesión.
            </p>
            <Link
              href="/session"
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark"
            >
              Ir a sesión
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <Icon aria-hidden="true" size={21} className="text-brand-cyan" />
      <p className="mt-3 text-xs font-semibold text-white/46">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function LineChart({
  title,
  values,
  labels,
  max,
  color
}: {
  title: string;
  values: number[];
  labels: string[];
  max: number;
  color: string;
}) {
  const width = 320;
  const height = 150;
  const padding = 24;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? padding : padding + (index / (values.length - 1)) * usableWidth;
    const y = padding + (1 - value / max) * usableHeight;
    return `${x},${y}`;
  });

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm font-semibold text-white/46">{values.length} sesiones</p>
      </div>

      {values.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="h-44 w-full">
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.18)" />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="rgba(255,255,255,0.18)"
          />
          <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points.join(' ')} />
          {points.map((point, index) => {
            const [x, y] = point.split(',').map(Number);
            return <circle key={point} cx={x} cy={y} r="4" fill={color} aria-label={`${labels[index]} ${values[index]}`} />;
          })}
        </svg>
      ) : (
        <div className="grid h-44 place-items-center rounded-md border border-white/10 bg-brand-dark/32 text-sm text-white/48">
          Sin datos todavía
        </div>
      )}
    </div>
  );
}
