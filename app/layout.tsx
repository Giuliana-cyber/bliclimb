import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import { AppOpenPing } from '@/components/AppOpenPing';
import { PWARegister } from '@/components/pwa/PWARegister';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans'
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://bilclimb.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'BilClimb.ai',
  description: 'Bitácora inteligente de entrenamiento para escaladores.',
  applicationName: 'BilClimb',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', rel: 'icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BilClimb'
  },
  formatDetection: { telephone: false }
};

// Next 14 separa viewport/themeColor de metadata.
export const viewport: Viewport = {
  themeColor: '#0A0F1A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        <AppOpenPing />
        <PWARegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
