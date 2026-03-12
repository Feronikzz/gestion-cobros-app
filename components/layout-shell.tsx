import { ReactNode } from 'react';
import { Nav } from '@/components/nav';

export function LayoutShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="app-shell">
      <Nav />
      <div className="app-container">
        <header className="page-header">
          <h1 className="page-header-title">{title}</h1>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
