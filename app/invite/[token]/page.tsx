import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { AcceptInviteButton } from '@/components/coach/AcceptInviteButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type InviteRow = {
  id: string;
  coach_id: string;
  status: 'pending' | 'accepted' | 'removed';
  client_id: string | null;
  invite_email: string | null;
};

export default async function InvitePage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: rawInvite } = await admin
    .from('coach_clients')
    .select('id, coach_id, status, client_id, invite_email')
    .eq('invite_token', params.token)
    .maybeSingle();
  const invite = rawInvite as InviteRow | null;

  if (!invite || invite.status === 'removed') {
    return <InviteError title="Invitación inválida" message="Este link ya no funciona." />;
  }

  const { data: rawCoach } = await admin
    .from('profiles')
    .select('name')
    .eq('id', invite.coach_id)
    .maybeSingle();
  const coachName = (rawCoach as { name: string | null } | null)?.name ?? 'tu coach';

  // ¿Usuario logueado?
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const signedIn = Boolean(user);
  const alreadyAccepted =
    invite.status === 'accepted' && user && invite.client_id === user.id;
  const acceptedByOther =
    invite.status === 'accepted' && (!user || invite.client_id !== user.id);

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-12">
      <Card className="space-y-4 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-cyan">
          Invitación a entrenar
        </p>
        <h1 className="text-2xl font-extrabold text-white">
          {coachName} te invita a entrenar en BilClimb
        </h1>
        <p className="text-sm text-white/72">
          Aceptando esta invitación, tu coach va a poder armarte planes y seguir tus
          check-ins desde su panel.
        </p>

        {acceptedByOther ? (
          <InviteError
            inline
            title="Invitación usada"
            message="Este link ya fue aceptado por otra cuenta."
          />
        ) : alreadyAccepted ? (
          <div className="space-y-2">
            <p className="text-sm font-bold text-brand-cyan">Ya estás entrenando con tu coach.</p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-brand-cyan px-4 py-2 text-sm font-bold text-brand-dark"
            >
              Ir a mi dashboard
            </Link>
          </div>
        ) : signedIn ? (
          <AcceptInviteButton token={params.token} />
        ) : (
          <div className="space-y-2">
            <Link
              href={`/sign-up?next=/invite/${params.token}`}
              className="block w-full rounded-xl bg-brand-cyan px-4 py-2 text-sm font-bold text-brand-dark hover:brightness-110"
            >
              Crear cuenta y aceptar
            </Link>
            <Link
              href={`/sign-in?next=/invite/${params.token}`}
              className="block w-full rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.04]"
            >
              Ya tengo cuenta — iniciar sesión
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

function InviteError({
  title,
  message,
  inline = false
}: {
  title: string;
  message: string;
  inline?: boolean;
}) {
  const content = (
    <>
      <p className="text-sm font-extrabold text-white">{title}</p>
      <p className="mt-1 text-xs text-white/72">{message}</p>
    </>
  );
  if (inline) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">{content}</div>;
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-12">
      <Card className="space-y-2 p-6 text-center">{content}</Card>
    </div>
  );
}
