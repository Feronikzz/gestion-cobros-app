'use client';

import { Suspense } from 'react';
import { FacturasPageContent } from './facturas-page-content';

export default function FacturasPage() {
  return (
    <Suspense fallback={<div className="loading-state">Cargando facturas...</div>}>
      <FacturasPageContent />
    </Suspense>
  );
}
