import React from 'react';
import { StockReport, ReportStatus } from '../types/stock';
import { fmtDate, longDate } from '../utils/storage';
import { StatusButton } from './StatusButton';
import { AlertCircle, ArrowDownToLine, Search, ArrowUpRight } from 'lucide-react';

interface ReportCardProps {
  report: StockReport;
  onStatusChange?: (id: string, newStatus: ReportStatus) => void;
  onGoToMovement?: (movementId: string) => void;
  onResolveSingle?: (id: string) => void;
  isPreview?: boolean;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onStatusChange,
  onGoToMovement,
  onResolveSingle,
  isPreview = false
}) => {
  const isProblema = report.tipo === 'problema';
  const isIngreso = report.tipo === 'ingreso';
  const isEncontrado = report.tipo === 'encontrado';

  const typeConfig = {
    problema: {
      label: 'Problema / Faltante',
      sign: '-',
      color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      pillClass: 'border-rose-400 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200',
      icon: AlertCircle
    },
    ingreso: {
      label: 'Ingreso de stock',
      sign: '+',
      color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      pillClass: 'border-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200',
      icon: ArrowDownToLine
    },
    encontrado: {
      label: 'Producto encontrado',
      sign: '+',
      color: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
      pillClass: 'border-teal-400 bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200',
      icon: Search
    }
  }[report.tipo || 'problema'];

  const Icon = typeConfig.icon;

  return (
    <article className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all hover:border-neutral-300 dark:hover:border-neutral-600">
      <div>
        {/* Header: ID, Reporter, Date */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-700/50 pb-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Id reporte
            </div>
            <div className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">
              {report.id}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Reporta: <span className="font-bold">{report.reporta || '—'}</span>
            </div>
            <div className="text-xs text-neutral-400 dark:text-neutral-400 mt-0.5">
              {report.fecha ? fmtDate(report.fecha) : longDate()}
            </div>
          </div>
        </div>

        {/* Simplified Tags */}
        {/* En ingreso/encontrado: sólo tipo y origen */}
        {/* En problemas: no poner problema/faltante, sólo origen y causa */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {isProblema ? (
            <>
              {report.origen && (
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
                  {report.origen}
                </span>
              )}
              {report.causa && (
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                  {report.causa}
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${typeConfig.color}`}
              >
                <Icon className="w-3 h-3" />
                <span>{typeConfig.label}</span>
              </span>

              {report.origen && (
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
                  {report.origen}
                </span>
              )}
            </>
          )}
        </div>

        {/* Transaction / Reference */}
        <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
          <span className="text-neutral-400 dark:text-neutral-500">Transacción / Ref:</span>{' '}
          <span className="font-semibold text-neutral-700 dark:text-neutral-200">
            {report.trx || '—'}
          </span>
        </div>

        {/* Products / SKUs List or Single SKU */}
        {report.items && report.items.length > 1 ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-100 dark:border-neutral-700/60">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-mono text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                  {report.items.length} SKUs
                </span>
                <span>Detalle de productos</span>
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs border ${typeConfig.pillClass}`}
              >
                <span>Total:</span>
                <span className="ml-1">{typeConfig.sign}{report.cant}</span>
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {report.items.map((it, idx) => (
                <div
                  key={`${it.sku}-${idx}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-extrabold text-neutral-900 dark:text-white truncate">
                      {it.sku || 'SKU'}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {it.desc}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs">
                      {typeConfig.sign}{it.cant} u.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Single SKU Card: SKU prominent on top, product name grouped below it, and quantity on right */
          <div className="mt-3 flex items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-extrabold font-mono text-neutral-900 dark:text-white tracking-tight">
                {report.sku || report.items?.[0]?.sku || 'SKU'}
              </div>
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mt-0.5 leading-snug line-clamp-2">
                {report.desc || report.items?.[0]?.desc || 'Descripción de producto'}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`inline-flex items-center justify-center px-3 py-1 rounded-lg font-bold text-sm sm:text-base border font-mono ${typeConfig.pillClass}`}
              >
                <span className="mr-0.5">{typeConfig.sign}</span>
                <span>{report.cant}</span>
              </span>
            </div>
          </div>
        )}

        {/* Observaciones (sin ubicación) */}
        {report.sol && (
          <div className="mt-3 text-xs border-l-2 border-neutral-300 dark:border-neutral-600 pl-2.5 py-0.5 text-neutral-600 dark:text-neutral-300">
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">
              Observaciones:
            </span>{' '}
            {report.sol}
          </div>
        )}
      </div>

      {/* Footer: Interactive Status Button & Movement Link (sin texto "Pendiente") */}
      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 mb-1">
            Estado
          </div>
          <StatusButton
            status={report.estado}
            onChange={
              onStatusChange && !isPreview
                ? (newStatus) => onStatusChange(report.id, newStatus)
                : undefined
            }
          />
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 mb-1">
            Id del movimiento
          </div>
          {report.mov ? (
            <button
              type="button"
              onClick={() => onGoToMovement && onGoToMovement(report.mov!)}
              className="inline-flex items-center gap-1 font-mono font-bold text-xs text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              title="Ver detalle del movimiento"
            >
              <span>{report.mov}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          ) : onResolveSingle && !isPreview ? (
            <button
              type="button"
              onClick={() => onResolveSingle(report.id)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              Resolver
            </button>
          ) : (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>
          )}
        </div>
      </div>
    </article>
  );
};
