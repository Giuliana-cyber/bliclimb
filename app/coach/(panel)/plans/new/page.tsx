import { redirect } from 'next/navigation';
import { loadCoachContext } from '@/lib/coach/context';
import { getCoachClientSummaries } from '@/lib/coach/queries';
import { NewPlanForm } from '@/components/coach/NewPlanForm';
import { Card } from '@/components/ui/Card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function NewPlanPage({
  searchParams
}: {
  searchParams: { clientId?: string };
}) {
  const context = await loadCoachContext();
  if (!context) return null;

  const clients = await getCoachClientSummaries(context.userId);
  if (clients.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-white">Crear plan</h1>
        <Card className="p-4 text-sm text-white/65">
          Primero invitá a un cliente. Cuando acepte la invitación, vas a poder armarle un plan.
        </Card>
      </div>
    );
  }

  const preselected = searchParams.clientId
    ? clients.find((c) => c.clientId === searchParams.clientId)?.clientId
    : undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-white">Crear plan</h1>
        <p className="text-sm text-white/65">
          Empezás con un borrador. Cuando esté listo lo publicás al cliente.
        </p>
      </header>
      <NewPlanForm
        clients={clients.map((c) => ({
          id: c.clientId,
          name: c.name,
          email: c.email
        }))}
        preselectedClientId={preselected}
      />
    </div>
  );
}
