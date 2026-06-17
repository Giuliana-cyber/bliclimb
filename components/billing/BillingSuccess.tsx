'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MountainBackdrop } from '@/components/ui/MountainBackdrop';

export function BillingSuccess() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 text-white">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card variant="hero" className="relative overflow-hidden text-center">
          <MountainBackdrop />
          <div className="relative">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-cyan text-brand-dark shadow-glow">
              <CheckCircle2 aria-hidden="true" size={28} strokeWidth={2.4} />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold">¡Suscripción activada!</h1>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Tenés 30 días de prueba gratuita. Después se cobran $249 MXN una sola vez al
              año.
            </p>

            <Button href="/generating-plan" size="lg" icon={<Sparkles size={18} />} className="mt-6 w-full">
              Generar mi plan
            </Button>
            <Button href="/" variant="secondary" size="lg" className="mt-3 w-full">
              Volver al dashboard
            </Button>
            <p className="mt-4 text-xs text-white/45">
              Si todavía no ves la suscripción reflejada en /settings, esperá unos
              segundos — Stripe nos avisa por webhook.
            </p>
          </div>
        </Card>
      </motion.section>
    </main>
  );
}
