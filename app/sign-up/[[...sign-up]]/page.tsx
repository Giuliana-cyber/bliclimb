import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-dark px-4 text-white">
        <section className="max-w-md rounded-lg border border-brand-cyan/24 bg-white/[0.04] p-6 shadow-glow">
          <p className="text-sm font-semibold text-brand-cyan">BilClimb.ai</p>
          <h1 className="mt-2 text-3xl font-bold">Registro no configurado</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Agrega las variables de Clerk para activar el registro real.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-dark px-4 py-10 text-white">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/onboarding"
        appearance={{
          variables: {
            colorPrimary: '#00d4aa',
            colorBackground: '#151822',
            colorText: '#ffffff',
            colorInputBackground: '#0f1119',
            colorInputText: '#ffffff',
            borderRadius: '8px',
            fontFamily: 'DM Sans, sans-serif'
          }
        }}
      />
    </main>
  );
}
