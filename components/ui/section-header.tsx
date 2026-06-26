'use client';

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}

export function SectionHeader({ title, icon, expanded, onToggle }: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 text-left"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="form-legend" style={{ margin: 0, cursor: 'pointer' }}>{title}</span>
      </div>
      {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );
}
