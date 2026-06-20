'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function accept() {
    setError('');
    setLoading(true);
    try {
      const r = await fetch(`/api/coach/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = (await r.json()) as { ok?: boolean; error?: string; message?: string };
      if (!r.ok) {
        setError(data.message ?? data.error ?? 'No pudimos aceptar la invitación.');
        return;
      }
      router.push('/?invited=1');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={accept} disabled={loading} variant="primary" className="w-full">
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Aceptando...
          </span>
        ) : (
          'Aceptar invitación'
        )}
      </Button>
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
