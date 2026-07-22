/**
 * PerfilView · client · #19.
 *
 * DoD:
 *   - Con back button (no nav inferior · llegado desde engrane)
 *   - Voz "tú" · avatar Bill sobre crema
 *   - Sección "Mi perfil" incluye lesión activa · toggle re-gatea motor
 *     (v1 muestra la intención, Fase 4b conecta con Supabase profile
 *     update + re-derivación del focus)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export interface PerfilViewProps {
  character: 'bill' | 'senda';
  profile: {
    grado: string;
    colgado25mm: number;
    pullups: number;
    lesionActiva: boolean;
    equipo: string[];
  };
}

export function PerfilView({ character, profile }: PerfilViewProps) {
  const router = useRouter();
  const [lesionActiva, setLesionActiva] = useState(profile.lesionActiva);

  const handleLesionToggle = (next: boolean) => {
    setLesionActiva(next);
    // TODO F4-UI backend:
    //   1. PUT /api/perfil con {lesionActiva: next}
    //   2. Re-derivar focus del motor invertido (deriveFocus)
    //   3. Invalidar cache de sesión del día
    // v1: solo cambia UI local.
  };

  return (
    <div className="min-h-screen pb-16 bg-bil-cream text-bil-ink font-nunito">
      <header className="fixed top-0 left-0 right-0 z-50 bg-bil-cream flex justify-between items-center px-margin-mobile h-touch-target w-full">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        <h1 className="text-headline-md-mobile font-bold text-bil-green">Tu perfil</h1>
        <div className="w-10 h-10" />
      </header>

      <main className="pt-20 px-margin-mobile max-w-lg mx-auto space-y-6">
        {/* Mi coach · card grande */}
        <section>
          <h2 className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3 px-1">
            Tu coach
          </h2>
          <div className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5 shadow-sm flex items-center gap-4">
            <div
              className={`flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-4 ${
                character === 'bill' ? 'border-bil-green' : 'border-bil-navy'
              }`}
            >
              <Image
                src={`/characters/${character}-avatar.png`}
                alt={character}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-md text-bil-ink/60 uppercase tracking-wider">
                {character === 'bill' ? 'Te guía' : 'Te acompaña'}
              </p>
              <h3 className="text-headline-md text-bil-ink font-bold">
                {character === 'bill' ? 'Bill' : 'Senda'}
              </h3>
            </div>
            <Link
              href="/onboarding-v2"
              aria-label="Cambiar de coach"
              className="w-10 h-10 rounded-full flex items-center justify-center text-bil-green hover:bg-bil-green/10 transition-colors"
            >
              <span className="material-symbols-outlined">edit</span>
            </Link>
          </div>
        </section>

        {/* Mi perfil · datos de escalada */}
        <section>
          <h2 className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3 px-1">
            Tu perfil
          </h2>
          <div className="space-y-3">
            <RowStat label="Grado actual" value={profile.grado} icon="mountain_flag" href="/onboarding-v2" />
            <RowStat
              label="Colgado 25mm"
              value={`${profile.colgado25mm} s`}
              icon="timer"
              href="/onboarding-v2"
            />
            <RowStat
              label="Dominadas máximas"
              value={`${profile.pullups} reps`}
              icon="fitness_center"
              href="/onboarding-v2"
            />
            <RowStat
              label="Equipo disponible"
              value={`${profile.equipo.length} items`}
              icon="backpack"
              href="/onboarding-v2"
            />

            {/* Lesión activa · toggle re-gatea el motor */}
            <div className="bg-white rounded-DEFAULT p-4 border border-bil-ink/5 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bil-red/10 text-bil-red flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">healing</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-lg font-bold text-bil-ink">Lesión activa</p>
                <p className="text-label-md text-bil-ink/60">
                  Al activar, ajustamos tus sesiones hasta que se resuelva.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLesionToggle(!lesionActiva)}
                role="switch"
                aria-checked={lesionActiva}
                aria-label="Lesión activa"
                className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 ${
                  lesionActiva ? 'bg-bil-red' : 'bg-bil-ink/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-7 h-7 rounded-full bg-white shadow-md transition-transform ${
                    lesionActiva ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Preferencias · lista simple */}
        <section>
          <h2 className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3 px-1">
            Preferencias
          </h2>
          <div className="space-y-3">
            <RowLink icon="notifications" label="Notificaciones" href="/settings" />
            <RowLink icon="translate" label="Idioma" href="/settings" hint="Español" />
            <RowLink icon="cloud_download" label="Datos y exportar" href="/settings" />
          </div>
        </section>

        {/* Suscripción */}
        <section>
          <h2 className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3 px-1">
            Suscripción
          </h2>
          <RowLink icon="workspace_premium" label="Ver mi plan" href="/settings" hint="Activa" />
        </section>

        {/* Cuenta */}
        <section>
          <h2 className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3 px-1">
            Cuenta
          </h2>
          <div className="space-y-3">
            <RowLink icon="logout" label="Cerrar sesión" href="/settings" />
            <RowLink icon="delete_forever" label="Borrar cuenta" href="/settings" danger />
          </div>
        </section>
      </main>

      <style jsx global>{`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        html,
        body {
          background: #f2ede3;
        }
      `}</style>
    </div>
  );
}

function RowStat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-DEFAULT p-4 border border-bil-ink/5 flex items-center gap-3 hover:border-bil-green/40 transition-colors"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bil-green/10 text-bil-green flex items-center justify-center">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-md text-bil-ink/60">{label}</p>
        <p className="text-body-lg font-bold text-bil-ink">{value}</p>
      </div>
      <span className="material-symbols-outlined text-bil-ink/40">chevron_right</span>
    </Link>
  );
}

function RowLink({
  icon,
  label,
  href,
  hint,
  danger,
}: {
  icon: string;
  label: string;
  href: string;
  hint?: string;
  danger?: boolean;
}) {
  const iconCls = danger
    ? 'bg-bil-red/10 text-bil-red'
    : 'bg-bil-green/10 text-bil-green';
  const labelCls = danger ? 'text-bil-red' : 'text-bil-ink';
  return (
    <Link
      href={href}
      className="bg-white rounded-DEFAULT p-4 border border-bil-ink/5 flex items-center gap-3 hover:border-bil-green/40 transition-colors"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconCls}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-body-lg font-bold ${labelCls}`}>{label}</p>
        {hint && <p className="text-label-md text-bil-ink/60">{hint}</p>}
      </div>
      <span className="material-symbols-outlined text-bil-ink/40">chevron_right</span>
    </Link>
  );
}
