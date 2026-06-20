'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Client = { id: string; name: string | null };

export function NewPlanForm({
  clients,
  preselectedClientId
}: {
  clients: Client[];
  preselectedClientId?: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(preselectedClientId ?? clients[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/coach/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, title, objective, durationWeeks })
      });
      const data = (await r.json()) as { id?: string; error?: string };
      if (!r.ok || !data.id) {
        setError(data.error ?? 'No pudimos crear el borrador.');
        return;
      }
      router.push(`/coach/plans/${data.id}/edit`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <label className="block text-xs font-bold text-white/72">
        Cliente
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-brand-cyan/60"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-bold text-white/72">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bloque fuerza 4 semanas"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-brand-cyan/60"
        />
      </label>
      <label className="block text-xs font-bold text-white/72">
        Objetivo (opcional)
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-brand-cyan/60"
        />
      </label>
      <label className="block text-xs font-bold text-white/72">
        Duración (semanas)
        <input
          type="number"
          min={1}
          max={12}
          value={durationWeeks}
          onChange={(e) =>
            setDurationWeeks(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
          }
          className="mt-1 w-32 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-brand-cyan/60"
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      <Button onClick={submit} disabled={loading || !title || !clientId} className="gap-1">
        {loading ? <Loader2 size={12} className="animate-spin" /> : null}
        Crear borrador y empezar
      </Button>
    </Card>
  );
}
