import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Upload,
  RotateCcw,
  Trash2,
  ArrowUpRight,
  Filter,
  Layers,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  ArrowDownToLine,
  SearchCheck,
  FileCode2,
  FileSpreadsheet
} from 'lucide-react';
import { StockReport, StockMovement, ReportStatus, ReportType, StockDatabase } from '../types/stock';
import { fmtDate, downloadDatabaseJSON, parseDatabaseJSON } from '../utils/storage';
import { StatusButton } from './StatusButton';

interface DatabaseViewProps {
  reportes: StockReport[];
  movimientos: StockMovement[];
  onStatusChange: (id: string, newStatus: ReportStatus) => void;
  onGoToReport: (reportId: string) => void;
  onGoToMovement: (movementId: string) => void;
  onRequestDeleteMovement: (movement: StockMovement) => void;
  onResetExample: () => void;
  onClearAll: () => void;
  onImportDatabase?: (newDb: StockDatabase) => void;
  onOpenImportCsv?: () => void;
  initialQuery?: string;
  initialSubTab?: 'reportes' | 'movimientos';
}

export interface UnifiedDatabaseItem {
  id: string;
  kind: 'reporte' | 'movimiento';
  subTipo?: ReportType;
  fecha: string;
  responsable: string;
  skuDisplay: string;
  totalCant: number;
  desc: string;
  trx?: string;
  origenCausa?: string;
  sol?: string;
  estado: string;
  vinculoId?: string | null;
  rawReport?: StockReport;
  rawMovement?: StockMovement;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  reportes,
  movimientos,
  onStatusChange,
  onGoToReport,
  onGoToMovement,
  onRequestDeleteMovement,
  onResetExample,
  onClearAll,
  onImportDatabase,
  onOpenImportCsv,
  initialQuery = '',
  initialSubTab
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<
    'todos' | 'reportes' | 'movimientos' | 'problema' | 'ingreso' | 'encontrado'
  >(() => {
    if (initialSubTab === 'movimientos') return 'movimientos';
    return 'todos';
  });
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified items list
  const unifiedItems = useMemo<UnifiedDatabaseItem[]>(() => {
    const list: UnifiedDatabaseItem[] = [];

    // Map Reportes
    reportes.forEach((r) => {
      const skuDisplay =
        r.items && r.items.length > 1
          ? r.items.map((it) => `${it.sku} (x${it.cant})`).join(', ')
          : r.sku;
      const totalCant =
        r.items && r.items.length > 0
          ? r.items.reduce((s, it) => s + (it.cant || 1), 0)
          : r.cant;

      list.push({
        id: r.id,
        kind: 'reporte',
        subTipo: r.tipo,
        fecha: r.fecha,
        responsable: r.reporta,
        skuDisplay,
        totalCant,
        desc: r.desc,
        trx: r.trx,
        origenCausa: [r.origen, r.causa].filter(Boolean).join(' | '),
        sol: r.sol,
        estado: r.estado,
        vinculoId: r.mov || null,
        rawReport: r
      });
    });

    // Map Movimientos
    movimientos.forEach((m) => {
      const skuDisplay = m.lineas.map((l) => `${l.sku} (${l.accion} x${l.cant})`).join(', ');
      const totalCant = m.lineas.reduce((s, l) => s + (l.cant || 1), 0);

      list.push({
        id: m.id,
        kind: 'movimiento',
        fecha: m.fecha,
        responsable: m.resp,
        skuDisplay,
        totalCant,
        desc: m.notas || `Movimiento de stock (${m.lineas.length} líneas)`,
        trx: '',
        origenCausa: '',
        sol: '',
        estado: m.estado,
        vinculoId: m.lineas.map((l) => l.pid).filter(Boolean).join(', ') || null,
        rawMovement: m
      });
    });

    // Sort chronologically (newest first)
    return list.sort((a, b) => {
      const dateA = new Date(a.fecha || 0).getTime();
      const dateB = new Date(b.fecha || 0).getTime();
      return dateB - dateA;
    });
  }, [reportes, movimientos]);

  // Unique responsibles list for filter dropdown
  const responsiblesList = useMemo(() => {
    const set = new Set<string>();
    unifiedItems.forEach((it) => {
      if (it.responsable) set.add(it.responsable.trim());
    });
    return Array.from(set).sort();
  }, [unifiedItems]);

