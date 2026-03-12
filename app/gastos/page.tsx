'use client';

import { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { GastoForm } from '@/components/gasto-form';
import { Modal } from '@/components/modal';
import { SearchFilters } from '@/components/search-filters';
import { useGastos } from '@/lib/hooks/use-gastos';
import type { Gasto } from '@/lib/supabase/types';
import { eur, monthLabel } from '@/lib/utils';
import { FileText, Download, Eye, Edit, Trash2, Receipt } from 'lucide-react';

export default function GastosPage() {
  const { gastos, loading, error, createGasto, updateGasto, deleteGasto } = useGastos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [mesFilter, setMesFilter] = useState('');

  // Filtrar gastos
  const filteredGastos = useMemo(() => {
    return gastos.filter(gasto => {
      const matchesSearch = searchQuery === '' || 
        gasto.proveedor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gasto.conceptos.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
        gasto.numero_factura?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gasto.notas?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategoria = categoriaFilter === '' || gasto.categoria === categoriaFilter;
      const matchesMes = mesFilter === '' || gasto.mes === mesFilter;

      return matchesSearch && matchesCategoria && matchesMes;
    });
  }, [gastos, searchQuery, categoriaFilter, mesFilter]);

  // Obtener meses únicos para filtros
  const mesesUnicos = useMemo(() => {
    const meses = [...new Set(gastos.map(g => g.mes))].sort().reverse();
    return meses.map(mes => ({ value: mes, label: monthLabel(mes) }));
  }, [gastos]);

  const categorias = [
    'Suministros',
    'Alquiler', 
    'Material',
    'Servicios',
    'Impuestos',
    'Marketing',
    'Transporte',
    'Otros'
  ];

  const categoriaOptions = categorias.map(cat => ({ value: cat, label: cat }));

  const handleCreate = () => {
    setEditingGasto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (gasto: Gasto) => {
    setEditingGasto(gasto);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Gasto, 'id' | 'user_id' | 'created_at'>) => {
    try {
      if (editingGasto) {
        await updateGasto(editingGasto.id, data);
      } else {
        await createGasto(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (gasto: Gasto) => {
    if (window.confirm(`¿Estás seguro de eliminar el gasto de ${gasto.proveedor}?`)) {
      try {
        await deleteGasto(gasto.id);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleViewFactura = (facturaUrl: string) => {
    window.open(facturaUrl, '_blank');
  };

  if (loading) {
    return (
      <LayoutShell title="Gastos">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando gastos...</div>
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell title="Gastos">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Gastos">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Gestión de Gastos
        </h2>
        <button
          onClick={handleCreate}
          className="btn btn-primary"
        >
          Nuevo Gasto
        </button>
      </div>

      <SearchFilters
        onSearch={setSearchQuery}
        onFilterChange={(filters) => {
          setCategoriaFilter(filters.categoria || '');
          setMesFilter(filters.mes || '');
        }}
        filters={[
          {
            key: 'categoria',
            label: 'Categoría',
            options: categoriaOptions
          },
          {
            key: 'mes',
            label: 'Mes',
            options: mesesUnicos
          }
        ]}
        placeholder="Buscar por proveedor, conceptos o factura..."
      />

      <div className="mb-4 text-sm text-gray-600">
        Mostrando {filteredGastos.length} de {gastos.length} gastos
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Conceptos</th>
              <th>Categoría</th>
              <th>Importe</th>
              <th>Factura</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredGastos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  {searchQuery || categoriaFilter || mesFilter ? 'No se encontraron gastos con los filtros aplicados' : 'No hay gastos registrados'}
                </td>
              </tr>
            ) : (
              filteredGastos.map((gasto) => (
                <tr key={gasto.id}>
                  <td>{gasto.fecha}</td>
                  <td className="font-medium">{gasto.proveedor}</td>
                  <td className="max-w-xs">
                    <div className="text-sm">
                      {gasto.conceptos.slice(0, 2).map((concepto, idx) => (
                        <span key={idx} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                          {concepto}
                        </span>
                      ))}
                      {gasto.conceptos.length > 2 && (
                        <span className="text-gray-500 text-xs">+{gasto.conceptos.length - 2} más</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      gasto.categoria === 'Suministros' ? 'bg-blue-100 text-blue-800' :
                      gasto.categoria === 'Alquiler' ? 'bg-purple-100 text-purple-800' :
                      gasto.categoria === 'Material' ? 'bg-green-100 text-green-800' :
                      gasto.categoria === 'Servicios' ? 'bg-yellow-100 text-yellow-800' :
                      gasto.categoria === 'Impuestos' ? 'bg-red-100 text-red-800' :
                      gasto.categoria === 'Marketing' ? 'bg-pink-100 text-pink-800' :
                      gasto.categoria === 'Transporte' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {gasto.categoria}
                    </span>
                  </td>
                  <td className="font-medium text-red-600">{eur(gasto.importe_total)}</td>
                  <td>
                    {gasto.factura_url ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewFactura(gasto.factura_url!)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver factura"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={gasto.factura_url}
                          download
                          className="text-green-600 hover:text-green-800"
                          title="Descargar factura"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400">
                        <Receipt className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(gasto)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(gasto)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'}
      >
        <GastoForm
          gasto={editingGasto || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </LayoutShell>
  );
}
