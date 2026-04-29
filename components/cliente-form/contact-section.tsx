'use client';

import React, { useRef, useState } from 'react';
import { User, Plus, X } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section-header';

interface ContactSectionProps {
  formData: Record<string, string>;
  set: (key: string, value: string) => void;
  emailsSugeridos: string[];
  onAddEmail: (email: string) => void;
  onRemoveEmail: (email: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ClienteContactSection({ formData, set, emailsSugeridos, onAddEmail, onRemoveEmail, expanded, onToggle }: ContactSectionProps) {
  const inp = 'form-input';
  const lbl = 'form-label';
  const emailRef = useRef<HTMLDivElement>(null);
  const [showEmailDD, setShowEmailDD] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  return (
    <fieldset className="form-fieldset">
      <SectionHeader title="Contacto y domicilio" icon={<User className="w-4 h-4 text-gray-500" />} expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div><label className={lbl}>Teléfono</label><input type="tel" value={formData.telefono} onChange={e => set('telefono', e.target.value)} className={inp} placeholder="600 000 000" /></div>
          <div><label className={lbl}>2º teléfono</label><input type="tel" value={formData.telefono2} onChange={e => set('telefono2', e.target.value)} className={inp} placeholder="912 345 678" /></div>
          <div className="relative" ref={emailRef}>
            <label className={lbl}>E-mail</label>
            <input
              className={inp}
              value={formData.email}
              onChange={e => set('email', e.target.value)}
              onFocus={() => setShowEmailDD(true)}
              onBlur={(e) => {
                if (!emailRef.current?.contains(e.relatedTarget as Node)) {
                  setTimeout(() => setShowEmailDD(false), 150);
                }
              }}
              placeholder="email@ejemplo.com"
            />
            {showEmailDD && emailsSugeridos.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {emailsSugeridos.map(email => (
                  <div key={email} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 cursor-pointer group">
                    <span className="text-sm text-gray-700 flex-1" onMouseDown={(e) => { e.preventDefault(); set('email', email); setShowEmailDD(false); }}>{email}</span>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); onRemoveEmail(email); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100">
                  <input className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none" placeholder="Añadir email…" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddEmail(newEmail); setNewEmail(''); } }} />
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); onAddEmail(newEmail); setNewEmail(''); }} className="text-gray-500 hover:text-gray-800"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
          <div className="md:col-span-1"><label className={lbl}>Domicilio (calle)</label><input type="text" value={formData.direccion_calle} onChange={e => set('direccion_calle', e.target.value)} className={inp} placeholder="Calle Mayor" /></div>
          <div><label className={lbl}>Nº</label><input type="text" value={formData.direccion_numero} onChange={e => set('direccion_numero', e.target.value)} className={inp} placeholder="12" /></div>
          <div><label className={lbl}>Piso</label><input type="text" value={formData.direccion_piso} onChange={e => set('direccion_piso', e.target.value)} className={inp} placeholder="3ºA" /></div>
          <div><label className={lbl}>C.P.</label><input type="text" value={formData.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} className={inp} placeholder="28001" maxLength={5} /></div>
          <div><label className={lbl}>Localidad</label><input type="text" value={formData.localidad} onChange={e => set('localidad', e.target.value)} className={inp} placeholder="Madrid" /></div>
          <div><label className={lbl}>Provincia</label><input type="text" value={formData.provincia} onChange={e => set('provincia', e.target.value)} className={inp} placeholder="Madrid" /></div>
        </div>
      )}
    </fieldset>
  );
}
