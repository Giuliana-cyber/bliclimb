'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2, Plus, Save, Send, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  emptyExercise,
  emptyPlanData,
  emptySession,
  emptyWeek,
  type CoachExercise,
  type CoachPlanData,
  type CoachSession,
  type CoachWeek
} from '@/lib/coach/plan-data';

type Props = {
  planId: string;
  initialTitle: string;
  initialObjective: string;
  initialDurationWeeks: number;
  initialPlanData: CoachPlanData;
  status: 'draft' | 'published' | 'archived';
};

type Block = 'warmup' | 'mainBlock' | 'cooldown';

export function PlanEditor(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.initialTitle);
  const [objective, setObjective] = useState(props.initialObjective);
  const [durationWeeks, setDurationWeeks] = useState(props.initialDurationWeeks);
  const [planData, setPlanData] = useState<CoachPlanData>(
    props.initialPlanData.weeks.length ? props.initialPlanData : emptyPlanData(props.initialDurationWeeks)
  );
  const [status] = useState(props.status);
  const [saving, setSaving] = useState<'idle' | 'save' | 'publish' | 'archive'>('idle');
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function updateWeek(index: number, mut: (w: CoachWeek) => CoachWeek) {
    setPlanData((p) => ({
      ...p,
      weeks: p.weeks.map((w, i) => (i === index ? mut(w) : w))
    }));
  }

  function updateSession(weekIdx: number, sessIdx: number, mut: (s: CoachSession) => CoachSession) {
    updateWeek(weekIdx, (w) => ({
      ...w,
      sessions: w.sessions.map((s, j) => (j === sessIdx ? mut(s) : s))
    }));
  }

  function addSession(weekIdx: number) {
    updateWeek(weekIdx, (w) => ({
      ...w,
      sessions: [...w.sessions, emptySession(w.sessions.length + 1)]
    }));
  }

  function removeSession(weekIdx: number, sessIdx: number) {
    updateWeek(weekIdx, (w) => ({
      ...w,
      sessions: w.sessions.filter((_, j) => j !== sessIdx).map((s, j) => ({ ...s, dayNumber: j + 1 }))
    }));
  }

  function addExercise(weekIdx: number, sessIdx: number, block: Block) {
    updateSession(weekIdx, sessIdx, (s) => ({
      ...s,
      [block]: [...s[block], emptyExercise()]
    }));
  }

  function updateExercise(
    weekIdx: number,
    sessIdx: number,
    block: Block,
    exIdx: number,
    field: keyof CoachExercise,
    value: string | number | null
  ) {
    updateSession(weekIdx, sessIdx, (s) => ({
      ...s,
      [block]: s[block].map((ex, k) => (k === exIdx ? { ...ex, [field]: value } : ex))
    }));
  }

  function removeExercise(weekIdx: number, sessIdx: number, block: Block, exIdx: number) {
    updateSession(weekIdx, sessIdx, (s) => ({
      ...s,
      [block]: s[block].filter((_, k) => k !== exIdx)
    }));
  }

  function syncDurationWeeks(next: number) {
    setDurationWeeks(next);
    setPlanData((p) => {
      const weeks = [...p.weeks];
      while (weeks.length < next) weeks.push(emptyWeek(weeks.length + 1));
      while (weeks.length > next) weeks.pop();
      return { weeks };
    });
  }

  async function save() {
    setSaving('save');
    setError('');
    try {
      const r = await fetch(`/api/coach/plans/${props.planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          objective: objective || null,
          durationWeeks,
          planData
        })
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'No pudimos guardar.');
        return;
      }
      setSavedAt(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setSaving('idle');
    }
  }

  async function action(kind: 'publish' | 'archive') {
    setSaving(kind);
    setError('');
    try {
      // Antes de publicar, guardamos el último estado.
      if (kind === 'publish') {
        await save();
      }
      const r = await fetch(`/api/coach/plans/${props.planId}?action=${kind}`, { method: 'POST' });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `No pudimos ${kind === 'publish' ? 'publicar' : 'archivar'}.`);
        return;
      }
      router.push('/coach/clients');
    } finally {
      setSaving('idle');
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-white/72">
            Título del plan
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-brand-cyan/60"
            />
          </label>
          <label className="block text-xs font-bold text-white/72">
            Duración (semanas)
            <input
              type="number"
              min={1}
              max={12}
              value={durationWeeks}
              onChange={(e) => syncDurationWeeks(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-brand-cyan/60"
            />
          </label>
        </div>
        <label className="block text-xs font-bold text-white/72">
          Objetivo
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-brand-cyan/60"
          />
        </label>
      </Card>

      {planData.weeks.map((week, wi) => (
        <Card key={wi} className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-cyan/15 px-2 py-0.5 text-[0.65rem] font-extrabold text-brand-cyan">
              Semana {week.weekNumber}
            </span>
            <input
              value={week.theme}
              onChange={(e) => updateWeek(wi, (w) => ({ ...w, theme: e.target.value }))}
              placeholder="Título de la semana"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-brand-cyan/60"
            />
          </div>
          <textarea
            value={week.objective ?? ''}
            onChange={(e) =>
              updateWeek(wi, (w) => ({ ...w, objective: e.target.value || null }))
            }
            placeholder="Objetivo de la semana (opcional)"
            rows={1}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan/60"
          />

          {week.sessions.map((session, si) => (
            <div
              key={si}
              className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold text-white/85">
                  Día {session.dayNumber}
                </span>
                <input
                  value={session.title}
                  onChange={(e) =>
                    updateSession(wi, si, (s) => ({ ...s, title: e.target.value }))
                  }
                  placeholder="Nombre de la sesión"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-white outline-none focus:border-brand-cyan/60"
                />
                <button
                  type="button"
                  onClick={() => removeSession(wi, si)}
                  aria-label="Eliminar sesión"
                  className="text-white/45 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  value={session.location}
                  onChange={(e) =>
                    updateSession(wi, si, (s) => ({ ...s, location: e.target.value }))
                  }
                  placeholder="Lugar"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white outline-none focus:border-brand-cyan/60"
                />
                <input
                  type="number"
                  value={session.estimatedMinutes}
                  onChange={(e) =>
                    updateSession(wi, si, (s) => ({
                      ...s,
                      estimatedMinutes: Math.max(5, Math.min(360, Number(e.target.value) || 5))
                    }))
                  }
                  placeholder="Min"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white outline-none focus:border-brand-cyan/60"
                />
                <input
                  value={session.intensityTarget ?? ''}
                  onChange={(e) =>
                    updateSession(wi, si, (s) => ({
                      ...s,
                      intensityTarget: e.target.value || null
                    }))
                  }
                  placeholder="Intensidad"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white outline-none focus:border-brand-cyan/60"
                />
                <input
                  value={session.objective ?? ''}
                  onChange={(e) =>
                    updateSession(wi, si, (s) => ({
                      ...s,
                      objective: e.target.value || null
                    }))
                  }
                  placeholder="Objetivo (opcional)"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white outline-none focus:border-brand-cyan/60"
                />
              </div>

              {(['warmup', 'mainBlock', 'cooldown'] as Block[]).map((block) => (
                <BlockEditor
                  key={block}
                  label={
                    block === 'warmup'
                      ? 'Calentamiento'
                      : block === 'mainBlock'
                      ? 'Bloque principal'
                      : 'Vuelta a la calma'
                  }
                  exercises={session[block]}
                  onChange={(field, exIdx, value) =>
                    updateExercise(wi, si, block, exIdx, field, value)
                  }
                  onAdd={() => addExercise(wi, si, block)}
                  onRemove={(exIdx) => removeExercise(wi, si, block, exIdx)}
                />
              ))}
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() => addSession(wi)}
            className="gap-1"
                      >
            <Plus size={12} aria-hidden="true" /> Agregar sesión
          </Button>
        </Card>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-brand-dark/95 px-4 py-3 backdrop-blur-xl">
        <p className="text-[0.65rem] text-white/55">
          Estado: <span className="font-bold text-white">{status}</span>
          {savedAt ? ` · Guardado ${savedAt}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={saving !== 'idle'} variant="secondary" className="gap-1">
            {saving === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Guardar borrador
          </Button>
          <Button
            onClick={() => action('publish')}
            disabled={saving !== 'idle'}
            variant="primary"
                        className="gap-1"
          >
            {saving === 'publish' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Publicar
          </Button>
          {status === 'published' ? (
            <Button
              onClick={() => action('archive')}
              disabled={saving !== 'idle'}
              variant="ghost"
                            className="gap-1"
            >
              {saving === 'archive' ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
              Archivar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BlockEditor({
  label,
  exercises,
  onChange,
  onAdd,
  onRemove
}: {
  label: string;
  exercises: CoachExercise[];
  onChange: (field: keyof CoachExercise, exIdx: number, value: string | number | null) => void;
  onAdd: () => void;
  onRemove: (exIdx: number) => void;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/55">{label}</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md bg-brand-cyan/15 px-2 py-0.5 text-[0.65rem] font-bold text-brand-cyan"
        >
          <Plus size={10} /> ejercicio
        </button>
      </div>
      {exercises.length === 0 ? (
        <p className="text-[0.65rem] text-white/45">—</p>
      ) : (
        <div className="space-y-1.5">
          {exercises.map((ex, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1.5">
              <input
                value={ex.name}
                onChange={(e) => onChange('name', idx, e.target.value)}
                placeholder="Nombre"
                className="col-span-4 rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.7rem] text-white outline-none focus:border-brand-cyan/60"
              />
              <input
                type="number"
                value={ex.sets ?? ''}
                onChange={(e) =>
                  onChange('sets', idx, e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="Sets"
                className="col-span-1 rounded border border-white/10 bg-white/[0.04] px-1 py-1 text-[0.7rem] text-white outline-none focus:border-brand-cyan/60"
              />
              <input
                value={ex.reps ?? ''}
                onChange={(e) => onChange('reps', idx, e.target.value || null)}
                placeholder="Reps"
                className="col-span-2 rounded border border-white/10 bg-white/[0.04] px-1 py-1 text-[0.7rem] text-white outline-none focus:border-brand-cyan/60"
              />
              <input
                value={ex.rest ?? ''}
                onChange={(e) => onChange('rest', idx, e.target.value || null)}
                placeholder="Descanso"
                className="col-span-2 rounded border border-white/10 bg-white/[0.04] px-1 py-1 text-[0.7rem] text-white outline-none focus:border-brand-cyan/60"
              />
              <input
                value={ex.intensity ?? ''}
                onChange={(e) => onChange('intensity', idx, e.target.value || null)}
                placeholder="Intensidad"
                className="col-span-2 rounded border border-white/10 bg-white/[0.04] px-1 py-1 text-[0.7rem] text-white outline-none focus:border-brand-cyan/60"
              />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                aria-label="Eliminar ejercicio"
                className="col-span-1 grid place-items-center text-white/45 hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
              <input
                value={ex.notes ?? ''}
                onChange={(e) => onChange('notes', idx, e.target.value || null)}
                placeholder="Notas (opcional)"
                className="col-span-12 rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-[0.7rem] text-white/85 outline-none focus:border-brand-cyan/60"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
