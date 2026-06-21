'use client';

// Banner discreto que pide permiso para notificaciones. Solo aparece cuando:
// - El navegador soporta Push API + Notifications.
// - El usuario aún no dio permiso (Notification.permission === 'default').
// - No fue dismisseado en los últimos 7 días (localStorage).
//
// Al activar: pide permiso → subscribe vía PushManager → POST a
// /api/push/subscribe → marca opt-in en localStorage para no volver a
// mostrar el banner.
//
// La VAPID_PUBLIC_KEY se inyecta via NEXT_PUBLIC_VAPID_PUBLIC_KEY (debe
// estar en env vars de cliente).

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

const DISMISS_KEY = 'bilclimb_push_optin_dismissed';
const OPTED_IN_KEY = 'bilclimb_push_opted_in';
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function isDismissedRecently(): boolean {
  try {
    const at = window.localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    const ts = Number(at);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

function isOptedIn(): boolean {
  try {
    return window.localStorage.getItem(OPTED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

export function PushOptIn() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    if (isDismissedRecently() || isOptedIn()) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  async function activate() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismiss();
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys })
      });
      if (!res.ok) {
        dismiss();
        return;
      }
      try {
        window.localStorage.setItem(OPTED_IN_KEY, '1');
      } catch {
        // ignore
      }
      setVisible(false);
    } catch {
      dismiss();
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
          <Bell aria-hidden="true" size={18} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-white">Activá notificaciones</p>
          <p className="mt-1 text-xs leading-5 text-white/72">
            Te avisamos solo cuando importa: tu sesión del día y tu resumen semanal.
            Sin spam.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={activate}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-cyan px-3 text-xs font-bold text-brand-dark hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Activando…' : 'Activar'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-bold text-white/65 hover:bg-white/[0.04]"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="grid size-7 shrink-0 place-items-center rounded-full text-white/45 hover:bg-white/[0.06]"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
