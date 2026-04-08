'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Factura, DatosEmisor } from '@/lib/supabase/types';

export function useFacturas() {
  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [emisor, setEmisor] = useState<DatosEmisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacturas = useCallback(async () => {
    if (!supabase) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const [{ data: facs, error: e1 }, { data: em, error: e2 }] = await Promise.all([
        supabase.from('facturas').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('datos_emisor').select('*').eq('user_id', user.id).limit(1).single(),
      ]);

      if (e1) throw new Error(e1.message);
      setFacturas(facs || []);
      setEmisor(em || null);
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.includes('rows returned')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Solo ejecutar en el cliente cuando supabase esté disponible
    if (typeof window !== 'undefined' && supabase) {
      fetchFacturas();
    }
  }, [fetchFacturas, supabase]);

  const saveEmisor = async (data: Omit<DatosEmisor, 'id' | 'user_id' | 'created_at'>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (emisor) {
      await supabase.from('datos_emisor').update(data).eq('id', emisor.id);
    } else {
      await supabase.from('datos_emisor').insert({ ...data, user_id: user.id });
    }
    await fetchFacturas();
  };

  const createFactura = async (data: Omit<Factura, 'id' | 'user_id' | 'created_at'>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase.from('facturas').insert({ ...data, user_id: user.id });
    if (err) throw new Error(err.message);
    await fetchFacturas();
  };

  const deleteFactura = async (id: string) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    await supabase.from('facturas').delete().eq('id', id);
    await fetchFacturas();
  };

  return { facturas, emisor, loading, error, saveEmisor, createFactura, deleteFactura, refetch: fetchFacturas };
}
