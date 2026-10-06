import React, { useState } from 'react';
import { StockReport, ReportStatus } from '../types/stock';
import { fmtDate, longDate } from '../utils/storage';
import { StatusButton } from './StatusButton';
import { AlertTriangle, ArrowDownToLine, Search, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  const isProblema = report.tipo === 'problema';
  const isIngreso = report.tipo === 'ingreso';
  const isEncontrado = report.tipo === 'encontrado';

  // Specific subtle background color and borders according to requirement:
  // Problema: rojo sutil (bg-rose-50/70 dark: bg-rose-950/20)
  // Ingreso: verde sutil (bg-emerald-50/70 dark: bg-emerald-950/20)
  // Encontrado: azul/celeste sutil (bg-sky-50/70 dark: bg-sky-950/20)
  const cardConfig = {
    problema: {
      label: 'Problema / Faltante',
      sign: '-',
      cardBg: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/90 dark:border-rose-900/50',
      pillClass: 'border-rose-300 dark:border-rose-800 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200',
      originTag: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800',
      icon: AlertTriangle
    },
    ingreso: {
      label: 'Ingreso de stock',
      sign: '+',
      cardBg: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/90 dark:border-emerald-900/50',
      pillClass: 'border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200',
      originTag: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
      icon: ArrowDownToLine
    },
    encontrado: {
      label: 'Producto encontrado',
      sign: '+',
      cardBg: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200/90 dark:border-sky-900/50',
      pillClass: 'border-sky-300 dark:border-sky-800 bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-200',
      originTag: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800',
      icon: Search
    }
  }[report.tipo || 'problema'];

  const OriginIcon = cardConfig.icon;

  const items = report.items && report.items.length > 0
    ? report.items
    : [{ sku: report.sku, desc: report.desc, cant: report.cant }];

  const isMultiSku = items.length > 1;
  const visibleItems = isMultiSku && items.length > 3 && !isExpanded ? items.slice(0, 3) : items;

  return (
    <article
      className={`${cardConfig.cardBg} border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md`}
    >
      <div>
        {/* Header: ID, Reporter, Date */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Id reporte
            </div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-neutral-900 dark:text-neutral-100">
              {report.id}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Reporta: <span className="font-bold">{report.reporta || '—'}</span>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
              {report.fecha ? fmtDate(report.fecha) : longDate()}
            </div>
          </div>
        </div>

        {/* Estructura de etiquetas (orden en espejo):
            1º: Origen (origen de problema, mercadería o hallazgo).
                En tarjetas de problema: rojo con ícono de alerta (!).
            2º: Motivo / Causa (ej. Ingreso, Devolución, Transferencia, etc.)
        */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {/* 1º Origen */}
          {report.origen && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${cardConfig.originTag}`}
            >
              {isProblema && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />}
              {isIngreso && <ArrowDownToLine className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              {isEncontrado && <Search className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />}
              <span>{report.origen}</span>
            </span>
          )}

          {/* 2º Motivo / Causa */}
          {report.causa && (
            <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white/90 dark:bg-neutral-850/90 text-neutral-700 dark:text-neutral-300 border border-neutral-300/80 dark:border-neutral-700">
              {report.causa}
            </span>
          )}
        </div>

        {/* Transaction / Reference / Document */}
        {report.trx && (
          <div className="mt-2.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            <span className="text-neutral-400 dark:text-neutral-500">Doc / Ref:</span>{' '}
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {report.trx}
            </span>
          </div>
        )}

        {/* Multi-SKU vs Single SKU:
            - En tarjetas de 1 solo producto: el SKU y la descripción deben agruparse (SKU destacado, nombre abajo en texto más pequeño).
            - En tarjetas con múltiples productos: NO mostrar el rótulo "Detalle de productos". Si supera los 3 productos, mostrar enlace para expandir.
        */}
        {isMultiSku ? (
          <div className="mt-3 space-y-2">
            {/* Header with item count and total units (without the label "Detalle de productos") */}
            <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-200/50 dark:border-neutral-700/50">
              <span className="font-bold font-mono text-neutral-700 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                {items.length} SKUs
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs border ${cardConfig.pillClass}`}
              >
                <span>Total:</span>
                <span className="ml-1">
                  {cardConfig.sign}{report.cant} u.
                </span>
              </span>
            </div>

            {/* List of products */}
            <div className="space-y-1.5">
              {visibleItems.map((it, idx) => (
                <div
                  key={`${it.sku}-${idx}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/90 dark:bg-neutral-850/90 border border-neutral-200/70 dark:border-neutral-700/70 text-xs shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-extrabold text-neutral-900 dark:text-white truncate">
                      {it.sku || 'SKU'}
                    </div>
                    <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 truncate">
                      {it.desc}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs border border-neutral-200/70 dark:border-neutral-700">
                      {cardConfig.sign}{it.cant} u.
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Expand / Collapse link if more than 3 products */}
            {items.length > 3 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-1.5 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center gap-1 bg-white/60 dark:bg-neutral-800/60 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <span>Mostrar menos</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Ver todos los {items.length} productos (+{items.length - 3} más)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Single SKU Card: SKU and description grouped together, prominent SKU, description below */
          <div className="mt-3 flex items-center justify-between gap-3 bg-white/90 dark:bg-neutral-850/90 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs">
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-extrabold font-mono text-neutral-900 dark:text-white tracking-tight">
                {items[0]?.sku || report.sku || 'SKU'}
              </div>
              <div className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 mt-0.5 leading-snug line-clamp-2">
                {items[0]?.desc || report.desc || 'Descripción de producto'}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-sm sm:text-base border font-mono ${cardConfig.pillClass}`}
              >
                <span className="mr-0.5">{cardConfig.sign}</span>
                <span>{report.cant}</span>
              </span>
            </div>
          </div>
        )}

        {/* Observations / Notes */}
        {report.sol && (
          <div className="mt-3 text-xs border-l-2 border-neutral-300 dark:border-neutral-600 pl-2.5 py-0.5 text-neutral-600 dark:text-neutral-300">
            <span className="font-bold text-neutral-700 dark:text-neutral-200">
              Observaciones:
            </span>{' '}
            {report.sol}
          </div>
        )}
      </div>

      {/* Footer: Interactive Status Button & Movement link */}
      <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between gap-2 flex-wrap">
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
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              Gestionar
            </button>
          ) : (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>
          )}
        </div>
      </div>
    </article>
  );
};
