'use client';

import React from 'react';
import { FileSignature, User, Save } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';

interface RepresentanteSectionProps {
  repte: Record<string, any>;
  setT: (key: string, value: string) => void;
  onSaveRepte: () => Promise<void>;
  savingRepte: boolean;
  savedRepMsg: boolean;
  expanded: boolean;
  onToggle: () => void;
}

export function ClienteRepresentanteSection({ repte, setT, onSaveRepte, savingRepte, savedRepMsg, expanded, onToggle }: RepresentanteSectionProps) {
  const inp = 'form-input';
  const lbl = 'form-label';

  return (
    <fieldset className="form-fieldset">
      <SectionHeader title="Datos del representante (apoderado)" icon={<FileSignature className="w-4 h-4 text-gray-500" />} expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-500"><User className="w-3.5 h-3.5" /> Sincronizado en todos tus dispositivos</div>
            <button type="button" onClick={onSaveRepte} className="btn btn-secondary btn-sm flex items-center gap-1">
              <Save className="w-3 h-3" /> {savedRepMsg ? '✓ Guardado' : savingRepte ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={lbl}>DNI/NIF/NIE</label><input className={inp} value={repte.dni_nie} onChange={e => setT('dni_nie', e.target.value)} /></div>
            <div className="md:col-span-2"><label className={lbl}>Razón Social</label><input className={inp} value={repte.razon_social} onChange={e => setT('razon_social', e.target.value)} /></div>
            <div><label className={lbl}>Nombre</label><input className={inp} value={repte.nombre} onChange={e => setT('nombre', e.target.value)} /></div>
            <div><label className={lbl}>1er Apellido</label><input className={inp} value={repte.apellido1} onChange={e => setT('apellido1', e.target.value)} /></div>
            <div><label className={lbl}>2º Apellido</label><input className={inp} value={repte.apellido2} onChange={e => setT('apellido2', e.target.value)} /></div>
            <div className="md:col-span-2"><label className={lbl}>Domicilio</label><input className={inp} value={repte.domicilio} onChange={e => setT('domicilio', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>Nº</label><input className={inp} value={repte.numero} onChange={e => setT('numero', e.target.value)} /></div>
              <div><label className={lbl}>Piso</label><input className={inp} value={repte.piso} onChange={e => setT('piso', e.target.value)} /></div>
            </div>
            <div><label className={lbl}>Localidad</label><input className={inp} value={repte.localidad} onChange={e => setT('localidad', e.target.value)} /></div>
            <div><label className={lbl}>C.P.</label><input className={inp} value={repte.cp} onChange={e => setT('cp', e.target.value)} /></div>
            <div><label className={lbl}>Provincia</label><input className={inp} value={repte.provincia} onChange={e => setT('provincia', e.target.value)} /></div>
            <div><label className={lbl}>Teléfono</label><input className={inp} value={repte.telefono} onChange={e => setT('telefono', e.target.value)} /></div>
            <div><label className={lbl}>E-mail</label><input className={inp} value={repte.email} onChange={e => setT('email', e.target.value)} /></div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
