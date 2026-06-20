'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'bilclimb_install_prompt_dismissed';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIPad =
    /iPad/.test(ua) ||
    // iPadOS 13+ reporta como Mac.
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  return /iPhone|iPod/.test(ua) || isIPad;
}

function isStandaloneInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // Android / desktop Chrome.
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function getDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandaloneInstalled()) return;
    if (getDismissed()) return;

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari nunca dispara beforeinstallprompt. Si estamos en iOS y no
    // hay sw instalado todavía, mostramos un hint manual una sola vez.
    if (isIos()) {
      // Pequeño delay para no interrumpir el primer paint.
      const timer = window.setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 1500);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  function dismiss() {
    persistDismissed();
    setVisible(false);
  }

  async function install() {
    if (!event) return;
    try {
      await event.prompt();
      const result = await event.userChoice;
      if (result.outcome === 'accepted' || result.outcome === 'dismissed') {
        persistDismissed();
      }
    } catch {
      // ignore
    } finally {
      setEvent(null);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 mx-auto max-w-md sm:bottom-6">
      <div
        role="dialog"
        aria-label="Instalar BilClimb"
        className="rounded-2xl border border-brand-cyan/30 bg-brand-dark/95 p-4 shadow-glow-strong backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
            {showIosHint ? (
              <Share aria-hidden="true" size={18} strokeWidth={2.3} />
            ) : (
              <Download aria-hidden="true" size={18} strokeWidth={2.3} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-white">Instalá BilClimb</p>
            {showIosHint ? (
              <p className="mt-1 text-xs leading-5 text-white/72">
                Tocá el botón <span className="font-bold">Compartir</span> de Safari y
                después <span className="font-bold">Añadir a pantalla de inicio</span>.
              </p>
            ) : (
              <p className="mt-1 text-xs leading-5 text-white/72">
                Tenelo como app: abre más rápido y sin barra del navegador.
              </p>
            )}
            {!showIosHint && event ? (
              <button
                type="button"
                onClick={install}
                className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-cyan px-3 text-xs font-bold text-brand-dark transition hover:brightness-110"
              >
                Instalar ahora
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar invitación de instalación"
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X aria-hidden="true" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
