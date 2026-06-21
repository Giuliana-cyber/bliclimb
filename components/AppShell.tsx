'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  Home,
  MessageCircle,
  UserRound
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { AuthHeaderActions } from '@/components/AuthHeaderActions';
import { BrandLogo } from '@/components/ui/BrandLogo';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/', icon: Home },
  { label: 'Plan', href: '/plan', icon: ClipboardList },
  { label: 'Sesión', href: '/session', icon: Dumbbell },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Progreso', href: '/progress', icon: BarChart3 },
  { label: 'Perfil', href: '/profile', icon: UserRound }
];

const routesWithoutShell = [
  '/onboarding',
  '/generating-plan',
  '/subscribe',
  '/resumen-semanal',
  // Páginas de resultado de Stripe — públicas, sin AuthGate. Si la sesión
  // del usuario todavía no está sincronizada cuando Stripe redirige, el
  // shell normal lo mandaba a "Inicia sesión" en vez de mostrar el estado
  // real del pago.
  '/billing/success',
  '/billing/failure',
  '/billing/pending',
  '/sign-in',
  '/sign-up',
  '/auth',
  // Invitación de coach: el cliente típicamente abre el link sin sesión
  // todavía. La página ya maneja signed-in / not-signed-in internamente.
  '/invite',
  // Panel del coach trae su propio sidebar y guard; /coach/upgrade es
  // público para que cualquier atleta (logueado o no) descubra los tiers
  // y precios.
  '/coach/dashboard',
  '/coach/clients',
  '/coach/plans',
  '/coach/upgrade'
];

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/' || pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = routesWithoutShell.some((route) => pathname.startsWith(route));

  if (hideShell) {
    return <>{children}</>;
  }
  // El paywall ya no bloquea el shell entero. Los gates per-route
  // (/api/generate-plan, /api/chat) deciden, y el banner de mes gratis
  // se muestra inline en Dashboard / Plan.

  return (
    <div className="relative min-h-screen text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-glow"
      />

      <header className="sticky top-0 z-30 overflow-hidden border-b border-white/[0.06] bg-brand-dark/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-2 px-4">
          <Link
            href="/"
            className="flex min-w-0 shrink items-center gap-2"
            aria-label="BilClimb.ai inicio"
          >
            <BrandLogo size={28} />
            {/* En viewports muy chicos (< 400px) ocultamos el wordmark para que los íconos no se corten. */}
            <span className="hidden truncate text-base font-extrabold tracking-tight text-white min-[400px]:inline">
              BilClimb<span className="text-brand-cyan">.ai</span>
            </span>
          </Link>
          <AuthHeaderActions />
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-3xl px-4 pb-32 pt-6">
        <AuthGate>{children}</AuthGate>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-brand-dark/90 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-full max-w-3xl grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.7rem] font-bold transition-all duration-200',
                  active
                    ? 'text-brand-cyan'
                    : 'text-white/52 hover:bg-white/[0.05] hover:text-white'
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-cyan"
                  />
                ) : null}
                <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.6 : 2.1} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

