'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Moon, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { loadCheckIns, type CheckIn } from '@/lib/checkin';
import { loadTrainingPlan, type TrainingPlan } from '@/lib/plan';
import { withDerivedCurrentWeek } from '@/lib/training/current-session';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date);
}

function getAverage(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ProgressDashboard() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  useEffect(() => {
    const storedPlan = loadTrainingPlan();
    setPlan(storedPlan ? withDerivedCurrentWeek(storedPlan) : null);
    setCheckIns(loadCheckIns());
  }, []);

  const allSessions = useMemo(() => plan?.weeks.flatMap((w) => w.sessions) ?? [], [plan]);
  const completedSessions = allSessions.filter((s) => s.completed).length;
  const adherence = allSessions.length
    ? Math.round((completedSessions / allSessions.length) * 100)
    : 0;
  const averageRpe = getAverage(checkIns.map((c) => c.rpe));
  const averageEnergy = getAverage(checkIns.map((c) => c.energy));
  const averageSleep = getAverage(checkIns.map((c) => c.sleep));
  const latestFingerPain = checkIns[0]?.fingerPain ?? 0;
  const chartCheckIns = [...checkIns].reverse().slice(-8);
  const manualActivities = checkIns.filter((c) => c.manualActivity);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">
          Mi progreso
        </p>
        <h1 className="text-3xl font-extrabold leading-tight">Historial de entrenamiento</h1>
        <p className="text-sm leading-6 text-white/64">
          Tendencias simples para entender carga, energía y señales de dolor.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Stat
          label="Completadas"
          value={plan ? `${completedSessions}/${allSessions.length}` : '0'}
          icon={CheckCircle2}
          tone="cyan"
        />
        <Stat label="Adherencia" value={`${adherence}%`} icon={BarChart3} tone="mustard" />
        <Stat
          label="RPE promedio"
          value={averageRpe ? averageRpe.toFixed(1) : '—'}
          icon={Activity}
          tone="cyan"
        />
        <Stat
          label="Dolor dedos"
          value={`${latestFingerPain}/10`}
          icon={AlertTriangle}
          tone="coral"
        />
        <Stat
          label="Energía"
          value={averageEnergy ? `${averageEnergy.toFixed(1)}/5` : '—'}
          icon={Zap}
          tone="mustard"
        />
        <Stat
          label="Sueño"
          value={averageSleep ? `${averageSleep.toFixed(1)}/5` : '—'}
          icon={Moon}
          tone="cyan"
        />
      </div>

      <LineChart
        title="RPE por sesión"
        max={10}
        values={chartCheckIns.map((c) => c.rpe)}
        labels={chartCheckIns.map((_, i) => `S${i + 1}`)}
        color="#00d4aa"
      />

      <LineChart
        title="Dolor de dedos"
        max={10}
        values={chartCheckIns.map((c) => c.fingerPain)}
        labels={chartCheckIns.map((_, i) => `S${i + 1}`)}
        color="#e8b931"
      />

      {averageEnergy > 0 ? (
        <Card>
          <p className="text-sm font-bold text-white">Energía promedio</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-gradient-cyan shadow-glow"
              initial={{ width: 0 }}
              animate={{ width: `${(averageEnergy / 5) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-sm text-white/60">{averageEnergy.toFixed(1)} de 5</p>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Actividades manuales</h2>
        {manualActivities.length ? (
          manualActivities.slice(0, 6).map((checkIn) => (
            <Card key={`manual-${checkIn.id}`} variant="hero" className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
                    {formatDate(checkIn.date)}
                  </p>
                  <h3 className="mt-1 text-base font-extrabold text-white">
                    {checkIn.manualActivity?.title ?? 'Actividad libre'}
                  </h3>
                </div>
                {checkIn.manualActivity?.customizedPlan ? (
                  <span className="rounded-full border border-brand-cyan/40 px-2.5 py-0.5 text-xs font-bold text-brand-cyan">
                    adaptación
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-bold text-white/60">
                {checkIn.manualActivity?.location || 'libre'}
                {checkIn.manualActivity?.durationMinutes
                  ? ` · ${checkIn.manualActivity.durationMinutes} min`
                  : ''}
              </p>
              {checkIn.manualActivity?.details ? (
                <p className="mt-2 text-sm leading-6 text-white/72">
                  {checkIn.manualActivity.details}
                </p>
              ) : null}
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm leading-6 text-white/68">
              Cuando hagas roca, movilidad o fuerza fuera del plan, quedará registrado aquí.
            </p>
            <Button variant="secondary" href="/checkin?manual=1" className="mt-4 w-full">
              Registrar actividad manual
            </Button>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Últimos check-ins</h2>
        {checkIns.length ? (
          checkIns.slice(0, 8).map((checkIn) => (
            <Card key={checkIn.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-white">{formatDate(checkIn.date)}</p>
                  <p className="mt-1 text-sm text-white/60">
                    RPE {checkIn.rpe} · Dedos {checkIn.fingerPain} · Energía {checkIn.energy}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-bold text-white/55">
                  {checkIn.manualActivity ? 'manual' : checkIn.completed}
                </span>
              </div>
              {checkIn.manualActivity ? (
                <div className="mt-3 rounded-xl border border-brand-cyan/25 bg-brand-cyan/[0.06] p-3">
                  <p className="text-sm font-extrabold text-white">{checkIn.manualActivity.title}</p>
                  <p className="mt-1 text-xs font-bold text-white/55">
                    {checkIn.manualActivity.location}
                    {checkIn.manualActivity.durationMinutes
                      ? ` · ${checkIn.manualActivity.durationMinutes} min`
                      : ''}
                    {checkIn.manualActivity.customizedPlan ? ' · adaptación del plan' : ''}
                  </p>
                  {checkIn.manualActivity.details ? (
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      {checkIn.manualActivity.details}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {checkIn.notes ? (
                <p className="mt-3 text-sm leading-6 text-white/68">{checkIn.notes}</p>
              ) : null}
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm leading-6 text-white/68">
              Todavía no hay check-ins. Registra cómo te fue al terminar tu próxima sesión.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button href="/session" className="w-full">
                Ir a sesión
              </Button>
              <Button variant="secondary" href="/checkin?manual=1" className="w-full">
                Registrar manual
              </Button>
            </div>
          </Card>
        )}
      </section>
    </motion.section>
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
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-extrabold">{title}</h2>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/45">
          {values.length} sesiones
        </p>
      </div>

      {values.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="h-44 w-full">
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="rgba(255,255,255,0.10)"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="rgba(255,255,255,0.10)"
          />
          {points.length > 1 ? (
            <polygon
              fill={`url(#grad-${color.replace('#', '')})`}
              points={`${points[0].split(',')[0]},${height - padding} ${points.join(' ')} ${points[points.length - 1].split(',')[0]},${height - padding}`}
            />
          ) : null}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.join(' ')}
          />
          {points.map((point, index) => {
            const [x, y] = point.split(',').map(Number);
            return (
              <circle
                key={point}
                cx={x}
                cy={y}
                r="4"
                fill={color}
                aria-label={`${labels[index]} ${values[index]}`}
              />
            );
          })}
        </svg>
      ) : (
        <div className="grid h-44 place-items-center rounded-xl border border-white/8 bg-brand-deep/40 text-sm text-white/45">
          Sin datos todavía
        </div>
      )}
    </Card>
  );
}
