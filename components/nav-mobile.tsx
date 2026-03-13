'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, Users, CreditCard, PieChart, FileText, Calendar, Receipt, TrendingUp, FolderOpen, History } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

interface NavMobileProps {
  open: boolean;
  onClose: () => void;
}

export function NavMobile({ open, onClose }: NavMobileProps) {
  const pathname = usePathname();

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

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Bottom Sheet */}
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center py-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-6 pb-6">
            <nav className="grid grid-cols-2 gap-3">
              {items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-xl transition-all
                      ${isActive 
                        ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' 
                        : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-xs font-medium text-center">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 border-t border-gray-200">
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}
