'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function StatsAccordion({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details 
      className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-sm group transition-all"
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-6 py-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-50 flex justify-between items-center outline-none list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {title}
        </span>
        <ChevronDown className="w-5 h-5 text-gray-400 group-open:-rotate-180 transition-transform duration-200" />
      </summary>
      
      {/* Solo renderizamos el contenido si el dropdown ha sido abierto al menos una vez para hacer lazy load del DOM */}
      {isOpen && (
        <div className="p-6 pt-0 border-t border-gray-100 mt-4 animate-in fade-in duration-300">
          {children}
        </div>
      )}
    </details>
  );
}
