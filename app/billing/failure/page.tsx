import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';

export default function BillingFailurePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 text-white">
      <section className="w-full max-w-md">
        <Card variant="hero" className="relative overflow-hidden text-center">
          <MountainBackdrop />
          <div className="relative">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-400/15 text-red-300">
              <AlertTriangle aria-hidden="true" size={28} strokeWidth={2.4} />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">No se pudo completar el pago</h1>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Stripe rechazó la operación o cancelaste el checkout antes de terminar.
              Tu cuenta no fue cobrada.
            </p>
            <Button href="/subscribe" size="lg" className="mt-6 w-full">
              Volver a intentar
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
