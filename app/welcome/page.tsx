/**
 * Welcome · Fase 4 UI piloto #1.
 *
 * Traducción fiel de docs/design/carpeta_2/bienvenido_a_bilclimb/code.html
 * con las 2 correcciones de Giuliana aplicadas:
 *   1. Headline: "Nunca entrenas solo." (era "Entrena con inteligencia.")
 *   2. "Bil" → "Bill" en copy + alt.
 *
 * Assets locales:
 *   - Logo cerebro dorado: public/brand/mark.png
 *   - Bill/Senda: public/characters/{bill,senda}-full.png
 *
 * Sin AppShell (routesWithoutShell). Estado no-autenticado.
 */

import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function WelcomePage() {
  return (
    <div className="flex flex-col min-h-screen text-bil-ink bg-bil-cream font-nunito">
      <main className="flex-grow flex flex-col items-center px-6 pt-16 pb-8 max-w-md mx-auto w-full">
        <header className="flex flex-col items-center mb-24" data-purpose="logo-container">
          <Image
            src="/brand/mark.png"
            alt="BilClimb Logo"
            width={128}
            height={128}
            className="w-32 h-32 mb-2"
            priority
          />
          <h1 className="text-3xl font-extrabold text-bil-green">BilClimb</h1>
        </header>

        <section className="text-center mb-24" data-purpose="hero-text">
          <h2 className="text-2xl font-bold text-bil-green mb-4 leading-tight">
            Nunca entrenas solo.
          </h2>
          <p className="text-base leading-relaxed text-bil-ink">
            Bill y Senda son una inteligencia que te acompaña en tu
            entrenamiento de escalada: lee cómo estás hoy, arma tu plan
            y sabe cuándo cuidarte.
          </p>
        </section>

        <section
          className="relative w-full h-48 flex justify-center items-center mb-24"
          data-purpose="character-display"
        >
          <div className="absolute left-1/2 -translate-x-full ml-4">
            <Image
              src="/characters/senda-full.png"
              alt="Senda"
              width={128}
              height={128}
              className="w-32 h-32 rounded-full border-4 border-bil-cream shadow-sm object-cover"
            />
          </div>
          <div className="absolute left-1/2 translate-x-0 -ml-4">
            <Image
              src="/characters/bill-full.png"
              alt="Bill"
              width={128}
              height={128}
              className="w-32 h-32 rounded-full border-4 border-bil-cream shadow-sm object-cover"
            />
          </div>
        </section>

        <nav className="w-full space-y-4" data-purpose="auth-navigation">
          <Link
            href="/sign-up"
            className="block w-full h-[52px] leading-[52px] text-center bg-bil-red text-white font-bold rounded-full shadow-lg transition-transform active:scale-[0.98]"
          >
            Crear cuenta
          </Link>
          <Link
            href="/sign-in"
            className="block w-full h-[52px] leading-[48px] text-center border-2 border-bil-green text-bil-green font-bold rounded-full transition-transform active:scale-[0.98]"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-in?provider=google"
            className="w-full h-[52px] border border-gray-300 bg-white text-bil-ink font-semibold rounded-full flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </Link>
        </nav>
      </main>

      <footer className="w-full text-center py-6" data-purpose="footer-info">
        <p className="text-xs text-bil-ink opacity-60">by Belay Partners</p>
      </footer>
    </div>
  );
}
