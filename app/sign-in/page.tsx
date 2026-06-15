import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <Suspense fallback={<AuthFallback />}>
        <AuthCard mode="sign-in" />
      </Suspense>
    </main>
  );
}

function AuthFallback() {
  return (
    <div className="grid min-h-screen place-items-center text-sm font-semibold text-white/54">
      Cargando…
    </div>
  );
}
