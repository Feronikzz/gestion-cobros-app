'use client';

import { useMemo } from 'react';
import { eur } from '@/lib/utils';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface MiniChartProps {
  data: ChartData[];
  title: string;
  type: 'bar' | 'line' | 'pie';
  height?: number;
}

export function MiniChart({ data, title, type, height = 120 }: MiniChartProps) {
  const maxValue = useMemo(() => {
    const validData = data.filter(d => d.value > 0);
    return validData.length > 0 ? Math.max(...validData.map(d => d.value)) : 1;
  }, [data]);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  if (type === 'bar') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">{title}</h3>
        <div className="flex items-end gap-2" style={{ height: `${height}px` }}>
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full relative">
                <div
                  className="bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all duration-1000 ease-out"
                  style={{
                    height: `${maxValue > 0 ? (item.value / maxValue) * height : 0}px`,
                    animation: `slideUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                />
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 opacity-0 transition-opacity duration-300">
                  {eur(item.value)}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const validData = data.filter(d => d.value > 0);
    const points = validData.length > 0 ? validData.map((item, index) => {
      const x = (index / (validData.length - 1)) * 100;
      const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50;
      return `${x},${y}`;
    }).join(' ') : '';

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">{title}</h3>
        <div className="relative" style={{ height: `${height}px` }}>
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="0.5"
              />
            ))}
            
            {/* Area under curve */}
            {validData.length > 1 && (
              <>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                <polygon
                  points={`0,100 ${points} 100,100`}
                  fill="url(#gradient)"
                  className="animate-fadeIn"
                  style={{ animationDelay: '0.3s' }}
                />
                
                {/* Line */}
                <polyline
                  points={points}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-drawPath"
                  style={{ animationDelay: '0.5s' }}
                />
                
                {/* Data points */}
                {validData.map((item, index) => {
                  const x = (index / (validData.length - 1)) * 100;
                  const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#f59e0b"
                      className="animate-popIn"
                      style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                    />
                  );
                })}
              </>
            )}
            
            {validData.length <= 1 && (
              <text
                x="50"
                y="50"
                textAnchor="middle"
                className="text-gray-400 text-sm"
              >
                Sin datos suficientes
              </text>
            )}
          </svg>
          
          {/* Labels */}
          <div className="flex justify-between mt-2">
            {data.map((item, index) => (
              <div key={index} className="text-xs text-gray-500">
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    const validData = data.filter(d => d.value > 0);
    
    if (validData.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">{title}</h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-400 text-sm">Sin datos disponibles</div>
          </div>
        </div>
      );
    }
    
    let currentAngle = -90; // Start from top
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="relative" style={{ width: `${height}px`, height: `${height}px` }}>
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full transform -rotate-90"
            >
              {validData.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                
                const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
                
                const largeArc = angle > 180 ? 1 : 0;
                
                const pathData = [
                  `M 50 50`,
                  `L ${x1} ${y1}`,
                  `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');
                
                currentAngle = endAngle;
                
                return (
                  <path
                    key={index}
                    d={pathData}
                    fill={item.color || '#f59e0b'}
                    className="animate-fadeIn"
                    style={{ 
                      animationDelay: `${index * 0.1}s`,
                      transformOrigin: '50% 50%',
                      transform: 'rotate(90deg)'
                    }}
                  />
                );
              })}
            </svg>
            
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center transform rotate-90">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{eur(total)}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex-1 space-y-2">
            {validData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || '#f59e0b' }}
                />
                <div className="flex-1 flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">{eur(item.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ title, value, change, changeLabel, icon, trend = 'neutral' }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-50 to-transparent rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </div>
          {icon && (
            <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors duration-300">
              {icon}
            </div>
          )}
        </div>
        
        {change !== undefined && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {change}%
            </div>
            {changeLabel && (
              <span className="text-sm text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: number;
}

export function ProgressRing({ value, max, label, color = '#f59e0b', size = 100 }: ProgressRingProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
          <svg
            className="transform -rotate-90"
            width={size}
            height={size}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r="45"
              stroke="#f3f4f6"
              strokeWidth="8"
              fill="none"
            />
            
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</div>
            <div className="text-xs text-gray-500 text-center">{label}</div>
          </div>
        </div>
        
        <div className="mt-2 text-center">
          <div className="text-sm text-gray-600">{eur(value)} / {eur(max)}</div>
        </div>
      </div>
    </div>
  );
}

// Add custom animations to global styles
const customStyles = `
@keyframes slideUp {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes drawPath {
  from {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes popIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  80% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slideUp {
  animation: slideUp 0.6s ease-out both;
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out both;
}

.animate-drawPath {
  animation: drawPath 1s ease-out both;
}

.animate-popIn {
  animation: popIn 0.3s ease-out both;
}
`;

// Export styles to be added to global CSS
export { customStyles };
