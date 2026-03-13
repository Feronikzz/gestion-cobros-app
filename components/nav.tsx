'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Home, Users, CreditCard, PieChart, FileText, Calendar, Receipt, TrendingUp, FolderOpen, History } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { NavMobile } from '@/components/nav-mobile';

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/expedientes', label: 'Expedientes', icon: FolderOpen },
    { href: '/cobros', label: 'Cobros', icon: CreditCard },
    { href: '/gastos', label: 'Gastos', icon: FileText },
    { href: '/finanzas', label: 'Finanzas', icon: TrendingUp },
    { href: '/repartos', label: 'Repartos', icon: PieChart },
    { href: '/facturas', label: 'Facturas', icon: Receipt },
    { href: '/cierre', label: 'Cierre', icon: Calendar },
    { href: '/historial', label: 'Historial', icon: History },
  ];

  return (
    <>
      <nav className="nav-bar">
        {/* Desktop links */}
        <div className="nav-links">
          {items.map(({ href, label, icon: Icon }) => (
            <Link 
              key={href} 
              href={href} 
              className={`nav-link${pathname === href || pathname.startsWith(href + '/') ? ' nav-link-active' : ''}`}
            >
              <Icon className="nav-icon" /> {label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <LogoutButton />
          {/* Mobile hamburger */}
          <button 
            onClick={() => setOpen(true)} 
            className="nav-hamburger" 
            aria-label="Abrir menú"
          >
            <Menu />
          </button>
        </div>
      </nav>

      {/* Mobile bottom sheet navigation */}
      <NavMobile open={open} onClose={() => setOpen(false)} />
    </>
  );
}
