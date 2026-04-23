'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Home, Users, CreditCard, PieChart, FileText, Calendar, Receipt, TrendingUp, FolderOpen, History, Activity, BookOpen, X } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

export function Nav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const groups = [
    {
      title: 'Principal',
      items: [
        { href: '/dashboard', label: 'Inicio', icon: Home, description: 'Panel principal' },
        { href: '/clientes', label: 'Clientes', icon: Users, description: 'Gestión de clientes', highlight: true },
      ]
    },
    {
      title: 'Gestión y Servicios',
      items: [
        { href: '/expedientes', label: 'Expedientes', icon: FolderOpen, description: 'Expedientes y procedimientos' },
        { href: '/actividades', label: 'Actividades', icon: Activity, description: 'Seguimiento de tareas' },
        { href: '/catalogo', label: 'Catálogo', icon: BookOpen, description: 'Catálogo de servicios' },
      ]
    },
    {
      title: 'Facturación',
      items: [
        { href: '/facturas', label: 'Facturas', icon: Receipt, description: 'Facturación' },
        { href: '/cobros', label: 'Cobros', icon: CreditCard, description: 'Registro de cobros' },
        { href: '/gastos', label: 'Gastos', icon: FileText, description: 'Control de gastos' },
      ]
    },
    {
      title: 'Administración',
      items: [
        { href: '/repartos', label: 'Repartos', icon: PieChart, description: 'Gestión de repartos' },
        { href: '/finanzas', label: 'Finanzas', icon: TrendingUp, description: 'Resumen financiero' },
        { href: '/cierre', label: 'Cierre', icon: Calendar, description: 'Cierre de período' },
        { href: '/historial', label: 'Historial', icon: History, description: 'Historial de cambios' },
      ]
    }
  ];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node) && !hamburgerRef.current?.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    hamburgerRef.current?.focus();
  };

  return (
    <>
      <nav className="nav-bar" role="navigation" aria-label="Navegación principal">
        {/* Desktop links */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-4" title="Volver al inicio">
          <img src="/logo.png" alt="Integralx Logo" className="h-8 w-auto object-contain" />
        </Link>
        <div className="nav-links" role="menubar">
          {groups.map((group, groupIdx) => (
            <div key={group.title} className="flex items-center">
              {group.items.map(({ href, label, icon: Icon, description, highlight }: any) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link 
                    key={href} 
                    href={href} 
                    className={`nav-link${isActive ? ' nav-link-active' : ''}${highlight ? ' border border-blue-400 bg-blue-50 text-blue-700 font-semibold' : ''}`}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`${label} - ${description}`}
                    title={description}
                  >
                    <Icon className="nav-icon" aria-hidden="true" /> 
                    <span>{label}</span>
                  </Link>
                );
              })}
              {groupIdx < groups.length - 1 && (
                <div className="h-4 w-px bg-gray-200 mx-1.5" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        <div className="nav-right">
          <LogoutButton />
          {/* Mobile hamburger */}
          <button 
            ref={hamburgerRef}
            onClick={toggleMobileMenu} 
            className="nav-hamburger" 
            aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown navigation */}
      {mobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="mobile-nav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación móvil"
          id="mobile-menu"
        >
          <div className="mobile-nav-backdrop" onClick={closeMobileMenu} />
          <div className="mobile-nav-panel">
            <div className="mobile-nav-header">
              <h2 className="mobile-nav-title">Navegación</h2>
              <button
                onClick={closeMobileMenu}
                className="mobile-nav-close"
                aria-label="Cerrar menú"
              >
                <X />
              </button>
            </div>
            <nav className="mobile-nav-links" role="menubar" aria-orientation="vertical">
              {groups.map((group) => (
                <div key={group.title} className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.title}
                  </div>
                  {group.items.map(({ href, label, icon: Icon, description, highlight }: any) => {
                    const isActive = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeMobileMenu}
                        className={`mobile-nav-link${isActive ? ' mobile-nav-link-active' : ''}${highlight ? ' border-l-4 border-blue-500 bg-blue-50' : ''}`}
                        role="menuitem"
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="mobile-nav-icon" aria-hidden="true" />
                        <div className="mobile-nav-content">
                          <span className="mobile-nav-label">{label}</span>
                          <span className="mobile-nav-description">{description}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="mobile-nav-footer">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
