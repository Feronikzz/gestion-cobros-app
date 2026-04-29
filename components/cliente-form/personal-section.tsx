'use client';

import React from 'react';
import { User } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';

interface PersonalSectionProps {
  formData: Record<string, string>;
  set: (key: string, value: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ClientePersonalSection({ formData, set, expanded, onToggle }: PersonalSectionProps) {
  const inp = 'form-input';
  const lbl = 'form-label';

  return (
    <fieldset className="form-fieldset">
      <SectionHeader title="Datos del interesado (cliente)" icon={<User className="w-4 h-4 text-gray-500" />} expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div><label className={lbl}>Nombre *</label><input type="text" value={formData.nombre} onChange={e => set('nombre', e.target.value)} className={inp} required placeholder="Nombre" /></div>
          <div><label className={lbl}>1er Apellido</label><input type="text" value={formData.apellido1} onChange={e => set('apellido1', e.target.value)} className={inp} placeholder="Primer apellido" /></div>
          <div><label className={lbl}>2º Apellido</label><input type="text" value={formData.apellido2} onChange={e => set('apellido2', e.target.value)} className={inp} placeholder="Segundo apellido" /></div>
          <div><label className={lbl}>Nacionalidad</label><input type="text" value={formData.nacionalidad} onChange={e => set('nacionalidad', e.target.value)} className={inp} placeholder="Española" /></div>
          <div><label className={lbl}>Fecha de nacimiento</label><input type="date" value={formData.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Localidad nacimiento</label><input type="text" value={formData.localidad_nacimiento} onChange={e => set('localidad_nacimiento', e.target.value)} className={inp} placeholder="Ciudad" /></div>
          <div><label className={lbl}>País nacimiento</label><input type="text" value={formData.pais_nacimiento} onChange={e => set('pais_nacimiento', e.target.value)} className={inp} placeholder="España" /></div>
          <div><label className={lbl}>Nombre del padre</label><input type="text" value={formData.nombre_padre} onChange={e => set('nombre_padre', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Nombre de la madre</label><input type="text" value={formData.nombre_madre} onChange={e => set('nombre_madre', e.target.value)} className={inp} /></div>
          <div>
            <label className={lbl}>Estado civil</label>
            <select value={formData.estado_civil} onChange={e => set('estado_civil', e.target.value)} className={inp}>
              <option value="">—</option>
              <option value="S">Soltero/a</option>
              <option value="C">Casado/a</option>
              <option value="V">Viudo/a</option>
              <option value="D">Divorciado/a</option>
              <option value="Sp">Separado/a</option>
            </select>
          </div>
          <div><label className={lbl}>Pasaporte Nº</label><input type="text" value={formData.pasaporte} onChange={e => set('pasaporte', e.target.value)} className={inp} placeholder="Nº pasaporte" /></div>
        </div>
      )}
    </fieldset>
  );
}
