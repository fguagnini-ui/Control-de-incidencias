import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  FileText,
  Boxes,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { StockMovement, MovementLine, MovementAction, StockReport, ReportStatus } from '../types/stock';
import { mid, todayDate } from '../utils/storage';

interface ImportMovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextMovementNumber: number;
  currentUser?: string;
  allReports: StockReport[];
  onConfirmImport: (newMovements: StockMovement[], resolvedReportIds: string[]) => void;
}

interface ParsedMovementRow {
  index: number;
  fecha: string;
  resp: string;
  sku: string;
  desc: string;
  accion: MovementAction;
  cant: number;
  notas: string;
  ticketId: string;
  isValid: boolean;
  errors: string[];
}

export const ImportMovementsModal: React.FC<ImportMovementsModalProps> = ({
  isOpen,
  onClose,
  nextMovementNumber,
  currentUser = 'Franco',
  allReports,
  onConfirmImport
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [groupBy, setGroupBy] = useState<'single' | 'by_user_date'>('by_user_date');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when closed
  const handleClose = () => {
    setCsvText('');
    setFileName('');
    onClose();
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headers = [
      'Fecha',
      'Responsable',
      'SKU',
      'Descripcion',
      'Accion',
      'Cantidad',
      'Notas',
      'Ticket_ID'
    ];

    const today = todayDate();
    const exampleRows = [
      [
        today,
        currentUser || 'Franco',
        'CW1160',
        'Multiplicador de fuerza 1:64',
        '- Salida',
        '1',
        'Despacho garantía / Devolución',
        '01-00001'
      ],
      [
        today,
        'Matías',
        'CW1108',
        'Juego de llaves tubo 94 pzs',
        '+ Entrada',
        '10',
        'Ingreso remito proveedor REM-2024-0089',
        ''
      ],
      [
        today,
        'Matías',
        'CW1109',
        'Juego de llaves combinadas 12 pzs',
        '+ Entrada',
        '5',
        'Ingreso remito proveedor REM-2024-0089',
        ''
      ],
      [
        today,
        currentUser || 'Franco',
        'CW1050',
        'Torquímetro de zafre 1/2 pulgada',
        'Ajuste',
        '2',
        'Hallado en auditoría física',
        '01-00003'
      ]
    ];

    const quote = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvContent =
      '\uFEFF' +
      [
        headers.map(quote).join(','),
        ...exampleRows.map((r) => r.map(quote).join(','))
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_movimientos_stock.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper to normalize actions
  const normalizeAction = (val: string): MovementAction => {
    const raw = (val || '').toLowerCase().trim();
    if (raw.includes('+') || raw.includes('entra') || raw.includes('ingreso') || raw.includes('subir') || raw.includes('alta')) {
      return 'Ingreso confirmado';
    }
    if (raw.includes('-') || raw.includes('bajar') || raw.includes('baja') || raw.includes('egreso') || raw.includes('sale') || raw.includes('salida')) {
      return 'Bajar';
    }
    if (raw.includes('descarte') || raw.includes('roto') || raw.includes('merma')) {
      return 'Descarte';
    }
    if (raw.includes('devuel') || raw.includes('reingreso')) {
      return 'Devuelto';
    }
    return 'Encontrado';
  };

  // Parse CSV text into rows
  const parsedData = useMemo(() => {
    if (!csvText.trim()) return { rows: [], errors: [] };

    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return { rows: [], errors: [] };

    // Detect delimiter (, or ;)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    // CSV Splitter taking quotes into account
    const splitCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuote && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === delimiter && !insideQuote) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Check if line 0 is a header
    const headers = splitCSVLine(firstLine).map((h) =>
      h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
    );

    const hasHeader =
      headers.some((h) => h.includes('sku') || h.includes('producto') || h.includes('codigo')) ||
      headers.some((h) => h.includes('fecha') || h.includes('date')) ||
      headers.some((h) => h.includes('cant') || h.includes('qty'));

    const startIdx = hasHeader ? 1 : 0;

    // Field index mapping
    let colFecha = 0;
    let colResp = 1;
    let colSku = 2;
    let colDesc = 3;
    let colAccion = 4;
    let colCant = 5;
    let colNotas = 6;
    let colTicket = 7;

    if (hasHeader) {
      headers.forEach((h, idx) => {
        if (h.includes('fecha') || h.includes('date')) colFecha = idx;
        else if (h.includes('resp') || h.includes('usuario') || h.includes('operador')) colResp = idx;
        else if (h.includes('sku') || h.includes('codigo') || h.includes('art')) colSku = idx;
        else if (h.includes('desc') || h.includes('producto') || h.includes('nombre')) colDesc = idx;
        else if (h.includes('acc') || h.includes('tipo') || h.includes('mov')) colAccion = idx;
        else if (h.includes('cant') || h.includes('qty') || h.includes('unid')) colCant = idx;
        else if (h.includes('nota') || h.includes('obs') || h.includes('motivo') || h.includes('coment')) colNotas = idx;
        else if (h.includes('ticket') || h.includes('report') || h.includes('pid') || h.includes('idtick')) colTicket = idx;
      });
    }

    const rows: ParsedMovementRow[] = [];
    const openTicketsSet = new Set(allReports.map((r) => r.id));

    for (let i = startIdx; i < lines.length; i++) {
      const parts = splitCSVLine(lines[i]);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      const errors: string[] = [];

      const rawSku = (parts[colSku] || '').trim();
      const rawCant = parts[colCant] ? parseInt(parts[colCant].replace(/[^0-9-]/g, ''), 10) : 1;
      const rawFecha = (parts[colFecha] || '').trim() || todayDate();
      const rawResp = (parts[colResp] || '').trim() || currentUser || 'Franco';
      const rawDesc = (parts[colDesc] || '').trim() || `Producto SKU ${rawSku}`;
      const rawAccion = normalizeAction(parts[colAccion] || '');
      const rawNotas = (parts[colNotas] || '').trim();
      let rawTicket = (parts[colTicket] || '').trim();

      if (!rawSku) {
        errors.push('SKU requerido');
      }

      if (isNaN(rawCant) || rawCant <= 0) {
        errors.push('Cantidad inválida');
      }

      // Format ticket id if standard number
      if (rawTicket && !rawTicket.startsWith('01-') && /^\d+$/.test(rawTicket)) {
        rawTicket = '01-' + rawTicket.padStart(5, '0');
      }

      rows.push({
        index: i + 1,
        fecha: rawFecha,
        resp: rawResp,
        sku: rawSku || 'SIN-SKU',
        desc: rawDesc,
        accion: rawAccion,
        cant: isNaN(rawCant) || rawCant <= 0 ? 1 : rawCant,
        notas: rawNotas,
        ticketId: rawTicket,
        isValid: errors.length === 0,
        errors
      });
    }

    return { rows, errors: [] };
  }, [csvText, allReports, currentUser]);

  const validRows = useMemo(() => parsedData.rows.filter((r) => r.isValid), [parsedData.rows]);
  const invalidRowsCount = parsedData.rows.length - validRows.length;

  // Convert valid rows into grouped movements
  const preparedMovements = useMemo(() => {
    if (validRows.length === 0) return [];

    let currentNm = nextMovementNumber;
    const movements: StockMovement[] = [];

    if (groupBy === 'single') {
      // 1 single combined movement
      const firstRow = validRows[0];
      const movementId = mid(currentNm);
      const lines: MovementLine[] = validRows.map((r) => ({
        pid: r.ticketId || '',
        sku: r.sku,
        desc: r.desc,
        accion: r.accion,
        cant: r.cant,
        prev: 'Abierto' as ReportStatus
      }));

      movements.push({
        id: movementId,
        fecha: firstRow.fecha || todayDate(),
        resp: firstRow.resp || currentUser,
        lineas: lines,
        notas: firstRow.notas || `Carga masiva CSV (${lines.length} líneas)`,
        estado: 'Confirmado'
      });
    } else {
      // Group by Fecha + Responsable + Notas
      const groups = new Map<string, ParsedMovementRow[]>();

      validRows.forEach((row) => {
        const key = `${row.fecha}__${row.resp}__${row.notas || ''}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });

      groups.forEach((groupRows) => {
        const movementId = mid(currentNm++);
        const first = groupRows[0];
        const lines: MovementLine[] = groupRows.map((r) => ({
          pid: r.ticketId || '',
          sku: r.sku,
          desc: r.desc,
          accion: r.accion,
          cant: r.cant,
          prev: 'Abierto' as ReportStatus
        }));

        movements.push({
          id: movementId,
          fecha: first.fecha || todayDate(),
          resp: first.resp || currentUser,
          lineas: lines,
          notas: first.notas || `Carga CSV (${lines.length} líneas)`,
          estado: 'Confirmado'
        });
      });
    }

    return movements;
  }, [validRows, groupBy, nextMovementNumber, currentUser]);

  // Extract referenced ticket IDs
  const resolvedTicketIds = useMemo(() => {
    const set = new Set<string>();
    validRows.forEach((r) => {
      if (r.ticketId) set.add(r.ticketId);
    });
    return Array.from(set);
  }, [validRows]);

  // Submit Handler
  const handleConfirm = () => {
    if (preparedMovements.length === 0) return;
    onConfirmImport(preparedMovements, resolvedTicketIds);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700/80 flex items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-850/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                Importar Movimientos desde CSV
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Carga múltiples ingresos, salidas o ajustes de stock desde una plantilla o archivo Excel.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Action Row: Download Template & File Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
            <div className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>¿No tienes la plantilla? Descarga el modelo oficial con ejemplos listos para rellenar.</span>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar plantilla CSV</span>
            </button>
          </div>

          {/* Upload Area / Paste CSV */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Seleccionar archivo CSV o pegar contenido:
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Explorar archivo en tu PC...</span>
              </button>
            </div>

            {fileName && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 rounded-lg text-xs text-purple-800 dark:text-purple-300">
                <span className="font-mono font-medium truncate">Archivo: {fileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFileName('');
                    setCsvText('');
                  }}
                  className="text-purple-500 hover:text-purple-800 ml-2"
                >
                  Quitar
                </button>
              </div>
            )}

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Fecha,Responsable,SKU,Descripcion,Accion,Cantidad,Notas,Ticket_ID&#10;2026-10-05,Franco,CW1160,Multiplicador de fuerza 1:64,- Salida,1,Garantía,01-00001"
              className="w-full p-3 font-mono text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
          </div>

          {/* Grouping Mode Selection */}
          {validRows.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60 text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                Organización de movimientos generados:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGroupBy('by_user_date')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    groupBy === 'by_user_date'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
                  }`}
                >
                  Agrupar por Fecha y Responsable
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('single')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    groupBy === 'single'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
                  }`}
                >
                  Un solo movimiento consolidado
                </button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {parsedData.rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-200">
                  <span>Vista previa:</span>
                  <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {validRows.length} líneas válidas
                  </span>
                  {invalidRowsCount > 0 && (
                    <span className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      {invalidRowsCount} con errores
                    </span>
                  )}
                  <span className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                    {preparedMovements.length} movimientos a crear
                  </span>
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs text-neutral-700 dark:text-neutral-300">
                  <thead className="bg-neutral-100 dark:bg-neutral-900 sticky top-0 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Responsable</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-2 text-center">Acción</th>
                      <th className="py-2 px-2 text-center">Cant</th>
                      <th className="py-2 px-3">Ticket Vinculado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 font-mono text-[11px]">
                    {parsedData.rows.map((row) => (
                      <tr
                        key={row.index}
                        className={
                          row.isValid
                            ? 'hover:bg-neutral-50/70 dark:hover:bg-neutral-750/50'
                            : 'bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                        }
                      >
                        <td className="py-1.5 px-3 text-neutral-400">{row.index}</td>
                        <td className="py-1.5 px-3 whitespace-nowrap">{row.fecha}</td>
                        <td className="py-1.5 px-3 font-sans font-medium whitespace-nowrap">{row.resp}</td>
                        <td className="py-1.5 px-3 font-bold text-neutral-900 dark:text-white">{row.sku}</td>
                        <td className="py-1.5 px-3 font-sans max-w-[180px] truncate" title={row.desc}>
                          {row.desc}
                        </td>
                        <td className="py-1.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.accion === 'Ingreso confirmado' || row.accion === 'Subir'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : row.accion === 'Bajar' || row.accion === 'Descarte'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                            }`}
                          >
                            {row.accion}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold">{row.cant}</td>
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          {row.ticketId ? (
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{row.ticketId} (cerrará ticket)</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400">Manual (sin ticket)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-850/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={validRows.length === 0}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
          >
            <Boxes className="w-4 h-4" />
            <span>
              Confirmar e Importar {preparedMovements.length > 0 && `(${preparedMovements.length} movimientos)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
