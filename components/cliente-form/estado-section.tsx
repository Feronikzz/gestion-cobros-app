'use client';

import React from 'react';
import { User } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';
import type { Cliente } from '@/lib/supabase/types';

interface EstadoSectionProps {
  formData: Record<string, string>;
  set: (key: string, value: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ClienteEstadoSection({ formData, set, expanded, onToggle }: EstadoSectionProps) {
  const inp = 'form-input';
  const lbl = 'form-label';

  return (
    <fieldset className="form-fieldset">
      <SectionHeader title="Estado y notas" icon={<User className="w-4 h-4 text-gray-500" />} expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label className={lbl}>Estado del cliente *</label>
            <select value={formData.estado} onChange={e => set('estado', e.target.value)} className={inp}>
              <option value="activo">Activo</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Fecha de entrada *</label>
            <input type="date" value={formData.fecha_entrada} onChange={e => set('fecha_entrada', e.target.value)} className={inp} required />
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>Notas</label>
            <textarea value={formData.notas} onChange={e => set('notas', e.target.value)} className={inp} rows={2} placeholder="Observaciones generales sobre el cliente..." />
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>Carpeta local</label>
            <input type="text" value={formData.carpeta_local} onChange={e => set('carpeta_local', e.target.value)} className={inp} placeholder="C:\Clientes\NombreCliente" />
          </div>
        </div>
      )}
    </fieldset>
  );
}
