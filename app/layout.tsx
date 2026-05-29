import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { AppShell } from '@/components/AppShell';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans'
});

export const metadata: Metadata = {
  title: 'BilClimb.ai',
  description: 'Bitacora inteligente de entrenamiento para escaladores.'
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const app = <AppShell>{children}</AppShell>;

  return (
    <html lang="es" className={dmSans.variable}>
      <body className="font-sans antialiased">
        {clerkPublishableKey ? (
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            afterSignOutUrl="/"
          >
            {app}
          </ClerkProvider>
        ) : (
          app
        )}
      </body>
    </html>
  );
}
