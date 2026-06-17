import { Clock3 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';

export default function BillingPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 text-white">
      <section className="w-full max-w-md">
        <Card variant="hero" className="relative overflow-hidden text-center">
          <MountainBackdrop />
          <div className="relative">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-mustard/15 text-brand-mustard">
              <Clock3 aria-hidden="true" size={28} strokeWidth={2.4} />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">Pago en proceso</h1>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Stripe está procesando tu suscripción. Esto suele tardar segundos. En
              cuanto confirme, tu acceso queda activo automáticamente.
            </p>
            <Button href="/settings" size="lg" className="mt-6 w-full">
              Ver mi suscripción
            </Button>
            <Button href="/" variant="secondary" size="lg" className="mt-3 w-full">
              Volver al dashboard
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
