'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function InviteClientButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail('');
    setError('');
    setInviteUrl('');
    setCopied(false);
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/coach/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = (await r.json()) as { inviteUrl?: string; error?: string; message?: string };
      if (r.status === 402) {
        setError(data.message ?? 'Llegaste al cupo de tu plan.');
        return;
      }
      if (!r.ok || !data.inviteUrl) {
        setError(data.error ?? 'No pudimos generar la invitación.');
        return;
      }
      setInviteUrl(data.inviteUrl);
    } catch {
      setError('No pudimos contactar al servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary" className="gap-2">
        <UserPlus size={14} aria-hidden="true" />
        Invitar cliente
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-dark p-5 shadow-glow-strong">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-white">Invitar a un cliente</h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                aria-label="Cerrar"
                className="grid size-8 place-items-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            {inviteUrl ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-white/72">
                  Copiá el link y mandáselo a{' '}
                  <span className="font-bold text-white">{email}</span> por WhatsApp o el
                  canal que prefieras. Al abrirlo, va a quedar vinculado a tu panel.
                </p>
                <p className="text-[0.7rem] text-white/45">
                  BilClimb no envía emails de invitación: vos lo compartís cuando querés.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                  <code className="min-w-0 flex-1 truncate text-xs text-white/85">{inviteUrl}</code>
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-cyan px-2 py-1 text-[0.65rem] font-bold text-brand-dark"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  Listo
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-bold text-white/72">
                  Email del cliente
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alice@example.com"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-brand-cyan/60"
                  />
                </label>
                {error ? (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                    {error}
                  </p>
                ) : null}
                <Button
                  onClick={submit}
                  disabled={loading || !email}
                  variant="primary"
                  className="w-full"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Generando...
                    </span>
                  ) : (
                    'Generar invitación'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
