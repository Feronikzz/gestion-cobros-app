'use client';

import { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { useCierreMensual } from '@/lib/hooks/use-cierre-mensual';
import { eur } from '@/lib/utils';
import { Lock, Unlock, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

export default function CierrePage() {
  const { cierres, summary, loading, error, createCierre } = useCierreMensual();
  const [filterEstado, setFilterEstado] = useState<'todos' | 'abierto' | 'cerrado'>('todos');
  const [filterAnio, setFilterAnio] = useState<string>('');

  const aniosDisponibles = useMemo(() => {
    const set = new Set(summary.map(s => s.mes.slice(0, 4)));
    return Array.from(set).sort().reverse();
  }, [summary]);

  const isMesCerrado = (mes: string) => cierres.some(c => c.mes === mes);

  const filteredSummary = useMemo(() => {
    return summary.filter(row => {
      const cerrado = isMesCerrado(row.mes);
      if (filterEstado === 'abierto' && cerrado) return false;
      if (filterEstado === 'cerrado' && !cerrado) return false;
      if (filterAnio && !row.mes.startsWith(filterAnio)) return false;
      return true;
    });
  }, [summary, filterEstado, filterAnio, cierres]);

  // Totales filtrados
  const totalCobrado = useMemo(() => filteredSummary.reduce((s, r) => s + r.cobradoMes, 0), [filteredSummary]);
  const totalRepartido = useMemo(() => filteredSummary.reduce((s, r) => s + r.repartidoMes, 0), [filteredSummary]);
  const saldoActual = summary.length > 0 ? summary[summary.length - 1].saldoFinal : 0;

  const handleCerrarMes = async (mes: string, label: string) => {
    if (window.confirm(`¿Cerrar el mes de ${label}? Esta acción no se puede deshacer fácilmente.`)) {
      try { await createCierre(mes); } catch (err) { console.error(err); }
    }
  };

  if (loading) return <LayoutShell title="Cierre mensual"><div className="loading-state">Calculando cierres...</div></LayoutShell>;
  if (error) return <LayoutShell title="Cierre mensual"><div className="error-state">Error: {error}</div></LayoutShell>;

  return (
    <LayoutShell title="Cierre mensual">
      {/* ── Métricas ── */}
      <div className="dashboard-metrics">
        <div className="metric-card metric-green">
          <TrendingUp className="metric-icon" />
          <div>
            <p className="metric-label">Total cobrado</p>
            <p className="metric-value">{eur(totalCobrado)}</p>
          </div>
        </div>
        <div className="metric-card metric-red">
          <TrendingDown className="metric-icon" />
          <div>
            <p className="metric-label">Total repartido</p>
            <p className="metric-value">{eur(totalRepartido)}</p>
          </div>
        </div>
        <div className="metric-card metric-blue">
          <DollarSign className="metric-icon" />
          <div>
            <p className="metric-label">Saldo actual</p>
            <p className="metric-value">{eur(saldoActual)}</p>
          </div>
        </div>
        <div className="metric-card metric-amber">
          <Calendar className="metric-icon" />
          <div>
            <p className="metric-label">Meses cerrados</p>
            <p className="metric-value">{cierres.length} / {summary.length}</p>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="search-bar">
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value as 'todos' | 'abierto' | 'cerrado')} className="form-input search-select">
          <option value="todos">Todos los estados</option>
          <option value="abierto">Solo abiertos</option>
          <option value="cerrado">Solo cerrados</option>
        </select>
        <select value={filterAnio} onChange={e => setFilterAnio(e.target.value)} className="form-input search-select">
          <option value="">Todos los años</option>
          {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <p className="result-count" style={{ margin: 0, alignSelf: 'center' }}>{filteredSummary.length} meses</p>
      </div>

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
            {filteredSummary.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No hay datos para los filtros seleccionados</td></tr>
            ) : (
              filteredSummary.map((row) => {
                const cerrado = isMesCerrado(row.mes);
                return (
                  <tr key={row.mes}>
                    <td className="font-medium">{row.label}</td>
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
