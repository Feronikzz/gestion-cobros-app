import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string | ReactNode;
}

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-card-icon">
          📊
        </div>
        <span className="stat-card-title">{title}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      {subtitle && <div className="stat-card-change positive">{subtitle}</div>}
    </div>
  );
}
