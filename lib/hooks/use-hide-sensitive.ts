'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'hide-sensitive-values';

/**
 * Hook compartido para ocultar/mostrar valores sensibles (importes).
 * Persiste la preferencia en localStorage.
 */
export function useHideSensitive() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setHidden(true);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setHidden(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  /** Devuelve '******' si oculto, o el valor formateado si visible */
  const mask = useCallback((value: string) => {
    return hidden ? '******' : value;
  }, [hidden]);

  return { hidden, toggle, mask };
}
