export default function Home() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-cyan">Hola, Giuliana</p>
        <h1 className="text-3xl font-bold leading-tight">Tu sesion de hoy</h1>
      </div>

      <div className="rounded-lg border border-brand-cyan/25 bg-white/[0.05] p-5 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-mustard">Dia 3 de Semana 2</p>
            <h2 className="mt-2 text-2xl font-bold">Fuerza de dedos + tecnica</h2>
          </div>
          <span className="rounded-md border border-white/10 px-3 py-1 text-sm text-white/70">
            ~60 min
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/70">
          Gym de escalada, bloque principal enfocado en hangboard y tecnica de pies.
        </p>
        <button
          type="button"
          className="mt-5 w-full rounded-md bg-brand-cyan px-4 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-cyan/90"
        >
          Ver sesion completa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-white/60">Plan</p>
          <p className="mt-2 text-xl font-bold">Sem 2/8</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-white/60">Progreso</p>
          <p className="mt-2 text-xl font-bold">4 sesiones</p>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-semibold text-white">Ultimo check-in: Ayer</p>
        <p className="mt-2 text-sm text-white/68">RPE: 7/10 | Energia: 4/5</p>
      </div>
    </section>
  );
}
