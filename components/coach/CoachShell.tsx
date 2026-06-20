'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, LayoutDashboard, Users } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import type { CoachContext } from '@/lib/coach/context';

const NAV = [
  { href: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach/clients', label: 'Mis clientes', icon: Users },
  { href: '/coach/plans/new', label: 'Crear plan', icon: ClipboardList }
];

function isActive(pathname: string, href: string) {
  if (href === '/coach/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tierLabel(tier: CoachContext['tier']) {
  if (tier === 'gym') return 'Gym · ilimitado';
  if (tier === 'pro') return 'Pro · 15 clientes';
  if (tier === 'starter') return 'Starter · 5 clientes';
  return 'Sin plan activo';
}

export function CoachShell({
  context,
  children
}: {
  context: CoachContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-glow"
      />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-brand-dark/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/coach/dashboard" className="flex items-center gap-2" aria-label="Panel del coach">
            <BrandLogo size={28} />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-extrabold tracking-tight text-white">
                BilClimb<span className="text-brand-cyan">.coach</span>
              </span>
              <span className="text-[0.6rem] font-semibold text-white/55">
                Panel para entrenadores
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white">{context.name || context.email}</p>
              <p className="text-[0.65rem] text-white/55">
                {tierLabel(context.tier)} · {context.currentClients}/{context.maxClients}
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/10 px-3 py-1.5 text-[0.65rem] font-bold text-white/72 transition hover:border-brand-cyan/60 hover:text-brand-cyan"
            >
              Vista atleta
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                    active
                      ? 'bg-brand-cyan/15 text-brand-cyan'
                      : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Nav inferior en móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-brand-dark/90 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid h-14 w-full max-w-6xl grid-cols-3 gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[0.65rem] font-bold ${
                  active ? 'text-brand-cyan' : 'text-white/55'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
