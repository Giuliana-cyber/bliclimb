export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-6 py-12 text-white">
      <section className="w-full max-w-md">
        <p className="mb-3 text-sm font-semibold uppercase text-brand-cyan">
          BilClimb.ai
        </p>
        <h1 className="text-4xl font-bold leading-tight">
          Tu companer@ de entrenamiento de escalada
        </h1>
        <p className="mt-4 text-base leading-7 text-white/72">
          Una bitacora inteligente para crear planes, registrar sesiones y ajustar tu
          progreso con contexto real.
        </p>
        <div className="mt-8 rounded-lg border border-white/12 bg-white/[0.04] p-5 shadow-glow">
          <p className="text-sm leading-6 text-white/76">
            MVP en construccion: Next.js 14, TypeScript, Tailwind CSS y los tokens de
            marca base ya estan listos.
          </p>
        </div>
      </section>
    </main>
  );
}
