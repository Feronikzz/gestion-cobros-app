interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ 
  className = '', 
  variant = 'text', 
  width, 
  height, 
  lines = 1 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  };

  const style = {
    width: width || 'auto',
    height: height || 'auto'
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...style,
              width: i === lines - 1 ? '60%' : '100%' // Last line shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Skeleton components for common patterns
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }, (_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton width="80%" height="20px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  <Skeleton width="90%" height="16px" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="circular" width="32px" height="32px" />
            <Skeleton width="60px" height="16px" />
          </div>
          <Skeleton width="80%" height="24px" className="mb-2" />
          <Skeleton width="40%" height="16px" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton width="120px" height="16px" className="mb-2" />
        <Skeleton height="48px" />
      </div>
      <div>
        <Skeleton width="100px" height="16px" className="mb-2" />
        <Skeleton height="48px" />
      </div>
      <div>
        <Skeleton width="140px" height="16px" className="mb-2" />
        <Skeleton height="120px" />
      </div>
      <div className="flex gap-4">
        <Skeleton width="100px" height="40px" />
        <Skeleton width="80px" height="40px" />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton width="60%" height="20px" className="mb-2" />
              <Skeleton width="40%" height="16px" />
            </div>
            <div className="flex gap-2 ml-4">
              <Skeleton variant="circular" width="32px" height="32px" />
              <Skeleton variant="circular" width="32px" height="32px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
