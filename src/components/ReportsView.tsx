import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, Filter, Plus, ArrowDownToLine, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { StockReport, ReportStatus, ReportType } from '../types/stock';
import { ReportCard } from './ReportCard';

interface ReportsViewProps {
  reportes: StockReport[];
  onStatusChange: (id: string, newStatus: ReportStatus) => void;
  onGoToMovement: (movementId: string) => void;
  onResolveSingle: (id: string) => void;
  onOpenNewReport: (type?: ReportType | null) => void;
  onOpenImportCsv?: () => void;
  onExportCsv?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reportes,
  onStatusChange,
  onGoToMovement,
  onResolveSingle,
  onOpenNewReport,
  onOpenImportCsv,
  onExportCsv
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
    <div className="space-y-4 sm:space-y-5">
      {/* 3. VISTA: REPORTES - Encabezado visible "Reportes" por encima de la barra de búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2.5">
            <span>Reportes</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
              {reportes.length}
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Gestión y seguimiento de tickets de stock, ingresos, problemas y hallazgos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer shadow-xs"
              title="Exportar reportes filtrados a CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          )}

          {onOpenImportCsv && (
            <button
              type="button"
              onClick={onOpenImportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 transition-colors cursor-pointer shadow-xs"
              title="Importar reportes desde archivo CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Importar CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenNewReport(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo reporte</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-neutral-800 p-3.5 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU, nombre de producto, transacción, quién reporta, ID..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none pb-1 sm:pb-0 flex-nowrap sm:flex-wrap">
            <span className="text-neutral-400 dark:text-neutral-500 font-bold mr-1 shrink-0">
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
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
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
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none pb-1 sm:pb-0 flex-nowrap sm:flex-wrap">
            <span className="text-neutral-400 dark:text-neutral-500 font-bold mr-1 shrink-0">
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
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
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
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              + Reportar problema (-)
            </button>
            <button
              type="button"
              onClick={() => onOpenNewReport('ingreso')}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              + Ingreso / Encontrado (+)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
