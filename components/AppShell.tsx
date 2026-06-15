'use client';

import { useEffect, useState } from 'react';
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
import { SubscribeCard } from '@/components/billing/SubscribeCard';

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
  '/billing/success',
  '/sign-in',
  '/sign-up',
  '/auth'
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
  const [subscriptionState, setSubscriptionState] = useState<'loading' | 'active' | 'inactive'>(
    'loading'
  );

  useEffect(() => {
    if (hideShell) {
      setSubscriptionState('active');
      return;
    }
    async function checkSubscription() {
      try {
        const response = await fetch('/api/billing/status');
        const data = (await response.json()) as { active?: boolean };
        setSubscriptionState(data.active ? 'active' : 'inactive');
      } catch {
        setSubscriptionState('inactive');
      }
    }
    void checkSubscription();
  }, [hideShell, pathname]);

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-glow"
      />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-brand-dark/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="BilClimb.ai inicio">
            <BrandLogo size={28} />
            <span className="text-base font-extrabold tracking-tight text-white">
              BilClimb<span className="text-brand-cyan">.ai</span>
            </span>
          </Link>
          <AuthHeaderActions />
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-3xl px-4 pb-32 pt-6">
        <AuthGate>
          {subscriptionState === 'loading' ? (
            <div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-white/54">
              Revisando suscripción…
            </div>
          ) : subscriptionState === 'inactive' ? (
            <SubscribeCard compact />
          ) : (
            children
          )}
        </AuthGate>
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

