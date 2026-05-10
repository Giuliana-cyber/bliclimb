import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
