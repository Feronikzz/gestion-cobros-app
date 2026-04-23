import { LayoutShell } from '@/components/layout-shell';
import { Skeleton, CardSkeleton, TableSkeleton } from '@/components/skeleton';

export default function Loading() {
  return (
    <LayoutShell title="Cargando...">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton width="40%" height="32px" />
          <Skeleton width="120px" height="40px" />
        </div>
        <CardSkeleton count={4} />
        <div className="mt-8 bg-white rounded-lg border border-gray-200">
          <TableSkeleton rows={6} columns={5} />
        </div>
      </div>
    </LayoutShell>
  );
}
