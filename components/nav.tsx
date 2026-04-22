'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Home, Users, CreditCard, PieChart, FileText, Calendar, Receipt, TrendingUp, FolderOpen, History, Activity, BookOpen, X, ChevronDown } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

export function Nav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const mainNavItems = [
    { href: '/clientes', label: 'Clientes', icon: Users, description: 'Gestión de clientes', standalone: true },
  ];

  const dropdownMenus = [
    {
      id: 'gestion',
      title: 'Gestión',
      icon: FolderOpen,
      items: [
        { href: '/expedientes', label: 'Expedientes', icon: FolderOpen, description: 'Expedientes y procedimientos' },
        { href: '/catalogo', label: 'Catálogo', icon: BookOpen, description: 'Catálogo de servicios' }
      ]
    },
    {
      id: 'operaciones',
      title: 'Operaciones',
      icon: CreditCard,
      items: [
        { href: '/cobros', label: 'Cobros', icon: CreditCard, description: 'Registro de cobros' },
        { href: '/gastos', label: 'Gastos', icon: FileText, description: 'Control de gastos' },
        { href: '/facturas', label: 'Facturas', icon: Receipt, description: 'Facturación' }
      ]
    },
    {
      id: 'informes',
      title: 'Informes',
      icon: TrendingUp,
      items: [
        { href: '/finanzas', label: 'Finanzas', icon: TrendingUp, description: 'Resumen financiero' },
        { href: '/repartos', label: 'Repartos', icon: PieChart, description: 'Gestión de repartos' },
        { href: '/cierre', label: 'Cierre', icon: Calendar, description: 'Cierre de período' }
      ]
    },
    {
      id: 'seguimiento',
      title: 'Seguimiento',
      icon: Activity,
      items: [
        { href: '/actividades', label: 'Actividades', icon: Activity, description: 'Seguimiento de tareas' },
        { href: '/historial', label: 'Historial', icon: History, description: 'Historial de cambios' }
      ]
    },
    {
      id: 'dashboard',
      title: null,
      icon: Home,
      items: [
        { href: '/dashboard', label: 'Inicio', icon: Home, description: 'Panel principal' }
      ]
    }
  ];

  // Flatten items for mobile navigation
  const allItems = [
    ...mainNavItems,
    ...dropdownMenus.flatMap(menu => menu.items)
  ];

  // Handle keyboard navigation and dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          hamburgerRef.current?.focus();
        } else if (activeDropdown) {
          setActiveDropdown(null);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Handle mobile menu close
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node) && !hamburgerRef.current?.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
      
      // Handle dropdown close
      if (activeDropdown && dropdownRefs.current[activeDropdown] && !dropdownRefs.current[activeDropdown]?.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, activeDropdown]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    hamburgerRef.current?.focus();
  };

  const toggleDropdown = (dropdownId: string) => {
    setActiveDropdown(activeDropdown === dropdownId ? null : dropdownId);
  };

  return (
    <>
      <nav className="nav-bar" role="navigation" aria-label="Navegación principal">
        {/* Desktop links */}
        <div className="nav-links" role="menubar">
          {/* Clientes - Always visible */}
          {mainNavItems.map(({ href, label, icon: Icon, description }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link 
                key={href} 
                href={href} 
                className={`nav-link nav-link-clientes${isActive ? ' nav-link-active' : ''}`}
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
          
          {/* Dropdown menus */}
          {dropdownMenus.filter(menu => menu.title).map((menu) => {
            const isActive = menu.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
            const isDropdownOpen = activeDropdown === menu.id;
            
            return (
              <div
                key={menu.id}
                ref={(el) => { dropdownRefs.current[menu.id] = el; }}
                className="nav-dropdown"
              >
                <button
                  onClick={() => toggleDropdown(menu.id)}
                  className={`nav-link nav-dropdown-trigger${isActive ? ' nav-link-active' : ''}${isDropdownOpen ? ' nav-dropdown-open' : ''}`}
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                  aria-label={`${menu.title} - menú desplegable`}
                >
                  <menu.icon className="nav-icon" aria-hidden="true" />
                  <span>{menu.title}</span>
                  <ChevronDown className={`nav-dropdown-arrow${isDropdownOpen ? ' nav-dropdown-arrow-open' : ''}`} aria-hidden="true" />
                </button>
                
                {isDropdownOpen && (
                  <div className="nav-dropdown-menu" role="menu">
                    {menu.items.map(({ href, label, icon: Icon, description }) => {
                      const itemIsActive = pathname === href || pathname.startsWith(href + '/');
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`nav-dropdown-item${itemIsActive ? ' nav-dropdown-item-active' : ''}`}
                          role="menuitem"
                          aria-current={itemIsActive ? 'page' : undefined}
                          aria-label={`${label} - ${description}`}
                          title={description}
                        >
                          <Icon className="nav-dropdown-item-icon" aria-hidden="true" />
                          <div className="nav-dropdown-item-content">
                            <span className="nav-dropdown-item-label">{label}</span>
                            <span className="nav-dropdown-item-description">{description}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Dashboard - standalone */}
          {dropdownMenus.filter(menu => !menu.title).map((menu) => 
            menu.items.map(({ href, label, icon: Icon, description }) => {
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
            })
          )}
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
              {/* Clientes first - always accessible */}
              {mainNavItems.map(({ href, label, icon: Icon, description }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMobileMenu}
                    className={`mobile-nav-link mobile-nav-link-clientes${isActive ? ' mobile-nav-link-active' : ''}`}
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
              
              {/* Other menu items */}
              {dropdownMenus.filter(menu => !menu.title).map((menu) => 
                menu.items.map(({ href, label, icon: Icon, description }) => {
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
                })
              )}
              
              {/* Dropdown categories in mobile */}
              {dropdownMenus.filter(menu => menu.title).map((menu) => (
                <div key={menu.id} className="mobile-nav-category">
                  <div className="mobile-nav-category-title">
                    {menu.title}
                  </div>
                  {menu.items.map(({ href, label, icon: Icon, description }) => {
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
