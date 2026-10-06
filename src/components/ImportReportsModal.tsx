import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { StockReport, ReportItem, ReportType, ReportStatus } from '../types/stock';
import { pid, todayDate } from '../utils/storage';

interface ImportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextReportNumber: number;
  currentUser?: string;
  onConfirmImport: (newReports: StockReport[]) => void;
}

interface ParsedReportRow {
  index: number;
  tipo: ReportType;
  fecha: string;
  reporta: string;
  sku: string;
  desc: string;
  cant: number;
  trx: string;
  origen: string;
  causa: string;
  sol: string;
  estado: ReportStatus;
  ubicacion: string;
  isValid: boolean;
  errors: string[];
}

export const ImportReportsModal: React.FC<ImportReportsModalProps> = ({
  isOpen,
  onClose,
  nextReportNumber,
  currentUser = 'Franco',
  onConfirmImport
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [groupMultiSku, setGroupMultiSku] = useState<'individual' | 'group_by_doc'>('group_by_doc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setCsvText('');
    setFileName('');
    onClose();
  };

  // Download official sample template CSV
  const handleDownloadTemplate = () => {
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

    const today = todayDate();
    const exampleRows = [
      [
        'problema',
        today,
        currentUser || 'Franco',
        'CW1160',
        'Multiplicador de fuerza 1:64',
        '1',
        '#200006548136',
        'Devoluciones',
        'Devolución',
        'Caja golpeada durante el transporte',
        'Notificado',
        'Sector Devoluciones'
      ],
      [
        'ingreso',
        today,
        'Matías',
        'CW1108',
        'Juego de llaves tubo 94 pzs',
        '10',
        'REM-2024-0089',
        'Proveedor',
        'Ingreso',
        'Recepción completa con control de calidad',
        'Abierto',
        'Bahía 4 - Estantería 12'
      ],
      [
        'ingreso',
        today,
        'Matías',
        'CW1109',
        'Juego de llaves combinadas 12 pzs',
        '5',
        'REM-2024-0089',
        'Proveedor',
        'Ingreso',
        'Recepción completa con control de calidad',
        'Abierto',
        'Bahía 4 - Estantería 12'
      ],
      [
        'encontrado',
        today,
        currentUser || 'Franco',
        'CW1050',
        'Torquímetro de zafre 1/2 pulgada',
        '2',
        '#AUD-2024-B',
        'Depósito',
        'Transferencia',
        'Hallado en estantería sin registrar en conteo',
        'Abierto',
        'Pasillo C - Estante 2'
      ]
    ];

    const quote = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
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
    link.setAttribute('download', 'plantilla_reportes_stock.csv');
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

  // Normalizer for Tipo
  const normalizeTipo = (val: string): ReportType => {
    const raw = (val || '').toLowerCase().trim();
    if (raw.includes('ingreso') || raw.includes('recep') || raw.includes('proveedor') || raw.includes('+')) {
      return 'ingreso';
    }
    if (raw.includes('encontra') || raw.includes('hallad') || raw.includes('sobrante') || raw.includes('sobra')) {
      return 'encontrado';
    }
    return 'problema';
  };

  // Normalizer for Estado
  const normalizeEstado = (val: string): ReportStatus => {
    const raw = (val || '').toLowerCase().trim();
    if (raw.includes('notific')) return 'Notificado';
    if (raw.includes('revis') || raw.includes('pend') || raw.includes('proceso')) return 'En revisión';
    if (raw.includes('cerr') || raw.includes('resuelt') || raw.includes('confirm')) return 'Cerrado';
    if (raw.includes('cancel') || raw.includes('desestim')) return 'Cancelado';
    return 'Abierto';
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

    const headers = splitCSVLine(firstLine).map((h) =>
      h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
    );

    const hasHeader =
      headers.some((h) => h.includes('sku') || h.includes('codigo') || h.includes('art')) ||
      headers.some((h) => h.includes('tipo')) ||
      headers.some((h) => h.includes('desc') || h.includes('producto'));

    const startIdx = hasHeader ? 1 : 0;

    let colTipo = 0;
    let colFecha = 1;
    let colResp = 2;
    let colSku = 3;
    let colDesc = 4;
    let colCant = 5;
    let colTrx = 6;
    let colOrigen = 7;
    let colCausa = 8;
    let colSol = 9;
    let colEstado = 10;
    let colUbicacion = 11;

    if (hasHeader) {
      headers.forEach((h, idx) => {
        if (h.includes('tipo')) colTipo = idx;
        else if (h.includes('fecha') || h.includes('date')) colFecha = idx;
        else if (h.includes('resp') || h.includes('usuario') || h.includes('reporta')) colResp = idx;
        else if (h.includes('sku') || h.includes('codigo') || h.includes('art')) colSku = idx;
        else if (h.includes('desc') || h.includes('producto') || h.includes('nombre')) colDesc = idx;
        else if (h.includes('cant') || h.includes('qty') || h.includes('unid')) colCant = idx;
        else if (h.includes('comprob') || h.includes('remito') || h.includes('trx') || h.includes('factura') || h.includes('doc')) colTrx = idx;
        else if (h.includes('origen') || h.includes('proced')) colOrigen = idx;
        else if (h.includes('causa') || h.includes('motivo')) colCausa = idx;
        else if (h.includes('obs') || h.includes('sol') || h.includes('nota') || h.includes('coment')) colSol = idx;
        else if (h.includes('estado') || h.includes('status')) colEstado = idx;
        else if (h.includes('ubic') || h.includes('estant') || h.includes('pasillo')) colUbicacion = idx;
      });
    }

    const rows: ParsedReportRow[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = splitCSVLine(lines[i]);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      const errors: string[] = [];
      const rawTipo = normalizeTipo(parts[colTipo] || '');
      const rawFecha = (parts[colFecha] || '').trim() || todayDate();
      const rawResp = (parts[colResp] || '').trim() || currentUser || 'Franco';
      const rawSku = (parts[colSku] || '').trim().toUpperCase();
      const rawDesc = (parts[colDesc] || '').trim();
      const rawCant = parts[colCant] ? parseInt(parts[colCant].replace(/[^0-9-]/g, ''), 10) : 1;
      const rawTrx = (parts[colTrx] || '').trim();
      const rawOrigen = (parts[colOrigen] || '').trim() || (rawTipo === 'ingreso' ? 'Proveedor' : rawTipo === 'encontrado' ? 'Depósito' : 'Devoluciones');
      const rawCausa = (parts[colCausa] || '').trim() || (rawTipo === 'ingreso' ? 'Ingreso' : rawTipo === 'encontrado' ? 'Transferencia' : 'Devolución');
      const rawSol = (parts[colSol] || '').trim();
      const rawEstado = normalizeEstado(parts[colEstado] || 'Abierto');
      const rawUbicacion = (parts[colUbicacion] || '').trim();

      if (!rawSku) {
        errors.push('SKU obligatorio');
      }
      if (!rawDesc) {
        errors.push('Descripción requerida');
      }
      if (isNaN(rawCant) || rawCant <= 0) {
        errors.push('Cantidad inválida');
      }

      rows.push({
        index: i + 1,
        tipo: rawTipo,
        fecha: rawFecha,
        reporta: rawResp,
        sku: rawSku || 'SIN-SKU',
        desc: rawDesc || 'Sin descripción',
        cant: isNaN(rawCant) || rawCant <= 0 ? 1 : rawCant,
        trx: rawTrx || (rawTipo === 'ingreso' ? 'Sin remito' : 'Sin transacción'),
        origen: rawOrigen,
        causa: rawCausa,
        sol: rawSol,
        estado: rawEstado,
        ubicacion: rawUbicacion,
        isValid: errors.length === 0,
        errors
      });
    }

    return { rows, errors: [] };
  }, [csvText, currentUser]);

  const validRows = useMemo(() => parsedData.rows.filter((r) => r.isValid), [parsedData.rows]);
  const invalidRowsCount = parsedData.rows.length - validRows.length;

  // Generate Reports assigning IDs automatically (db.np sequential)
  const preparedReports = useMemo(() => {
    if (validRows.length === 0) return [];
    let currentNp = nextReportNumber;
    const reports: StockReport[] = [];

    if (groupMultiSku === 'group_by_doc') {
      // Group rows that share the same Comprobante_Trx + Tipo + Fecha + Reporta
      const groups = new Map<string, ParsedReportRow[]>();

      validRows.forEach((row) => {
        // If no trx provided or generic "Sin remito", create individual
        const hasSpecificDoc = row.trx && row.trx !== 'Sin remito' && row.trx !== 'Sin transacción';
        const key = hasSpecificDoc
          ? `${row.tipo}__${row.fecha}__${row.reporta}__${row.trx}`
          : `single__${row.index}`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });

      groups.forEach((groupRows) => {
        const id = pid(currentNp++);
        const first = groupRows[0];
        const items: ReportItem[] = groupRows.map((r) => ({
          sku: r.sku,
          desc: r.desc,
          cant: r.cant
        }));
        const totalCant = items.reduce((sum, it) => sum + it.cant, 0);
        const firstSku = items[0].sku;
        const summaryDesc = items.length === 1
          ? items[0].desc
          : `${items[0].desc} (+${items.length - 1} ${items.length - 1 === 1 ? 'producto más' : 'productos más'})`;

        reports.push({
          id,
          tipo: first.tipo,
          fecha: first.fecha,
          reporta: first.reporta,
          items,
          sku: firstSku,
          desc: summaryDesc,
          cant: totalCant,
          trx: first.trx,
          origen: first.origen,
          causa: first.causa,
          sol: first.sol,
          estado: first.estado,
          ubicacion: first.ubicacion,
          mov: null
        });
      });
    } else {
      // Individual reports: 1 per line
      validRows.forEach((r) => {
        const id = pid(currentNp++);
        reports.push({
          id,
          tipo: r.tipo,
          fecha: r.fecha,
          reporta: r.reporta,
          items: [{ sku: r.sku, desc: r.desc, cant: r.cant }],
          sku: r.sku,
          desc: r.desc,
          cant: r.cant,
          trx: r.trx,
          origen: r.origen,
          causa: r.causa,
          sol: r.sol,
          estado: r.estado,
          ubicacion: r.ubicacion,
          mov: null
        });
      });
    }

    return reports;
  }, [validRows, groupMultiSku, nextReportNumber]);

  // Submit Handler
  const handleConfirm = () => {
    if (preparedReports.length === 0) return;
    onConfirmImport(preparedReports);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700/80 flex items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-850/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900 dark:text-white leading-tight">
                Importar Reportes desde CSV
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Carga masiva de tickets con todos los detalles (SKUs, descripciones, notas, remitos, estados). El ID se asigna automáticamente.
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-700/80">
            <div className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>¿No tienes el archivo? Descarga la plantilla oficial con todos los campos y ejemplos listos.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold transition-colors cursor-pointer shrink-0"
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
                className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline cursor-pointer font-bold"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Explorar archivo en tu PC...</span>
              </button>
            </div>

            {fileName && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 rounded-xl text-xs text-sky-800 dark:text-sky-300">
                <span className="font-mono font-medium truncate">Archivo: {fileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFileName('');
                    setCsvText('');
                  }}
                  className="text-sky-600 hover:text-sky-900 dark:hover:text-white ml-2 cursor-pointer font-bold"
                >
                  Quitar
                </button>
              </div>
            )}

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Tipo,Fecha,Responsable,SKU,Descripcion,Cantidad,Comprobante_Trx,Origen,Causa_Motivo,Observaciones,Estado,Ubicacion\nproblema,2026-10-05,Franco,CW1160,Multiplicador de fuerza 1:64,1,#200006548136,Devoluciones,Devolución,Roto en embalaje,Notificado,Sector Devoluciones\ningreso,2026-10-05,Matías,CW1108,Juego de llaves tubo 94 pzs,10,REM-2024-0089,Proveedor,Ingreso,Recepción completa,Abierto,Estantería A1"}
              className="w-full p-3 font-mono text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
          </div>

          {/* Grouping Mode Selection */}
          {validRows.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                Modo de agrupación para comprobantes con múltiples SKUs:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGroupMultiSku('group_by_doc')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    groupMultiSku === 'group_by_doc'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
                  }`}
                >
                  Agrupar mismo Remito/Doc (Multi-SKU)
                </button>
                <button
                  type="button"
                  onClick={() => setGroupMultiSku('individual')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    groupMultiSku === 'individual'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
                  }`}
                >
                  1 Ticket por cada línea individual
                </button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {parsedData.rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-200 flex-wrap">
                  <span>Vista previa:</span>
                  <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {validRows.length} líneas válidas
                  </span>
                  {invalidRowsCount > 0 && (
                    <span className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      {invalidRowsCount} con errores
                    </span>
                  )}
                  <span className="text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    {preparedReports.length} reportes a crear (IDs: {pid(nextReportNumber)} → {pid(nextReportNumber + preparedReports.length - 1)})
                  </span>
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden max-h-60 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs text-neutral-700 dark:text-neutral-300">
                  <thead className="bg-neutral-100 dark:bg-neutral-900 sticky top-0 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Responsable</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-2 text-center">Cant</th>
                      <th className="py-2 px-3">Doc/Remito</th>
                      <th className="py-2 px-3">Origen/Causa</th>
                      <th className="py-2 px-3">Estado</th>
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
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.tipo === 'ingreso'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : row.tipo === 'encontrado'
                                ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {row.tipo}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 whitespace-nowrap">{row.fecha}</td>
                        <td className="py-1.5 px-3 font-sans font-medium whitespace-nowrap">{row.reporta}</td>
                        <td className="py-1.5 px-3 font-bold text-neutral-900 dark:text-white">{row.sku}</td>
                        <td className="py-1.5 px-3 font-sans max-w-[180px] truncate" title={row.desc}>
                          {row.desc}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold">{row.cant}</td>
                        <td className="py-1.5 px-3 whitespace-nowrap">{row.trx || '—'}</td>
                        <td className="py-1.5 px-3 font-sans text-neutral-500 whitespace-nowrap truncate max-w-[140px]">
                          {row.origen} / {row.causa}
                        </td>
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <span className="font-sans font-semibold text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {row.estado}
                          </span>
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
            <FileText className="w-4 h-4" />
            <span>
              Confirmar e Importar {preparedReports.length > 0 && `(${preparedReports.length} reportes)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
