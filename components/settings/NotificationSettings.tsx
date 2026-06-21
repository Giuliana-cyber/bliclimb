'use client';

// Sección "Notificaciones" dentro de /settings.
// - 3 toggles: dailyReminder, weeklySummary, coachUpdates.
// - "Desactivar todas las notificaciones" → unsubscribe del browser
//   + DELETE /api/push/unsubscribe + apaga los 3 toggles.

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Prefs = {
  dailyReminder: boolean;
  weeklySummary: boolean;
  coachUpdates: boolean;
};

const DEFAULT: Prefs = {
  dailyReminder: true,
  weeklySummary: true,
  coachUpdates: true
};

export function NotificationSettings({ hasCoach = false }: { hasCoach?: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notification-preferences');
        if (!res.ok) return;
        const data = (await res.json()) as { preferences?: Prefs };
        if (cancelled) return;
        if (data.preferences) setPrefs(data.preferences);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: Prefs) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });
      if (!res.ok) {
        setError('No pudimos guardar tus preferencias.');
        return;
      }
      setPrefs(next);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    void save(next);
  }

  async function revokeAll() {
    setRevoking(true);
    setError('');
    try {
      // 1. Sacarlo del navegador.
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe().catch(() => {
            // ignore
          });
          await fetch(
            `/api/push/unsubscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
            { method: 'DELETE' }
          ).catch(() => {
            // ignore
          });
        }
      }
      // 2. Apagar los 3 toggles del lado server.
      await save({ dailyReminder: false, weeklySummary: false, coachUpdates: false });
      // 3. Marcar opt-in local como off para que PushOptIn pueda volver a
      //    aparecer en el futuro si el usuario cambia de opinión.
      try {
        window.localStorage.removeItem('bilclimb_push_opted_in');
      } catch {
        // ignore
      }
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Bell aria-hidden="true" size={16} className="text-brand-cyan" strokeWidth={2.4} />
        <h3 className="text-sm font-extrabold text-white">Notificaciones</h3>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      <ToggleRow
        label="Recordatorio diario de sesión"
        description="Te avisamos por la mañana si tenés sesión programada."
        checked={prefs.dailyReminder}
        disabled={loading || saving}
        onChange={() => toggle('dailyReminder')}
      />
      <ToggleRow
        label="Resumen semanal"
        description="Cada lunes te mandamos el resumen de la semana anterior."
        checked={prefs.weeklySummary}
        disabled={loading || saving}
        onChange={() => toggle('weeklySummary')}
      />
      {hasCoach ? (
        <ToggleRow
          label="Notificaciones del coach"
          description="Te avisamos cuando tu coach publica un nuevo plan."
          checked={prefs.coachUpdates}
          disabled={loading || saving}
          onChange={() => toggle('coachUpdates')}
        />
      ) : null}

      <Button
        variant="secondary"
        onClick={revokeAll}
        disabled={revoking}
        className="!gap-2"
      >
        <BellOff size={14} aria-hidden="true" />
        {revoking ? 'Desactivando…' : 'Desactivar todas las notificaciones'}
      </Button>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="mt-0.5 text-[0.7rem] text-white/55">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 size-5 cursor-pointer rounded border border-white/15 bg-white/[0.04] accent-brand-cyan"
      />
    </label>
  );
}
