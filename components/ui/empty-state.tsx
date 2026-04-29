'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
      <div className={`rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center ${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'}`}>
        <Icon className={`text-gray-300 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
      </div>
      <h3 className={`font-semibold text-gray-700 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      {description && (
        <p className={`text-gray-400 mt-1 max-w-sm ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
