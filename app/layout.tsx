import './globals.scss';
import type { Metadata } from 'next';
import { Footer } from '@/components/footer';

export const metadata: Metadata = { title: 'Gestión de cobros y reparto', description: 'App moderna con Next.js y Supabase' };

export default function RootLayout({ children }: { children: React.ReactNode }) { 
  return (
    <html lang="es">
      <body className="app-shell">
        <div className="app-content">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
