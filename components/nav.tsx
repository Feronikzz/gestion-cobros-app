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

  const menuCategories = [
    {
      title: null,
      items: [
        { href: '/dashboard', label: 'Inicio', icon: Home, description: 'Panel principal' }
      ]
    },
    {
      title: 'Gestión',
      items: [
        { href: '/clientes', label: 'Clientes', icon: Users, description: 'Gestión de clientes' },
        { href: '/expedientes', label: 'Expedientes', icon: FolderOpen, description: 'Expedientes y procedimientos' },
        { href: '/catalogo', label: 'Catálogo', icon: BookOpen, description: 'Catálogo de servicios' }
      ]
    },
    {
      title: 'Operaciones',
      items: [
        { href: '/cobros', label: 'Cobros', icon: CreditCard, description: 'Registro de cobros' },
        { href: '/gastos', label: 'Gastos', icon: FileText, description: 'Control de gastos' },
        { href: '/facturas', label: 'Facturas', icon: Receipt, description: 'Facturación' }
      ]
    },
    {
      title: 'Informes',
      items: [
        { href: '/finanzas', label: 'Finanzas', icon: TrendingUp, description: 'Resumen financiero' },
        { href: '/repartos', label: 'Repartos', icon: PieChart, description: 'Gestión de repartos' },
        { href: '/cierre', label: 'Cierre', icon: Calendar, description: 'Cierre de período' }
      ]
    },
    {
      title: 'Seguimiento',
      items: [
        { href: '/actividades', label: 'Actividades', icon: Activity, description: 'Seguimiento de tareas' },
        { href: '/historial', label: 'Historial', icon: History, description: 'Historial de cambios' }
      ]
    }
  ];

  // Flatten items for mobile navigation
  const allItems = menuCategories.flatMap(category => category.items);

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
        <div className="nav-links" role="menubar">
          {menuCategories.map((category, categoryIndex) => (
            <div key={category.title || 'home'} className="nav-category">
              {category.title && (
                <div className="nav-category-title" role="separator">
                  {category.title}
                </div>
              )}
              <div className="nav-category-items">
                {category.items.map(({ href, label, icon: Icon, description }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link 
                      key={href} 
                      href={href} 
                      className={`nav-link${isActive ? ' nav-link-active' : ''}`}
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
              </div>
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
              {menuCategories.map((category) => (
                <div key={category.title || 'home'} className="mobile-nav-category">
                  {category.title && (
                    <div className="mobile-nav-category-title">
                      {category.title}
                    </div>
                  )}
                  {category.items.map(({ href, label, icon: Icon, description }) => {
                    const isActive = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeMobileMenu}
                        className={`mobile-nav-link${isActive ? ' mobile-nav-link-active' : ''}`}
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
