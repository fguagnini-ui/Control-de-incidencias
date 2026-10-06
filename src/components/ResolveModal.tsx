import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { StockReport, StockMovement, MovementLine, MovementAction } from '../types/stock';
import { mid, todayDate, longDate } from '../utils/storage';

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportIds: string[];
  allReports: StockReport[];
  nextMovementNumber: number;
  reporterNames: string[];
  onConfirm: (movement: StockMovement) => void;
}

interface LineState {
  lineId: string;
  pid: string;
  sku: string;
  desc: string;
  tipo: StockReport['tipo'];
  accion: MovementAction;
  cant: number;
  maxCant: number;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  isOpen,
  onClose,
  reportIds,
  allReports,
  nextMovementNumber,
  reporterNames,
  onConfirm
}) => {
  const [lines, setLines] = useState<LineState[]>([]);
  const [resp, setResp] = useState('');
  const [notas, setNotas] = useState('');

  const reportsToResolve = allReports.filter((r) => reportIds.includes(r.id));

  useEffect(() => {
    if (isOpen) {
      const initialLines: LineState[] = [];
      reportsToResolve.forEach((r) => {
        let defaultAction: MovementAction = 'Bajar';
        if (r.tipo === 'ingreso') defaultAction = 'Subir';
        if (r.tipo === 'encontrado') defaultAction = 'Subir';

        const items = r.items && r.items.length > 0 ? r.items : [
          { sku: r.sku, desc: r.desc, cant: r.cant }
        ];

        items.forEach((it, idx) => {
          initialLines.push({
            lineId: `${r.id}-${it.sku}-${idx}`,
            pid: r.id,
            sku: it.sku,
            desc: it.desc,
            tipo: r.tipo,
            accion: defaultAction,
            cant: it.cant,
            maxCant: it.cant
          });
        });
      });
      setLines(initialLines);
      setResp('');
      setNotas('');
    }
  }, [isOpen, reportIds]);

  if (!isOpen || reportsToResolve.length === 0) return null;

  const movementId = mid(nextMovementNumber);

  const handleActionChange = (lineId: string, newAction: MovementAction) => {
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, accion: newAction } : l))
    );
  };

  const handleQtyChange = (lineId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, cant: Math.max(1, qty) } : l))
    );
  };

  const isValid =
    lines.length > 0 &&
    lines.every((l) => l.accion && l.cant > 0) &&
    resp.trim().length > 0;

  const handleConfirm = () => {
    if (!isValid) return;

    const movementLines: MovementLine[] = lines.map((l) => {
      const original = reportsToResolve.find((r) => r.id === l.pid);
      return {
        pid: l.pid,
        sku: l.sku,
        desc: l.desc,
        tipo: l.tipo,
        accion: l.accion,
        cant: l.cant,
        prev: original ? original.estado : 'Abierto'
      };
    });

    const newMovement: StockMovement = {
      id: movementId,
      fecha: todayDate(),
      resp: resp.trim(),
      estado: 'Confirmado',
      lineas: movementLines,
      notas: notas.trim() || undefined
    };

    onConfirm(newMovement);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-800 rounded-3xl max-w-2xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-700 max-h-[94vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-50/70 dark:bg-neutral-800/80">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100 truncate">
                Confirmar movimiento de stock
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
                {movementId}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
              {longDate()} • {reportsToResolve.length} {reportsToResolve.length === 1 ? 'reporte' : 'reportes'} ({lines.length} {lines.length === 1 ? 'línea' : 'líneas de SKU'})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Definí la acción de stock y la cantidad final para cada SKU a mover:
          </div>

          <div className="space-y-3">
            {lines.map((l) => (
              <div
                key={l.lineId}
                className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                      {l.sku}
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                      {l.pid}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        l.tipo === 'problema'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : l.tipo === 'ingreso'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      }`}
                    >
                      {l.tipo === 'problema' ? 'Merma (-)' : l.tipo === 'ingreso' ? 'Ingreso (+)' : 'Hallazgo (+)'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {l.desc} • Declarado: {l.maxCant} u.
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-200/60 dark:border-neutral-700/40">
                  <select
                    value={l.accion}
                    onChange={(e) => handleActionChange(l.lineId, e.target.value as MovementAction)}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {l.tipo === 'problema' ? (
                      <>
                        <option value="Bajar">Bajar de stock (-)</option>
                        <option value="Devuelto">Devuelto a proveedor</option>
                        <option value="Descarte">Dar de baja / Descarte</option>
                        <option value="Subir">Ajuste positivo (+)</option>
                      </>
                    ) : (
                      <>
                        <option value="Subir">Subir a stock (+)</option>
                        <option value="Ingreso confirmado">Ingreso confirmado (+)</option>
                        <option value="Encontrado">Alta por hallazgo (+)</option>
                        <option value="Bajar">Ajuste negativo (-)</option>
                      </>
                    )}
                  </select>

                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={l.cant}
                      onChange={(e) => handleQtyChange(l.lineId, parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1.5 text-xs font-mono font-bold text-center rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Responsible input */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Responsable que realizó el movimiento en físico / sistema <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="resp-names"
              value={resp}
              onChange={(e) => setResp(e.target.value)}
              placeholder="Ej: Matías, Franco, etc."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              autoFocus
            />
            <datalist id="resp-names">
              {reporterNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Observaciones del movimiento (opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Ajustado en depósito central estantería B4"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isValid}
            onClick={handleConfirm}
            className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar movimiento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
