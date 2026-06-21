'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpenCheck,
  ChevronRight,
  Bug,
  Database,
  Info,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  UserRound
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { createClient } from '@/lib/supabase/client';
import { clearLocalSession, loadLocalSession, type LocalSession } from '@/lib/session';
import { loadProfile, saveProfile, type UserProfile } from '@/lib/profile';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

type SettingsContentProps = {
  /**
   * Slot server-rendered con el panel de suscripción (lee `entitlements`).
   * Inyectado desde `app/settings/page.tsx` para mantener este componente
   * client-only sin tener que hacer fetch al cargar.
   */
  subscriptionPanel?: React.ReactNode;
};

export function SettingsContent({ subscriptionPanel }: SettingsContentProps = {}) {
  const router = useRouter();
  const [session, setSession] = useState<LocalSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setSession(loadLocalSession());
    setProfile(loadProfile());
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    clearLocalSession();
    router.push('/sign-in');
  }

  function handleSwapCharacter() {
    if (!profile) return;
    const next = profile.character === 'bill' ? 'senda' : 'bill';
    const updated = saveProfile({
      ...profile,
      character: next,
      updatedAt: new Date().toISOString()
    });
    setProfile(updated);
  }

  function handleDeleteAllData() {
    if (typeof window === 'undefined') return;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('bilclimb:')) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    clearLocalSession();
    router.push('/sign-in');
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6 pb-8"
    >
      <header className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-cyan">Ajustes</p>
        <h1 className="text-3xl font-extrabold leading-tight">Configuración</h1>
        <p className="text-sm leading-6 text-white/64">
          Tu cuenta, coach, datos y todo lo importante sobre cómo funciona BilClimb.
        </p>
      </header>

      {/* Cuenta */}
      <Section title="Cuenta">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            {profile ? (
              <CharacterAvatar
                character={profile.character === 'senda' ? 'senda' : 'bill'}
                variant="avatar"
                size="md"
              />
            ) : (
              <div className="grid size-11 place-items-center rounded-full bg-white/[0.06] text-white/60">
                <UserRound size={20} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-white">
                {profile?.name || session?.name || 'Sin nombre'}
              </p>
              <p className="truncate text-xs text-white/55">{session?.email ?? 'Sin correo'}</p>
            </div>
          </div>
        </Card>

        <SettingsLink
          href="/profile"
          icon={UserRound}
          label="Editar mi perfil"
          description="Nivel, objetivo, lesiones, disponibilidad, equipo"
        />
        <SettingsLink
          href="/coach/upgrade"
          icon={Users}
          label="¿Eres entrenador?"
          description="Usa BilClimb con tus clientes desde un panel dedicado"
        />
        {subscriptionPanel}
      </Section>

      <Section title="Notificaciones">
        <NotificationSettings />
      </Section>

      {/* Coach */}
      {profile ? (
        <Section title="Coach">
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <CharacterAvatar
                character={profile.character === 'senda' ? 'senda' : 'bill'}
                variant="avatar"
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-white">
                  Entrenas con {profile.character === 'senda' ? 'Senda' : 'Bill'}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-white/55">
                  {profile.character === 'senda'
                    ? 'Serena, técnica, conciencia corporal'
                    : 'Directo, energético, accionable'}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleSwapCharacter}
              className="mt-4 w-full"
            >
              Cambiar a {profile.character === 'senda' ? 'Bill' : 'Senda'}
            </Button>
          </Card>
        </Section>
      ) : null}

      {/* Sobre BilClimb — la sección clave */}
      <Section title="Sobre BilClimb">
        <Banner
          tone="mustard"
          icon={AlertTriangle}
          title="Esto NO reemplaza a un profesional"
          description="BilClimb es un asistente de IA. Puede equivocarse, recomendar mal o no ver matices que sí vería un coach humano, fisioterapeuta o médico. Si tienes lesiones, molestias persistentes o vas en serio con un proyecto fuerte, consulta a un profesional certificado. Tú eres responsable de tus decisiones de entrenamiento."
        />

        <Card variant="hero" className="relative overflow-hidden !p-5">
          <MountainBackdrop />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.10em] text-brand-cyan">
              <Sparkles size={12} />
              Cómo se pensó
            </div>
            <h3 className="mt-3 text-lg font-extrabold leading-tight">
              Un coach digital con bases reales
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/72">
              BilClimb mezcla principios de coaches de escalada referentes (Lattice Training,
              Eric Hörst, Power Company, Climb Strong, Catalyst, Hooper&apos;s Beta) con un motor
              de IA. La idea: que cualquier escalador pueda tener un plan estructurado,
              técnico y adaptado a su contexto, sin pagar $100+/mes a un coach humano.
            </p>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Hecho por <span className="font-bold text-brand-cyan">Belay Partners</span>.
              Estamos al inicio del camino — si algo te parece mal o falta, dinos.
            </p>
          </div>
        </Card>

        <ExpandableCard
          icon={BookOpenCheck}
          title="¿De dónde sale la información?"
          description="Fuentes y metodología"
        >
          <ul className="space-y-2.5 text-sm leading-6 text-white/72">
            <li>
              <span className="font-bold text-white">Coaches referentes:</span> los planes se
              inspiran en la metodología de Lattice Training, TrainingForClimbing (Eric
              Hörst), Power Company Climbing, Climb Strong (Steve Bechtel), Catalyst
              Climbing, Hooper&apos;s Beta, The Climbing Doctor, Dave MacLeod y más.
            </li>
            <li>
              <span className="font-bold text-white">Motor de IA:</span> hoy usamos GPT-4o
              para generar planes y GPT-4o-mini para el chat. La IA conoce los métodos pero
              puede equivocarse.
            </li>
            <li>
              <span className="font-bold text-white">Próximo paso:</span> estamos
              construyendo un sistema que indexa canales de YouTube y blogs de los mejores
              entrenadores para citar fuentes específicas (Fase 3).
            </li>
            <li>
              <span className="font-bold text-white">Lo que NO somos:</span> no somos un
              equipo médico, no diagnosticamos lesiones, no prescribimos dietas. Para eso,
              fisio o nutriólogo.
            </li>
          </ul>
        </ExpandableCard>

        <ExpandableCard
          icon={ShieldCheck}
          title="Seguridad y límites"
          description="Lo que el coach NO hará"
        >
          <ul className="space-y-2.5 text-sm leading-6 text-white/72">
            <li>· Si reportas dolor de dedos &gt; 0/10, NO se recomienda fallo, max hangs ni campus.</li>
            <li>· Si declaras lesión activa, se baja la carga y se sugiere consultar fisio.</li>
            <li>· Si tu RPE promedio sube mucho, se sugiere descarga temprana.</li>
            <li>· No prescribimos dietas ni cambios agresivos de peso.</li>
            <li>· No reemplazamos consulta médica ni rehabilitación profesional.</li>
          </ul>
        </ExpandableCard>
      </Section>

      {/* Datos */}
      <Section title="Mis datos">
        <Card className="!p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/60">
              <Database size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-white">Almacenamiento</p>
              <p className="mt-1 text-xs leading-5 text-white/55">
                Tu perfil, plan y check-ins están en tu navegador y se sincronizan a
                Supabase. Borrarlos no se puede deshacer.
              </p>
            </div>
          </div>
          {showDeleteConfirm ? (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/[0.08] p-4">
              <p className="text-sm font-bold text-red-200">¿Borrar todos los datos?</p>
              <p className="mt-1 text-xs leading-5 text-white/65">
                Se borra perfil, plan, check-ins y sesión. Tendrás que volver a empezar.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full"
                >
                  Cancelar
                </Button>
                <button
                  type="button"
                  onClick={handleDeleteAllData}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500/90 px-5 text-sm font-bold text-white transition hover:bg-red-500"
                >
                  <Trash2 size={16} />
                  Sí, borrar todo
                </button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(true)}
              icon={<Trash2 size={16} />}
              className="mt-4 w-full"
            >
              Borrar todos mis datos
            </Button>
          )}
        </Card>
      </Section>

      {/* Soporte */}
      <Section title="Soporte y contacto">
        <SettingsLink
          href="mailto:belaypartnersorg@gmail.com"
          icon={Mail}
          label="Escribir a soporte"
          description="belaypartnersorg@gmail.com"
          external
        />
        <SettingsLink
          href="https://github.com/Giuliana-cyber/bliclimb/issues"
          icon={Bug}
          label="Reportar un bug o sugerir"
          description="GitHub Issues — público"
          external
        />
      </Section>

      {/* Legal */}
      <Section title="Legal">
        <ExpandableCard
          icon={Info}
          title="Términos y privacidad"
          description="Lo básico que debes saber"
        >
          <ul className="space-y-2.5 text-sm leading-6 text-white/72">
            <li>
              <span className="font-bold text-white">Privacidad:</span> guardamos tu perfil,
              plan y check-ins para personalizar tu entrenamiento. No vendemos tus datos.
            </li>
            <li>
              <span className="font-bold text-white">Datos a terceros:</span> usamos OpenAI
              (para IA), Supabase (para storage y auth) y Stripe (para suscripción).
              Lee sus políticas si te interesa.
            </li>
            <li>
              <span className="font-bold text-white">Cancelación:</span> puedes cancelar tu
              suscripción cuando quieras desde el panel de Stripe.
            </li>
            <li>
              <span className="font-bold text-white">Borrar tu cuenta:</span> usa la opción
              de arriba para borrar todos tus datos.
            </li>
          </ul>
        </ExpandableCard>
      </Section>

      {/* Cerrar sesión */}
      <Card className="!p-4">
        <Button
          variant="secondary"
          onClick={handleSignOut}
          icon={<LogOut size={18} />}
          size="lg"
          className="w-full"
        >
          Cerrar sesión
        </Button>
      </Card>

      <p className="pt-2 text-center text-xs text-white/35">
        BilClimb.ai · Belay Partners
      </p>
    </motion.section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  label,
  description,
  external = false
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
  description?: string;
  external?: boolean;
}) {
  const props = external
    ? { target: '_blank', rel: 'noreferrer' as const }
    : {};
  return (
    <Link href={href} className="block" {...props}>
      <Card className="!p-4 transition hover:border-white/20">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/65">
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-white">{label}</p>
            {description ? (
              <p className="mt-0.5 truncate text-xs text-white/55">{description}</p>
            ) : null}
          </div>
          <ChevronRight size={16} className="text-white/40" />
        </div>
      </Card>
    </Link>
  );
}

function ExpandableCard({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof Info;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/65">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-white">{title}</p>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-white/55">{description}</p>
          ) : null}
        </div>
        <ChevronRight
          size={16}
          className={`shrink-0 text-white/40 transition ${open ? 'rotate-90 text-brand-cyan' : ''}`}
        />
      </button>
      {open ? (
        <div className="border-t border-white/[0.06] px-5 py-4">{children}</div>
      ) : null}
    </Card>
  );
}
