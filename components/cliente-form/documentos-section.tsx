'use client';

import React from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';

export interface DocIdentidadForm {
  tipo: string;
  numero: string;
  fecha_expedicion: string;
  fecha_caducidad: string;
  es_principal: boolean;
}

interface DocumentosSectionProps {
  documentos: DocIdentidadForm[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof DocIdentidadForm, value: string | boolean) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ClienteDocumentosSection({ documentos, onAdd, onRemove, onUpdate, expanded, onToggle }: DocumentosSectionProps) {
  const inp = 'form-input';
  const lbl = 'form-label';

  return (
    <fieldset className="form-fieldset">
      <SectionHeader title="Documentos de identidad" icon={<FileText className="w-4 h-4 text-gray-500" />} expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="mt-3 space-y-4">
          {documentos.map((doc, index) => (
            <div key={index} className={`p-3 rounded-lg border ${doc.es_principal ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="doc_principal" checked={doc.es_principal} onChange={() => onUpdate(index, 'es_principal', true)} className="form-checkbox" />
                  <span className="text-xs font-medium text-gray-600">{doc.es_principal ? 'Principal' : 'Marcar como principal'}</span>
                </label>
                {documentos.length > 1 && (
                  <button type="button" onClick={() => onRemove(index)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={`${lbl} text-xs`}>Tipo</label>
                  <select value={doc.tipo} onChange={e => onUpdate(index, 'tipo', e.target.value)} className={`${inp} text-sm`}>
                    <option value="DNI">DNI</option>
                    <option value="NIE">NIE</option>
                    <option value="NIF">NIF</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="CIF">CIF</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div><label className={`${lbl} text-xs`}>Número *</label><input type="text" value={doc.numero} onChange={e => onUpdate(index, 'numero', e.target.value)} className={`${inp} text-sm`} placeholder="12345678A" /></div>
                <div><label className={`${lbl} text-xs`}>Expedición</label><input type="date" value={doc.fecha_expedicion} onChange={e => onUpdate(index, 'fecha_expedicion', e.target.value)} className={`${inp} text-sm`} /></div>
                <div><label className={`${lbl} text-xs`}>Caducidad</label><input type="date" value={doc.fecha_caducidad} onChange={e => onUpdate(index, 'fecha_caducidad', e.target.value)} className={`${inp} text-sm`} /></div>
              </div>
            </div>
          ))}
          <button type="button" onClick={onAdd} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800">
            <Plus className="w-3.5 h-3.5" /> Añadir otro documento
          </button>
        </div>
      )}
    </fieldset>
  );
}
