/**
 * DerivacionView · client · #17.
 *
 * DoD:
 *   - Sin nav (transaccional) · voz "tú"
 *   - Encuadre "no diagnostico ni trato" abajo del contenido
 *   - Cards "qué SÍ podemos hacer" con CTA a alternativa (v1 no hace nada
 *     accionable, muestra intención · Fase 4b conecta con motor real)
 *   - CTA principal "Descansar hoy" bil-red · Secundario "Ver recursos"
 *     verde outline · mismo tamaño 52px
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Alternativa {
  id: string;
  title: string;
  copy: string;
  icon: string;
}

export interface DerivacionViewProps {
  character: 'bill' | 'senda';
  zonas: string[];
  intensidad: number;
  alternativas: Alternativa[];
}

const ZONA_LABEL: Record<string, string> = {
  dedos: 'dedos',
  muneca: 'muñeca',
  codos: 'codos',
  hombros: 'hombros',
  espalda: 'espalda',
  cadera: 'cadera',
  rodilla: 'rodilla',
};

export function DerivacionView({
  character,
  zonas,
  intensidad,
  alternativas,
}: DerivacionViewProps) {
  const router = useRouter();
  const zonaFrase =
    zonas.length === 0
      ? 'lo que sientes hoy'
      : zonas.length === 1
        ? `en ${ZONA_LABEL[zonas[0]] ?? zonas[0]}`
        : `en ${zonas
            .slice(0, -1)
            .map((z) => ZONA_LABEL[z] ?? z)
            .join(', ')} y ${ZONA_LABEL[zonas[zonas.length - 1]] ?? zonas[zonas.length - 1]}`;

  return (
    <div className="min-h-screen pb-32 bg-bil-cream text-bil-ink font-nunito">
      <header className="fixed top-0 left-0 right-0 z-50 bg-bil-cream flex justify-between items-center px-margin-mobile h-touch-target w-full">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          className="w-10 h-10 rounded-full flex items-center justify-center text-bil-ink/60 hover:bg-bil-ink/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        <h1 className="text-headline-md-mobile font-bold text-bil-green">Hablemos</h1>
        <div className="w-10 h-10" />
      </header>

      <main className="pt-20 px-margin-mobile max-w-lg mx-auto space-y-6">
        {/* Mensaje cálido del coach · con burbuja */}
        <section className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-bil-green">
            <Image
              src={`/characters/${character}-avatar.png`}
              alt={`Coach ${character === 'bill' ? 'Bill' : 'Senda'}`}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative bg-bil-green text-white p-4 rounded-DEFAULT rounded-tl-none shadow-sm flex-1">
            <p className="text-body-lg font-semibold leading-snug">
              Lo que sientes {zonaFrase} pide pausa. Hoy no cargamos — te acompaño
              con opciones más suaves.
            </p>
            <div
              aria-hidden="true"
              className="absolute -left-2 top-0 w-0 h-0 border-t-[12px] border-t-bil-green border-l-[12px] border-l-transparent"
            />
          </div>
        </section>

        {/* Qué SÍ podemos hacer · cards seguras */}
        <section>
          <h2 className="text-label-lg uppercase tracking-wider text-bil-ink/60 mb-3">
            Qué sí podemos hacer hoy
          </h2>
          <div className="space-y-3">
            {alternativas.map((a) => (
              <article
                key={a.id}
                className="bg-white rounded-DEFAULT p-5 border border-bil-ink/5 shadow-sm flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-bil-green/10 text-bil-green flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {a.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-headline-md-mobile text-bil-ink font-bold">
                    {a.title}
                  </h3>
                  <p className="text-body-md text-bil-ink/70 mt-1 leading-snug">
                    {a.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Recursos · link a materiales educativos (Fase 4b: real content) */}
        <section>
          <Link
            href="/recursos"
            className="block bg-white rounded-DEFAULT p-4 border border-bil-ink/5 flex items-center gap-3 hover:border-bil-green/40 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bil-gold/15 text-bil-gold flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">menu_book</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-lg font-bold text-bil-ink">Ver recursos</p>
              <p className="text-label-md text-bil-ink/60">
                Guías cortas sobre gestión de dolor y cuándo buscar ayuda
              </p>
            </div>
            <span className="material-symbols-outlined text-bil-ink/40">chevron_right</span>
          </Link>
        </section>

        {/* Encuadre honesto · sensible a intensidad (Giuliana 2026-07-21).
            Umbral 7 alinea con el trigger que hace escalar #16 → #17.
            Dolor agudo (≥7): urgencia sin alarmar · "revísalo pronto".
            Dolor moderado (<7): patrón conservador · "si sigue en 48h". */}
        <div className="bg-bil-cream border-l-4 border-bil-ink/30 rounded-DEFAULT p-4">
          <p className="text-label-md text-bil-ink/70 leading-relaxed">
            <strong className="text-bil-ink font-bold">
              Bill no diagnostica ni trata.
            </strong>{' '}
            {intensidad >= 7
              ? 'Un dolor así merece que lo revise un profesional pronto. Mientras tanto, nada que cargue la zona.'
              : 'Si sigue molestando en 48 horas, consulta a un profesional de salud.'}
          </p>
        </div>
      </main>

      {/* CTAs sticky abajo · 2 caminos */}
      <div className="fixed bottom-0 left-0 w-full p-margin-mobile z-50 bg-gradient-to-t from-bil-cream via-bil-cream/90 to-transparent">
        <div className="max-w-lg mx-auto space-y-3">
          <button
            type="button"
            onClick={() => router.push('/hoy')}
            className="w-full h-[52px] bg-bil-red text-white rounded-full font-bold text-body-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">bedtime</span>
            Descansar hoy
          </button>
        </div>
      </div>

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
