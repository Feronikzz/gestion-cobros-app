'use client';

import { Eye, EyeOff } from 'lucide-react';

interface SensitiveToggleProps {
  hidden: boolean;
  onToggle: () => void;
  className?: string;
}

export function SensitiveToggle({ hidden, onToggle, className = '' }: SensitiveToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg transition-colors ${
        hidden 
          ? 'text-red-400 hover:text-red-600 hover:bg-red-50' 
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      } ${className}`}
      title={hidden ? 'Mostrar importes' : 'Ocultar importes'}
    >
      {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
