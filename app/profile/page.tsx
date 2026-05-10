export default function ProfilePage() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-brand-cyan">Mi Perfil</p>
        <h1 className="mt-2 text-3xl font-bold">Datos de escalada</h1>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm leading-6 text-white/70">
          Tu perfil editable aparecera aqui despues del onboarding.
        </p>
      </div>
    </section>
  );
}