  // Filtered rows
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return unifiedItems.filter((item) => {
      // 1. Type Filter
      if (typeFilter === 'reportes' && item.kind !== 'reporte') return false;
      if (typeFilter === 'movimientos' && item.kind !== 'movimiento') return false;
      if (typeFilter === 'problema' && item.subTipo !== 'problema') return false;
      if (typeFilter === 'ingreso' && item.subTipo !== 'ingreso') return false;
      if (typeFilter === 'encontrado' && item.subTipo !== 'encontrado') return false;

      // 2. Status Filter
      if (statusFilter !== 'todos' && item.estado !== statusFilter) return false;

      // 3. Responsible Filter
      if (responsibleFilter !== 'todos' && item.responsable !== responsibleFilter) return false;

      // 4. Free text Search
      if (q) {
        const text = [
          item.id,
          item.skuDisplay,
          item.desc,
          item.responsable,
          item.trx || '',
          item.origenCausa || '',
          item.sol || '',
          item.estado,
          item.vinculoId || ''
        ]
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [unifiedItems, typeFilter, statusFilter, responsibleFilter, searchQuery]);

  // Stats counters
  const totalCount = unifiedItems.length;
  const reportsCount = reportes.length;
  const movementsCount = movimientos.length;
  const openReportsCount = reportes.filter((r) => r.estado === 'Abierto').length;

  // Handle JSON Backup Download
  const handleDownloadBackup = () => {
    const nextNp = Math.max(...reportes.map((r) => parseInt(r.id.replace('01-', ''), 10) || 0), 0) + 1;
    const nextNm = Math.max(...movimientos.map((m) => parseInt(m.id.replace('02-', ''), 10) || 0), 0) + 1;
    downloadDatabaseJSON({
      np: nextNp,
      nm: nextNm,
      reportes,
      movimientos
    });
  };

  // Handle JSON File Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseDatabaseJSON(content);
        if (onImportDatabase) {
          onImportDatabase(parsed);
        }
      } catch (err: any) {
        alert(err.message || 'Error al procesar el archivo JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export CSV of reports with all details that can be entered manually
  const handleExportCSV = () => {
    const quote = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Tipo',
      'Fecha',
      'Responsable',
      'SKU',
      'Descripcion',
      'Cantidad',
      'Comprobante_Trx',
      'Origen',
      'Causa_Motivo',
      'Observaciones',
      'Estado',
      'Ubicacion'
    ];

    const rows: string[][] = [];

    // Export reports (all or matching type filter if user selected a report type)
    const targetReports = reportes.filter((r) => {
      if (typeFilter === 'problema' && r.tipo !== 'problema') return false;
      if (typeFilter === 'ingreso' && r.tipo !== 'ingreso') return false;
      if (typeFilter === 'encontrado' && r.tipo !== 'encontrado') return false;
      if (statusFilter !== 'todos' && r.estado !== statusFilter) return false;
      if (responsibleFilter !== 'todos' && r.reporta !== responsibleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const itemsText = (r.items || []).map((it) => `${it.sku} ${it.desc}`).join(' ');
        const text = [r.id, r.sku, r.desc, r.reporta, r.trx, r.origen, r.causa, r.sol, itemsText].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    targetReports.forEach((r) => {
      const items = r.items && r.items.length > 0
        ? r.items
        : [{ sku: r.sku, desc: r.desc, cant: r.cant }];

      items.forEach((it) => {
        rows.push([
          r.tipo,
          r.fecha,
          r.reporta,
          it.sku,
          it.desc,
          String(it.cant || 1),
          r.trx || '',
          r.origen || '',
          r.causa || '',
          r.sol || '',
          r.estado || 'Abierto',
          r.ubicacion || ''
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.map(quote).join(','), ...rows.map((row) => row.map(quote).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reportes_stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input for JSON Restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Banner & Backup / Restore Controls */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                Base de Datos Local y Exportación
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Archivo de persistencia local y sincronización.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download JSON Backup */}
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Descargar archivo database.json"
            >
              <FileCode2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Descargar JSON</span>
            </button>

            {/* Restore JSON Backup */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Importar un archivo database.json para restaurar datos"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-500" />
              <span>Cargar JSON</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Exportar registros filtrados a formato Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            {/* Import Reports CSV */}
            {onOpenImportCsv && (
              <button
                type="button"
                onClick={onOpenImportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Cargar reportes de stock masivos desde una plantilla CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Importar CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700/60">
          <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800">
            <span className="text-[11px] font-medium text-neutral-500">Total Registros</span>
            <div className="text-lg font-extrabold text-neutral-900 dark:text-white">{totalCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">Tickets Abiertos</span>
            <div className="text-lg font-extrabold text-rose-700 dark:text-rose-300">{openReportsCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Total Tickets</span>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{reportsCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
            <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300">Movimientos</span>
            <div className="text-lg font-extrabold text-purple-700 dark:text-purple-300">{movementsCount}</div>
          </div>
        </div>
      </div>

      {/* Unified Filters Toolbar */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Row 1: Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID (01-..., 02-...), SKU, descripción, responsable, remito, motivo..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Row 2: Filter Pills & Selects */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <span className="text-xs font-bold text-neutral-500 mr-1 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Tipo:</span>
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'todos'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('reportes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'reportes'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              Tickets ({reportsCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('movimientos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'movimientos'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
              }`}
            >
              Movimientos ({movementsCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('problema')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'problema'
                  ? 'bg-rose-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              Problemas
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('ingreso')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'ingreso'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              Ingresos (+)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('encontrado')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'encontrado'
                  ? 'bg-sky-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              Encontrados (+)
            </button>
          </div>

          {/* Status & Responsible Selects */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Estado Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              <option value="Abierto">Abierto</option>
              <option value="Notificado">Notificado</option>
              <option value="En revisión">En revisión</option>
              <option value="Cerrado">Cerrado</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Confirmado">Confirmado</option>
            </select>

            {/* Responsable Select */}
            {responsiblesList.length > 0 && (
              <select
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                className="px-2.5 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="todos">Todos los responsables</option>
                {responsiblesList.map((resp) => (
                  <option key={resp} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            )}

            {(typeFilter !== 'todos' || statusFilter !== 'todos' || responsibleFilter !== 'todos' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('todos');
                  setStatusFilter('todos');
                  setResponsibleFilter('todos');
                  setSearchQuery('');
                }}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline cursor-pointer"
              >
                Restablecer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unified Database Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-700 dark:text-neutral-300">
            <thead className="bg-neutral-50/90 dark:bg-neutral-900/60 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">Tipo de Registro</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Responsable</th>
                <th className="py-3 px-3">SKU / Detalle</th>
                <th className="py-3 px-2 text-center">Cant</th>
                <th className="py-3 px-3">Descripción / Notas</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-right">Vínculo / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SearchCheck className="w-8 h-8 stroke-1 text-neutral-300 dark:text-neutral-600" />
                      <p className="text-sm font-medium">No se encontraron registros con los filtros actuales.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setTypeFilter('todos');
                          setStatusFilter('todos');
                          setResponsibleFilter('todos');
                          setSearchQuery('');
                        }}
                        className="text-xs text-neutral-900 dark:text-neutral-100 font-bold underline cursor-pointer mt-1"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isMovement = item.kind === 'movimiento';
                  return (
                    <tr
                      key={`${item.kind}-${item.id}`}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-750/50 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-2.5 px-3 font-mono font-bold">
                        {isMovement ? (
                          <button
                            type="button"
                            onClick={() => onGoToMovement(item.id)}
                            className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                            title="Ver en Movimientos"
                          >
                            <span>{item.id}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onGoToReport(item.id)}
                            className="text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer flex items-center gap-1"
                            title="Ver reporte"
                          >
                            <span>{item.id}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </button>
                        )}
                      </td>

                      {/* Tipo de Registro */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isMovement ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Boxes className="w-3 h-3" />
                            <span>Movimiento</span>
                          </span>
                        ) : item.subTipo === 'ingreso' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ArrowDownToLine className="w-3 h-3" />
                            <span>Ingreso (+)</span>
                          </span>
                        ) : item.subTipo === 'encontrado' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            <Search className="w-3 h-3" />
                            <span>Encontrado (+)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Problema</span>
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap font-mono text-[11px]">
                        {fmtDate(item.fecha)}
                      </td>

                      {/* Responsable */}
                      <td className="py-2.5 px-3 font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        {item.responsable || '—'}
                      </td>

                      {/* SKU / Resumen */}
                      <td className="py-2.5 px-3 max-w-[200px] truncate" title={item.skuDisplay}>
                        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {item.skuDisplay}
                        </span>
                      </td>

                      {/* Cantidad */}
                      <td className="py-2.5 px-2 text-center font-bold font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[11px] ${
                            isMovement
                              ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : item.subTipo === 'ingreso' || item.subTipo === 'encontrado'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {item.totalCant}
                        </span>
                      </td>

                      {/* Descripción / Notas */}
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <div className="truncate text-neutral-800 dark:text-neutral-200" title={item.desc}>
                          {item.desc || '—'}
                        </div>
                        {item.trx && (
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
                            Doc: {item.trx}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {!isMovement ? (
                          <StatusButton
                            status={item.estado as ReportStatus}
                            onChange={(newStatus) => onStatusChange(item.id, newStatus)}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Confirmado</span>
                          </span>
                        )}
                      </td>

                      {/* Vínculo / Acciones */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {item.vinculoId ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isMovement) {
                                const firstId = item.vinculoId?.split(',')[0]?.trim();
                                if (firstId) onGoToReport(firstId);
                              } else {
                                onGoToMovement(item.vinculoId!);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:underline cursor-pointer"
                            title={`Ver vinculado: ${item.vinculoId}`}
                          >
                            <span>{item.vinculoId}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : isMovement ? (
                          <button
                            type="button"
                            onClick={() => onRequestDeleteMovement(item.rawMovement!)}
                            className="p-1 rounded-md text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Sin vincular</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Danger actions */}
        <div className="p-3 sm:p-4 bg-neutral-50/70 dark:bg-neutral-900/40 border-t border-neutral-200 dark:border-neutral-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-500">
          <div>
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{totalCount}</strong> registros en la base de datos.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onResetExample}
              className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer font-bold"
              title="Restablecer datos originales"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer inicial</span>
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-bold"
              title="Borrar todos los registros"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar base de datos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
