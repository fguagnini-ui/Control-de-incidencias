import React, { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, ArrowUpRight, Trash2, CheckCircle, Package, User } from 'lucide-react';
import { StockReport, StockMovement, ReportType } from '../types/stock';
import { fmtDate } from '../utils/storage';

interface ResolveViewProps {
  reportes: StockReport[];
  movimientos: StockMovement[];
  onOpenResolve: (ids: string[]) => void;
  onGoToReport: (reportId: string) => void;
  onRequestDeleteMovement: (movement: StockMovement) => void;
}

export const ResolveView: React.FC<ResolveViewProps> = ({
  reportes,
  movimientos,
  onOpenResolve,
  onGoToReport,
  onRequestDeleteMovement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pending reports are those without a movement and not closed/cancelled
  const pendingReports = useMemo(() => {
    return reportes.filter((r) => !r.mov && r.estado !== 'Cerrado' && r.estado !== 'Cancelado');
  }, [reportes]);

  // Filtered pending
  const filteredPending = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return pendingReports.filter((r) => {
      if (typeFilter !== 'Todos' && r.tipo !== typeFilter) return false;
      if (!q) return true;
      const itemsText = (r.items || []).map((it) => `${it.sku} ${it.desc}`).join(' ');
      return [r.id, r.sku, r.desc, r.trx, r.reporta, r.origen, r.causa, itemsText]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [pendingReports, searchQuery, typeFilter]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredPending.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPending.map((r) => r.id)));
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Pending Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Pendientes de movimiento</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {pendingReports.length}
              </span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Seleccioná uno o más reportes para generar un movimiento de stock consolidado.
            </p>
          </div>

          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={() => onOpenResolve(Array.from(selectedIds))}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              Resolver seleccionados {selectedIds.size > 0 && `(${selectedIds.size})`}
            </span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white dark:bg-neutral-800 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar pendientes por SKU, transacción, ID, responsable…"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              disabled={filteredPending.length === 0}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-semibold cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {selectedIds.size === filteredPending.length && filteredPending.length > 0
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </button>

            {/* Type selector */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-lg overflow-x-auto no-scrollbar">
              {['Todos', 'problema', 'ingreso', 'encontrado'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {t === 'Todos'
                    ? 'Todos'
                    : t === 'problema'
                    ? 'Problemas (-)'
                    : t === 'ingreso'
                    ? 'Ingresos (+)'
                    : 'Encontrados (+)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pending List Table / Items */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700/60 overflow-hidden shadow-xs">
          {filteredPending.length > 0 ? (
            filteredPending.map((p) => {
              const isSelected = selectedIds.has(p.id);
              const isProblema = p.tipo === 'problema';
              const hasMultiSku = p.items && p.items.length > 1;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                    isSelected
                      ? 'bg-sky-50/60 dark:bg-sky-950/25'
                      : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-750/30'
                  }`}
                >
                  {/* Left: Checkbox + Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Selection Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(p.id)}
                      className="cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0 mt-0.5"
                      aria-label={`Seleccionar ${p.id}`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-neutral-900 dark:text-white" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    {/* Main Info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* 1. Categoría arriba seguida del número de movimiento */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide inline-flex items-center gap-1 ${
                            isProblema
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              : p.tipo === 'ingreso'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                              : 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900'
                          }`}
                        >
                          {isProblema ? 'Merma / Problema (-)' : p.tipo === 'ingreso' ? 'Ingreso (+)' : 'Encontrado (+)'}
                        </span>

                        <span className="font-mono font-extrabold text-sm text-neutral-900 dark:text-white">
                          {p.id}
                        </span>

                        {p.trx && (
                          <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
                            · {p.trx}
                          </span>
                        )}

                        {p.fecha && (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            · {fmtDate(p.fecha)}
                          </span>
                        )}
                      </div>

                      {/* 2. SKUs: primero cuántos SKUs (si son más de uno) y después el detalle */}
                      <div className="flex items-center gap-2 flex-wrap text-[16px]">
                        {hasMultiSku ? (
                          <>
                            <span className="font-mono font-extrabold text-[16px] px-2.5 py-0.5 rounded text-white shadow-xs bg-[#5e5e5e]">
                              {p.items.length} SKUs
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p.items.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700/70 text-[16px] font-mono text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-600/50"
                                >
                                  <span className="font-bold">{it.sku}</span>
                                  <span className="text-neutral-500 dark:text-neutral-400 font-sans text-xs">
                                    ({it.cant}u)
                                  </span>
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-[16px] text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-750 px-2.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                              {p.sku || (p.items && p.items[0]?.sku) || 'S/N'}
                            </span>
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 font-sans">
                              ({p.cant} {p.cant === 1 ? 'unidad' : 'unidades'})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 3. Por último: quién reportó y el detalle de qué es */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-600 dark:text-neutral-400 pt-0.5">
                        <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                          <span className="text-neutral-400 dark:text-neutral-500 font-normal">Reportó:</span>
                          <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{p.reporta}</strong>
                        </span>

                        <span className="text-neutral-300 dark:text-neutral-600">·</span>

                        <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                          {p.desc}
                        </span>

                        {p.causa && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                            <span className="text-neutral-500 dark:text-neutral-400 italic">
                              {p.causa}
                            </span>
                          </>
                        )}

                        {p.origen && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                            {p.origen}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right (or bottom on mobile): Quantity & Direct Resolve Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-700/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-neutral-400 sm:hidden">
                        Total unidades:
                      </span>
                      <span
                        className={`inline-block font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded-lg border ${
                          isProblema
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {isProblema ? '-' : '+'}
                        {p.cant} u.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenResolve([p.id])}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 p-6 text-neutral-400 dark:text-neutral-500 text-xs">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <div>No hay reportes pendientes de movimiento con los filtros actuales.</div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Confirmed Movements Section */}
      <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Movimientos confirmados</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
              {movimientos.length}
            </span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Historial de movimientos ejecutados con sus líneas de stock asociadas.
          </p>
        </div>

        {movimientos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...movimientos].reverse().map((m) => (
              <div
                key={m.id}
                className="bg-white dark:bg-neutral-800 p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-700/60 pb-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase text-neutral-400">
                        Id movimiento
                      </div>
                      <div className="text-base font-extrabold font-mono text-neutral-900 dark:text-white">
                        {m.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Resp: {m.resp}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">{fmtDate(m.fecha)}</div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Confirmado</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => onRequestDeleteMovement(m)}
                      className="p-1 rounded text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                      title="Borrar o anular este movimiento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {m.notas && (
                    <div className="mt-2 text-xs text-neutral-500 italic">
                      Nota: {m.notas}
                    </div>
                  )}

                  {/* Lines */}
                  <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-700/40 border-t border-neutral-100 dark:border-neutral-700/40">
                    {m.lineas.map((line, idx) => {
                      const isUp = line.accion.includes('Subir') || line.accion.includes('Ingreso') || line.accion.includes('Encontrado');
                      return (
                        <div
                          key={`${m.id}-${line.pid}-${line.sku}-${idx}`}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-neutral-900 dark:text-white">
                              {line.sku}
                            </div>
                            <div className="text-neutral-500 truncate">{line.desc}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onGoToReport(line.pid)}
                              className="text-sky-600 dark:text-sky-400 hover:underline font-mono font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                              title="Ver ticket de este reporte"
                            >
                              <span>{line.pid}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>

                            <span
                              className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border ${
                                isUp
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {line.accion} | {line.cant}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-neutral-800 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 text-xs text-neutral-400">
            Todavía no se confirmó ningún movimiento.
          </div>
        )}
      </div>
    </div>
  );
};
