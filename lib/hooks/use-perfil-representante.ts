'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PerfilRepresentante {
  id?: string;
  dni_nie: string;
  razon_social: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  domicilio: string;
  numero: string;
  piso: string;
  localidad: string;
  cp: string;
  provincia: string;
  telefono: string;
  email: string;
  emails_sugeridos: string[];
}

const EMPTY_PERFIL: PerfilRepresentante = {
  dni_nie: '', razon_social: '', nombre: '', apellido1: '', apellido2: '',
  domicilio: '', numero: '', piso: '', localidad: '', cp: '', provincia: '',
  telefono: '', email: '', emails_sugeridos: [
    'extranjeria@sepe.es',
    'oficina.extranjeria@madrid.org',
    'notificaciones@administracion.gob.es',
  ],
};

// Migrar datos de localStorage a Supabase (una sola vez)
const LOCAL_STORAGE_KEY = 'designacion_representante_perfil';
const LOCAL_EMAILS_KEY = 'designacion_emails_sugeridos';
const MIGRATED_KEY = 'perfil_representante_migrated';

export function usePerfilRepresentante() {
  const supabase = typeof window !== 'undefined' ? createClient() : null;
  const [perfil, setPerfil] = useState<PerfilRepresentante>(EMPTY_PERFIL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar perfil desde Supabase
  const fetchPerfil = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('perfil_representante')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPerfil({
          id: data.id,
          dni_nie: data.dni_nie || '',
          razon_social: data.razon_social || '',
          nombre: data.nombre || '',
          apellido1: data.apellido1 || '',
          apellido2: data.apellido2 || '',
          domicilio: data.domicilio || '',
          numero: data.numero || '',
          piso: data.piso || '',
          localidad: data.localidad || '',
          cp: data.cp || '',
          provincia: data.provincia || '',
          telefono: data.telefono || '',
          email: data.email || '',
          emails_sugeridos: data.emails_sugeridos || EMPTY_PERFIL.emails_sugeridos,
        });
      } else if (error?.code === 'PGRST116') {
        // No profile yet — try migrating from localStorage
        await migrateFromLocalStorage(user.id);
      }
    } catch (err) {
      console.error('Error loading perfil representante:', err);
      // Fallback: try localStorage
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const emails = localStorage.getItem(LOCAL_EMAILS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPerfil(prev => ({
          ...prev,
          ...parsed,
          emails_sugeridos: emails ? JSON.parse(emails) : prev.emails_sugeridos,
        }));
      }
    } catch {}
  };

  const migrateFromLocalStorage = async (userId: string) => {
    if (!supabase) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(MIGRATED_KEY)) return;

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const emails = localStorage.getItem(LOCAL_EMAILS_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const emailsParsed = emails ? JSON.parse(emails) : EMPTY_PERFIL.emails_sugeridos;

      const payload = {
        user_id: userId,
        dni_nie: parsed.dni_nie || '',
        razon_social: parsed.razon_social || '',
        nombre: parsed.nombre || '',
        apellido1: parsed.apellido1 || '',
        apellido2: parsed.apellido2 || '',
        domicilio: parsed.domicilio || '',
        numero: parsed.numero || '',
        piso: parsed.piso || '',
        localidad: parsed.localidad || '',
        cp: parsed.cp || '',
        provincia: parsed.provincia || '',
        telefono: parsed.telefono || '',
        email: parsed.email || '',
        emails_sugeridos: emailsParsed,
      };

      const { data, error } = await supabase
        .from('perfil_representante')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (data) {
        setPerfil({
          id: data.id,
          ...payload,
        });
        localStorage.setItem(MIGRATED_KEY, 'true');
      }
    } catch (err) {
      console.error('Error migrating perfil:', err);
      loadFromLocalStorage();
    }
  };

  // Guardar perfil en Supabase
  const savePerfil = useCallback(async (newPerfil: PerfilRepresentante) => {
    if (!supabase) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        dni_nie: newPerfil.dni_nie,
        razon_social: newPerfil.razon_social,
        nombre: newPerfil.nombre,
        apellido1: newPerfil.apellido1,
        apellido2: newPerfil.apellido2,
        domicilio: newPerfil.domicilio,
        numero: newPerfil.numero,
        piso: newPerfil.piso,
        localidad: newPerfil.localidad,
        cp: newPerfil.cp,
        provincia: newPerfil.provincia,
        telefono: newPerfil.telefono,
        email: newPerfil.email,
        emails_sugeridos: newPerfil.emails_sugeridos,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('perfil_representante')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setPerfil(prev => ({ ...prev, id: data.id }));
      }

      // Also keep localStorage as fallback
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPerfil));
      localStorage.setItem(LOCAL_EMAILS_KEY, JSON.stringify(newPerfil.emails_sugeridos));
    } catch (err) {
      console.error('Error saving perfil representante:', err);
      // Fallback to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPerfil));
      localStorage.setItem(LOCAL_EMAILS_KEY, JSON.stringify(newPerfil.emails_sugeridos));
    } finally {
      setSaving(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  return { perfil, setPerfil, savePerfil, loading, saving, refetch: fetchPerfil };
}
