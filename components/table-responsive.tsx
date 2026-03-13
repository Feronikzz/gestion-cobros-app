import { ReactNode } from 'react';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 ${className}`}>
      <div className="min-w-full inline-block align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

interface MobileCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function MobileCard({ title, subtitle, actions, children, className = '' }: MobileCardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 lg:hidden ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

interface MobileRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MobileRow({ label, value, className = '' }: MobileRowProps) {
  return (
    <div className={`flex justify-between items-start py-2 ${className}`}>
      <span className="text-sm font-medium text-gray-500 min-w-0 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right ml-4 break-words">{value}</span>
    </div>
  );
}
