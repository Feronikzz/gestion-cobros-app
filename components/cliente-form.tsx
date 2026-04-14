'use client';

import { useState } from 'react';
import type { Cliente, ClienteInsert } from '@/lib/supabase/types';
import { formatField } from '@/lib/utils/text';

interface ClienteFormProps {
  cliente?: Cliente;
  onSubmit: (data: Omit<ClienteInsert, 'user_id'>) => Promise<void>;
  onCancel: () => void;
}

export function ClienteForm({ cliente, onSubmit, onCancel }: ClienteFormProps) {
  const [formData, setFormData] = useState({
    nombre: cliente?.nombre ?? '',
    nif: cliente?.nif ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    direccion: cliente?.direccion ?? '',
    anio_nacimiento: cliente?.anio_nacimiento?.toString() ?? '',
    fecha_entrada: cliente?.fecha_entrada ?? new Date().toISOString().split('T')[0],
    documento_tipo: cliente?.documento_tipo ?? 'DNI',
    documento_caducidad: cliente?.documento_caducidad ?? '',
    estado: cliente?.estado ?? ('activo' as Cliente['estado']),
    notas: cliente?.notas ?? '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        nombre: formatField(formData.nombre, 'name'),
        nif: formData.nif ? formatField(formData.nif, 'nif') : null,
        telefono: formData.telefono ? formatField(formData.telefono, 'phone') : null,
        email: formData.email ? formatField(formData.email, 'email') : null,
        direccion: formData.direccion ? formatField(formData.direccion, 'address') : null,
        anio_nacimiento: formData.anio_nacimiento ? parseInt(formData.anio_nacimiento) : null,
        documento_tipo: formData.documento_tipo || null,
        documento_caducidad: formData.documento_caducidad || null,
        notas: formData.notas ? formatField(formData.notas, 'general') : null,
        // Nuevos campos — null por defecto en este formulario básico
        apellidos: null,
        telefono2: null,
        codigo_postal: null,
        localidad: null,
        provincia: null,
        nacionalidad: null,
        documento_numero: null,
        fecha_nacimiento: null,
        carpeta_local: null,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {/* ── Datos personales ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Datos personales</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Nombre completo *</label>
            <input type="text" value={formData.nombre} onChange={(e) => set('nombre', e.target.value)} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Año de nacimiento</label>
            <input 
              type="number" 
              value={formData.anio_nacimiento} 
              onChange={(e) => set('anio_nacimiento', e.target.value)} 
              className="form-input" 
              placeholder="1990"
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>
          <div>
            <label className="form-label">NIF / NIE / CIF</label>
            <input type="text" value={formData.nif} onChange={(e) => set('nif', e.target.value)} className="form-input" placeholder="12345678A" />
          </div>
          <div>
            <label className="form-label">Teléfono</label>
            <input type="tel" value={formData.telefono} onChange={(e) => set('telefono', e.target.value)} className="form-input" placeholder="600 000 000" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" value={formData.email} onChange={(e) => set('email', e.target.value)} className="form-input" placeholder="correo@ejemplo.com" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Dirección</label>
            <input type="text" value={formData.direccion} onChange={(e) => set('direccion', e.target.value)} className="form-input" />
          </div>
        </div>
      </fieldset>

      {/* ── Documentación ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Documentación</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Tipo de documento</label>
            <select value={formData.documento_tipo} onChange={(e) => set('documento_tipo', e.target.value)} className="form-input">
              <option value="DNI">DNI</option>
              <option value="NIE">NIE</option>
              <option value="Pasaporte">Pasaporte</option>
              <option value="CIF">CIF</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="form-label">Caducidad documento</label>
            <input type="date" value={formData.documento_caducidad} onChange={(e) => set('documento_caducidad', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Fecha de entrada *</label>
            <input type="date" value={formData.fecha_entrada} onChange={(e) => set('fecha_entrada', e.target.value)} className="form-input" required />
          </div>
        </div>
      </fieldset>

      {/* ── Estado y notas ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Estado</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Estado del cliente *</label>
            <select value={formData.estado} onChange={(e) => set('estado', e.target.value)} className="form-input">
              <option value="activo">Activo</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea value={formData.notas} onChange={(e) => set('notas', e.target.value)} className="form-input" rows={2} />
          </div>
        </div>
      </fieldset>

      {/* ── Acciones ── */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : cliente ? 'Actualizar' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
