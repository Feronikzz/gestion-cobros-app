'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'wide' | 'full';
  /** If true, asks confirmation before closing on overlay click / Escape when form is dirty */
  confirmClose?: boolean;
  confirmCloseMessage?: string;
  /** External dirty flag — overrides auto-detection when provided */
  isDirty?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'default', confirmClose = false, confirmCloseMessage, isDirty }: ModalProps) {
  const [autoIsDirty, setAutoIsDirty] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Reset dirty flag when modal opens/closes
  useEffect(() => {
    if (!isOpen) setAutoIsDirty(false);
  }, [isOpen]);

  // Auto-detect dirty: listen for input/change inside modal body
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !isOpen || !confirmClose) return;
    const markDirty = () => setAutoIsDirty(true);
    el.addEventListener('input', markDirty, true);
    el.addEventListener('change', markDirty, true);
    return () => {
      el.removeEventListener('input', markDirty, true);
      el.removeEventListener('change', markDirty, true);
    };
  }, [isOpen, confirmClose]);

  const dirty = isDirty !== undefined ? isDirty : autoIsDirty;

  const guardedClose = useCallback(() => {
    if (confirmClose && dirty) {
      if (window.confirm(confirmCloseMessage || '¿Seguro que quieres cerrar? Los datos no guardados se perderán.')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [confirmClose, dirty, confirmCloseMessage, onClose]);

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
  }, [isOpen, guardedClose]);

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
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
