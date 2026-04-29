'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

function Bone({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

/** Skeleton for a table-based page (header + rows) */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Bone className="h-3 w-20" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Bone className={`h-4 ${c === 0 ? 'w-32' : 'w-20'}`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Skeleton for card-based layouts (dashboard, detail) */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
          <Bone className="h-3 w-16" />
          <Bone className="h-6 w-24" />
          <Bone className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Full page skeleton: toolbar + stats + table */
export function PageSkeleton({ showStats = true, tableRows = 6 }: { showStats?: boolean; tableRows?: number }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-40" />
          <Bone className="h-4 w-64" />
        </div>
        <Bone className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stats */}
      {showStats && <CardSkeleton count={4} />}

      {/* Search bar */}
      <div className="flex gap-3">
        <Bone className="h-10 flex-1 rounded-lg" />
        <Bone className="h-10 w-32 rounded-lg" />
      </div>

      {/* Table */}
      <TableSkeleton rows={tableRows} cols={5} />
    </div>
  );
}

/** Detail page skeleton */
export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Bone className="h-5 w-5 rounded" />
        <Bone className="h-5 w-20" />
      </div>
      <div className="detail-card">
        <div className="detail-card-header">
          <Bone className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Bone className="h-3 w-16" />
              <Bone className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
      <TableSkeleton rows={3} cols={4} />
    </div>
  );
}
