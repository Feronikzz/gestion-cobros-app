'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveCallback(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveCallback) resolveCallback(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveCallback) resolveCallback(false);
  };

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  let Icon = AlertCircle;
  let colorClass = 'text-blue-500';
  let bgClass = 'bg-blue-100';
  let btnClass = 'btn-primary';

  if (options?.variant === 'danger') {
    Icon = AlertTriangle;
    colorClass = 'text-red-600';
    bgClass = 'bg-red-100';
    btnClass = 'bg-red-600 hover:bg-red-700 text-white shadow-sm';
  } else if (options?.variant === 'warning') {
    Icon = AlertTriangle;
    colorClass = 'text-amber-600';
    bgClass = 'bg-amber-100';
    btnClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm';
  } else if (options?.variant === 'info') {
    Icon = Info;
    colorClass = 'text-blue-600';
    bgClass = 'bg-blue-100';
    btnClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm';
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Inline overlay — NO usa <Modal> para evitar dependencia circular */}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={handleCancel}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="text-xl font-semibold text-gray-900">{options?.title || 'Confirmar acción'}</h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 p-2 text-center md:text-left">
                <div className={`p-3 rounded-full flex-shrink-0 ${bgClass}`}>
                  <Icon className={`w-6 h-6 ${colorClass}`} />
                </div>
                <div className="flex-1 mt-1">
                  <p className="text-gray-600 text-base whitespace-pre-line">{options?.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  {options?.cancelLabel || 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`px-6 py-2 font-medium rounded-xl transition-all ${btnClass}`}
                >
                  {options?.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe usarse dentro de un ConfirmProvider');
  }
  return context;
};
