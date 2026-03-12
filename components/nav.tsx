'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Users, CreditCard, PieChart, FileText, Calendar, Receipt, TrendingUp } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/cobros', label: 'Cobros', icon: CreditCard },
    { href: '/gastos', label: 'Gastos', icon: FileText },
    { href: '/finanzas', label: 'Finanzas', icon: TrendingUp },
    { href: '/repartos', label: 'Repartos', icon: PieChart },
    { href: '/facturas', label: 'Facturas', icon: Receipt },
    { href: '/cierre', label: 'Cierre', icon: Calendar },
  ];

  return (
    <nav className="nav-bar">
      {/* Desktop links */}
      <div className="nav-links">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-link${pathname === href || pathname.startsWith(href + '/') ? ' nav-link-active' : ''}`}>
            <Icon className="nav-icon" /> {label}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        <LogoutButton />
        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="nav-hamburger" aria-label="Menú">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="nav-mobile-overlay" onClick={() => setOpen(false)}>
          <div className="nav-mobile-panel" onClick={e => e.stopPropagation()}>
            <div className="nav-mobile-header">
              <span className="nav-mobile-title">Menú</span>
              <button onClick={() => setOpen(false)} className="nav-close"><X /></button>
            </div>
            <div className="nav-mobile-links">
              {items.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={`nav-mobile-link${pathname === href ? ' nav-link-active' : ''}`}>
                  <Icon className="nav-icon" /> {label}
                </Link>
              ))}
            </div>
            <div className="nav-mobile-footer">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
