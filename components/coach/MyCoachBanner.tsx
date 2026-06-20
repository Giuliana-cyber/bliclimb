'use client';

import { useEffect, useState } from 'react';
import { UserRoundCheck } from 'lucide-react';

type MyCoach = { coachId: string; name: string | null };

export function MyCoachBanner() {
  const [coach, setCoach] = useState<MyCoach | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/coach/my-coach')
      .then((r) => r.json() as Promise<{ coach: MyCoach | null }>)
      .then((data) => {
        if (cancelled) return;
        if (data.coach) setCoach(data.coach);
      })
      .catch(() => {
        // Silencioso — sin coach asignado o error de red.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!coach) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-brand-cyan/25 bg-brand-cyan/[0.06] p-3 text-xs text-white/85">
      <UserRoundCheck className="shrink-0 text-brand-cyan" size={16} aria-hidden="true" />
      <p>
        Entrenando con <span className="font-bold text-white">{coach.name || 'tu coach'}</span>. Tu
        coach puede verte y armarte planes.
      </p>
    </div>
  );
}
