'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'sign-in' | 'sign-up';

type Props = {
  mode: AuthMode;
};

const COPY: Record<AuthMode, { title: string; subtitle: string; switchLabel: string; switchHref: string; switchLinkText: string }> = {
  'sign-in': {
    title: 'Entra a BilClimb',
    subtitle: 'Tu bitácora de entrenamiento, plan personalizado y coach con IA.',
    switchLabel: '¿Aún no tienes cuenta?',
    switchHref: '/sign-up',
    switchLinkText: 'Crear cuenta'
  },
  'sign-up': {
    title: 'Crea tu cuenta',
    subtitle: 'En menos de un minuto. Después armamos tu plan personalizado.',
    switchLabel: '¿Ya tienes cuenta?',
    switchHref: '/sign-in',
    switchLinkText: 'Entrar'
  }
};

export function AuthCard({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // v1 · defaults post-auth (Giuliana 2026-07-21):
  //   sign-up nuevos → /onboarding-v2 (flow rediseñado)
  //   sign-in existentes → /hoy (server component decide si redirect
  //     a /onboarding-v2 cuando profile.onboarded_at IS NULL)
  const next = searchParams.get('next') ?? (mode === 'sign-up' ? '/onboarding-v2' : '/hoy');
  const initialError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [magicSent, setMagicSent] = useState(false);

  const copy = COPY[mode];

  async function handleGoogle() {
    setError(null);
    setLoading('google');

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos abrir Google.');
      setLoading(null);
    }
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading('email');

    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
          shouldCreateUser: true
        }
      });

      if (otpError) {
        throw otpError;
      }

      setMagicSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos enviarte el enlace.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-brand-cyan/20 bg-white/[0.04] p-7 shadow-glow backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-brand-cyan text-brand-dark">
            <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-cyan">
              BilClimb.ai
            </p>
            <p className="text-xs text-white/56">Belay Partners</p>
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold leading-tight text-white">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/68">{copy.subtitle}</p>

        {magicSent ? (
          <MagicLinkSentNotice email={email} onReset={() => setMagicSent(false)} />
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading !== null}
              className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/14 bg-white px-4 py-3.5 text-base font-bold text-brand-dark transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleLogo />
              {loading === 'google' ? 'Abriendo Google…' : 'Continuar con Google'}
            </button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-white/40">
              <div className="h-px flex-1 bg-white/12" />
              <span>o con correo</span>
              <div className="h-px flex-1 bg-white/12" />
            </div>

            <form onSubmit={handleMagicLink} className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/68">
                  Tu correo
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="mt-2 w-full rounded-xl border border-white/12 bg-brand-dark px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-brand-cyan"
                />
              </label>

              <button
                type="submit"
                disabled={loading !== null || !email}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan px-4 py-3.5 text-base font-bold text-brand-dark transition hover:bg-brand-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail aria-hidden="true" size={19} />
                {loading === 'email' ? 'Enviando enlace…' : 'Enviarme un enlace mágico'}
              </button>
            </form>
          </>
        )}

        {error ? (
          <p className="mt-5 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <p className="mt-7 text-center text-sm text-white/56">
          {copy.switchLabel}{' '}
          <Link
            href={copy.switchHref}
            className="font-bold text-brand-cyan hover:underline"
            onClick={() => router.refresh()}
          >
            {copy.switchLinkText}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-white/40">
        Al continuar aceptas nuestros términos y política de privacidad.
      </p>
    </section>
  );
}

function MagicLinkSentNotice({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <div className="mt-7 rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden="true" size={22} className="mt-0.5 text-brand-cyan" />
        <div>
          <p className="text-sm font-bold text-white">Revisa tu correo</p>
          <p className="mt-1 text-sm leading-6 text-white/72">
            Te enviamos un enlace a <span className="font-bold text-white">{email}</span>. Abre el
            correo y haz clic para entrar.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-3 text-sm font-bold text-brand-cyan hover:underline"
          >
            Usar otro correo
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
