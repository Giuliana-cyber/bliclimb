'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ClipboardList,
  Home,
  MessageCircle,
  Settings,
  UserRound
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/', icon: Home },
  { label: 'Plan', href: '/plan', icon: ClipboardList },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Progreso', href: '/progress', icon: BarChart3 },
  { label: 'Perfil', href: '/profile', icon: UserRound }
];

const routesWithoutShell = ['/onboarding', '/generating-plan'];

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

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-dark/96 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold text-white" aria-label="BilClimb.ai inicio">
            BilClimb.ai
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/76 transition hover:border-brand-cyan/60 hover:text-brand-cyan"
              aria-label="Abrir ajustes"
              title="Ajustes"
            >
              <Settings aria-hidden="true" size={19} strokeWidth={2.2} />
            </button>
            <Link
              href="/profile"
              className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/76 transition hover:border-brand-mustard/70 hover:text-brand-mustard"
              aria-label="Abrir perfil"
              title="Perfil"
            >
              <UserRound aria-hidden="true" size={19} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-3xl px-4 pb-28 pt-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-dark/96 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-3xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.72rem] font-semibold transition',
                  active
                    ? 'bg-brand-cyan/12 text-brand-cyan'
                    : 'text-white/56 hover:bg-white/[0.05] hover:text-white'
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.6 : 2.2} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
