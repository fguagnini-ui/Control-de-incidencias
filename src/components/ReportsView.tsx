import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, Filter, AlertCircle, ArrowDownToLine, CheckCircle2 } from 'lucide-react';
import { StockReport, ReportStatus, ReportType } from '../types/stock';
import { ReportCard } from './ReportCard';

interface ReportsViewProps {
  reportes: StockReport[];
  onStatusChange: (id: string, newStatus: ReportStatus) => void;
  onGoToMovement: (movementId: string) => void;
  onResolveSingle: (id: string) => void;
  onOpenNewReport: (type?: ReportType | null) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reportes,
  onStatusChange,
  onGoToMovement,
  onResolveSingle,
  onOpenNewReport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Abiertas');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');

  // Filter logic
  const filteredReports = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return [...reportes].reverse().filter((r) => {
      // Status filter: "Abiertas" shows all except "Cerrado"
      if (statusFilter === 'Abiertas' || statusFilter === 'abiertas') {
        if (r.estado === 'Cerrado') return false;
      } else if (statusFilter !== 'Todos' && r.estado !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'Todos' && r.tipo !== typeFilter) return false;

      // Text search across all fields including all items/SKUs
      if (!q) return true;
      const itemsText = (r.items || []).map((it) => `${it.sku} ${it.desc}`).join(' ');
      const haystack = [
        r.id,
        r.sku,
        r.desc,
        r.trx,
        r.reporta,
        r.origen,
        r.causa,
        r.sol,
        r.ubicacion || '',
        r.mov || '',
        itemsText
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [reportes, searchQuery, statusFilter, typeFilter]);

  const countByStatus = (status: string) => {
    if (status === 'Todos') return reportes.length;
    if (status === 'Abiertas' || status === 'abiertas') {
      return reportes.filter((r) => r.estado !== 'Cerrado').length;
    }
    return reportes.filter((r) => r.estado === status).length;
  };

  const countByType = (type: string) => {
    if (type === 'Todos') return reportes.length;
    return reportes.filter((r) => r.tipo === type).length;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="bg-white dark:bg-neutral-800 p-3.5 sm:p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/80 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU, nombre de producto, transacción, quién reporta, ID…"
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
        </div>

        {/* Filter controls row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-nowrap sm:flex-wrap">
            <span className="text-neutral-400 dark:text-neutral-500 font-semibold mr-1 shrink-0">
              Estado:
            </span>
            {[
              { id: 'Abiertas', label: 'Abiertas' },
              { id: 'Todos', label: 'Todos' },
              { id: 'Notificado', label: 'Notificado' },
              { id: 'En revisión', label: 'En revisión' },
              { id: 'Cerrado', label: 'Cerradas' }
            ].map(({ id, label }) => {
              const count = countByStatus(id);
              const isActive = statusFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                  title={id === 'Abiertas' ? 'Muestra todos los reportes excepto los cerrados' : undefined}
                >
                  <span>{label}</span>
                  <span className="ml-1 opacity-70 font-mono text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-nowrap sm:flex-wrap">
            <span className="text-neutral-400 dark:text-neutral-500 font-semibold mr-1 shrink-0">
              Tipo:
            </span>
            {[
              { id: 'Todos', label: 'Todos' },
              { id: 'problema', label: 'Problemas (-)' },
              { id: 'ingreso', label: 'Ingresos (+)' },
              { id: 'encontrado', label: 'Encontrados (+)' }
            ].map((t) => {
              const count = countByType(t.id);
              const isActive = typeFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="ml-1 opacity-70 font-mono text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onStatusChange={onStatusChange}
              onGoToMovement={onGoToMovement}
              onResolveSingle={onResolveSingle}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
            No se encontraron reportes
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery || statusFilter !== 'Todos' || typeFilter !== 'Todos'
              ? 'Probá ajustando la búsqueda o quitando los filtros seleccionados.'
              : 'Todavía no hay reportes cargados. Creá uno para comenzar.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenNewReport('problema')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              + Reportar problema (-)
            </button>
            <button
              type="button"
              onClick={() => onOpenNewReport('ingreso')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              + Ingreso / Encontrado (+)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
