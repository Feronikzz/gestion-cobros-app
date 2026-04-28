'use client';

import { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { useCierreMensual } from '@/lib/hooks/use-cierre-mensual';
import { eur } from '@/lib/utils';
import { useHideSensitive } from '@/lib/hooks/use-hide-sensitive';
import { SensitiveToggle } from '@/components/sensitive-toggle';
import { Lock, Unlock, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import Loading from '@/app/loading';
import { useConfirm } from '@/components/confirm-dialog';

export default function CierrePage() {
  const { confirm } = useConfirm();
  const { cierres, summary, loading, error, createCierre } = useCierreMensual();
  const { hidden: hideSensitive, toggle: toggleSensitive, mask } = useHideSensitive();

  const isMesCerrado = (mes: string) => cierres.some(c => c.mes === mes);

  // Mostrar todos los meses con actividad (cobros o repartos)
  const activeMonthsSummary = useMemo(() => {
    return summary.filter(row => 
      row.cobradoMes > 0 || row.repartidoMes > 0 || row.arrastreAnterior > 0 || row.saldoFinal !== 0
    ).sort((a, b) => b.mes.localeCompare(a.mes)); // Ordenar del más reciente al más antiguo
  }, [summary]);

  // Mes actual para referencia
  const mesActual = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Totales de todos los meses con actividad
  const totalCobrado = useMemo(() => activeMonthsSummary.reduce((s, r) => s + r.cobradoMes, 0), [activeMonthsSummary]);
  const totalRepartido = useMemo(() => activeMonthsSummary.reduce((s, r) => s + r.repartidoMes, 0), [activeMonthsSummary]);
  const saldoActual = summary.length > 0 ? summary[summary.length - 1].saldoFinal : 0;
  
  // Estadísticas adicionales
  const mesesCerrados = useMemo(() => activeMonthsSummary.filter(row => isMesCerrado(row.mes)).length, [activeMonthsSummary, cierres]);
  const mesesAbiertos = useMemo(() => activeMonthsSummary.filter(row => !isMesCerrado(row.mes)).length, [activeMonthsSummary, cierres]);

  const handleCerrarMes = async (mes: string, label: string) => {
    if (await confirm({ 
      title: 'Cerrar mes', 
      message: `¿Estás seguro de cerrar el mes de ${label}? Esta acción no se puede deshacer fácilmente.`, 
      variant: 'warning', 
      confirmLabel: 'Cerrar mes' 
    })) {
      try { await createCierre(mes); } catch (err) { console.error(err); }
    }
  };

  if (loading) return <Loading />;
  if (error) return <LayoutShell title="Cierre mensual"><div className="error-state">Error: {error}</div></LayoutShell>;

  return (
    <LayoutShell 
      title="Cierre mensual" 
      description="Cierra el mes fiscal y genera informes. Calcula balances, arrastra saldos y prepara el siguiente período contable."
    >
      {/* ── Métricas ── */}
      <div className="dashboard-metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="metric-card metric-green">
          <TrendingUp className="metric-icon" />
          <div>
            <p className="metric-label">Total cobrado</p>
            <p className="metric-value">{mask(eur(totalCobrado))}</p>
          </div>
        </div>
        <div className="metric-card metric-red">
          <TrendingDown className="metric-icon" />
          <div>
            <p className="metric-label">Total repartido</p>
            <p className="metric-value">{mask(eur(totalRepartido))}</p>
          </div>
        </div>
        <div className="metric-card metric-blue">
          <DollarSign className="metric-icon" />
          <div>
            <p className="metric-label">Saldo actual</p>
            <p className="metric-value">{mask(eur(saldoActual))}</p>
          </div>
        </div>
        <SensitiveToggle hidden={hideSensitive} onToggle={toggleSensitive} className="absolute top-2 right-2" />
      </div>

      {/* ── Info sin actividad ── */}
      {activeMonthsSummary.length === 0 && (
        <div className="section-block" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="text-lg font-semibold text-gray-700">No hay actividad registrada</p>
          <p className="text-sm text-gray-500 mt-2">No se encontraron cobros o repartos en ningún mes</p>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Estado</th>
              <th>Cobrado</th>
              <th>Arrastre</th>
              <th>Disponible</th>
              <th>Repartido</th>
              <th>Saldo final</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {activeMonthsSummary.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No hay datos para los filtros seleccionados</td></tr>
            ) : (
              activeMonthsSummary.map((row) => {
                const cerrado = isMesCerrado(row.mes);
                return (
                  <tr key={row.mes} className={row.mes === mesActual ? 'bg-blue-50' : ''}>
                    <td className="font-medium">
                      {row.label}
                      {row.mes === mesActual && (
                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                          Actual
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${cerrado ? 'badge-red' : 'badge-green'}`}>
                        {cerrado ? 'Cerrado' : 'Abierto'}
                      </span>
                    </td>
                    <td style={{ color: '#16a34a' }}>{eur(row.cobradoMes)}</td>
                    <td style={{ color: '#2563eb' }}>{eur(row.arrastreAnterior)}</td>
                    <td className="font-medium">{eur(row.totalDisponible)}</td>
                    <td style={{ color: '#dc2626' }}>{eur(row.repartidoMes)}</td>
                    <td className="font-medium" style={{ color: row.saldoFinal >= 0 ? '#16a34a' : '#dc2626' }}>
                      {eur(row.saldoFinal)}
                    </td>
                    <td>
                      {!cerrado ? (
                        <button onClick={() => handleCerrarMes(row.mes, row.label)} className="btn btn-secondary btn-sm">
                          <Lock className="w-3.5 h-3.5" /> Cerrar
                        </button>
                      ) : (
                        <span className="subtle-text" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Lock className="w-3 h-3" /> Cerrado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </LayoutShell>
  );
}
