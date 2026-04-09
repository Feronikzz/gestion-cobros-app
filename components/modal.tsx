'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'wide' | 'full';
  /** If true, asks confirmation before closing on overlay click / Escape */
  confirmClose?: boolean;
  confirmCloseMessage?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'default', confirmClose = false, confirmCloseMessage }: ModalProps) {
  const guardedClose = () => {
    if (confirmClose) {
      if (window.confirm(confirmCloseMessage || '¿Seguro que quieres cerrar? Los datos no guardados se perderán.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        guardedClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, confirmClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={guardedClose}>
      <div 
        className={`modal-content ${size === 'wide' ? 'modal-wide' : size === 'full' ? 'modal-full' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={guardedClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
