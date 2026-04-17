'use client';

import { useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useCobros } from '@/lib/hooks/use-cobros';
import { useRepartos } from '@/lib/hooks/use-repartos';
import { useCierreMensual } from '@/lib/hooks/use-cierre-mensual';
import { eur } from '@/lib/utils';
import { useHideSensitive } from '@/lib/hooks/use-hide-sensitive';
import { SensitiveToggle } from '@/components/sensitive-toggle';
import Link from 'next/link';
import { Users, CreditCard, DollarSign, TrendingDown, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { clientes } = useClientes();
  const { cobros } = useCobros();
  const { repartos } = useRepartos();
  const { summary } = useCierreMensual();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const cur = summary.find(s => s.mes === currentMonth);

  const { hidden: hideSensitive, toggle: toggleSensitive, mask } = useHideSensitive();
  const totalCobrado = useMemo(() => cobros.reduce((s, c) => s + c.importe, 0), [cobros]);
  const totalRepartido = useMemo(() => repartos.reduce((s, r) => s + r.importe, 0), [repartos]);

  const ultimosCobros = useMemo(() => {
    return cobros.slice(0, 5).map(cobro => {
      const cliente = clientes.find(c => c.id === cobro.cliente_id);
      return { ...cobro, clienteNombre: cliente?.nombre || '—' };
    });
  }, [cobros, clientes]);

  return (
    <LayoutShell 
      title="Dashboard" 
      description="Vista general de tu negocio con métricas clave, actividad reciente y estado financiero actual."
    >
      {/* ── Métricas principales ── */}
      <div className="dashboard-metrics">
        <div className="metric-card metric-green">
          <DollarSign className="metric-icon" />
          <div>
            <p className="metric-label">Cobrado este mes</p>
            <p className="metric-value">{mask(eur(cur?.cobradoMes || 0))}</p>
          </div>
        </div>
        <div className="metric-card metric-red">
          <TrendingDown className="metric-icon" />
          <div>
            <p className="metric-label">Repartido este mes</p>
            <p className="metric-value">{mask(eur(cur?.repartidoMes || 0))}</p>
          </div>
        </div>
        <div className="metric-card metric-blue">
          <CreditCard className="metric-icon" />
          <div>
            <p className="metric-label">Saldo disponible</p>
            <p className="metric-value">{mask(eur(cur?.totalDisponible || 0))}</p>
          </div>
        </div>
        <div className="metric-card metric-amber">
          <Users className="metric-icon" />
          <div>
            <p className="metric-label">Clientes activos</p>
            <p className="metric-value">{clientes.filter(c => c.estado === 'activo').length}</p>
          </div>
        </div>
        <SensitiveToggle hidden={hideSensitive} onToggle={toggleSensitive} className="absolute top-2 right-2" />
      </div>

      {/* ── Resumen global ── */}
      <div className="dashboard-summary">
        <div className="summary-item">
          <span className="summary-label">Total cobrado histórico</span>
          <span className="summary-value text-green-700">{mask(eur(totalCobrado))}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total repartido histórico</span>
          <span className="summary-value text-red-700">{mask(eur(totalRepartido))}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total clientes</span>
          <span className="summary-value">{clientes.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Cobros registrados</span>
          <span className="summary-value">{cobros.length}</span>
        </div>
      </div>

      {/* ── Acciones rápidas ── */}
      <div className="dashboard-actions">
        <Link href="/clientes" className="quick-action">
          <Users className="w-5 h-5" />
          <span>Clientes</span>
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Link>
        <Link href="/cobros" className="quick-action">
          <CreditCard className="w-5 h-5" />
          <span>Cobros</span>
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Link>
        <Link href="/gastos" className="quick-action">
          <TrendingDown className="w-5 h-5" />
          <span>Gastos</span>
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Link>
        <Link href="/cierre" className="quick-action">
          <DollarSign className="w-5 h-5" />
          <span>Cierre mensual</span>
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Link>
      </div>

      {/* ── Últimos cobros ── */}
      <div className="table-container" style={{ padding: 'var(--space-lg)' }}>
        <div className="section-header">
          <h3>Últimos cobros</h3>
          <Link href="/cobros" className="link-accent">Ver todos</Link>
        </div>
        {ultimosCobros.length === 0 ? (
          <p className="empty-state-inline">No hay cobros registrados</p>
        ) : (
          <div className="activity-list">
            {ultimosCobros.map((c) => (
              <div key={c.id} className="activity-item">
                <div>
                  <p className="activity-name">{c.clienteNombre}</p>
                  <p className="activity-date">{c.fecha_cobro} · {c.metodo_pago}</p>
                </div>
                <span className="activity-amount">{mask(eur(c.importe))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
