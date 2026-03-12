import './globals.scss';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Gestión de cobros y reparto', description: 'App moderna con Next.js y Supabase' };

export default function RootLayout({ children }: { children: React.ReactNode }) { 
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
