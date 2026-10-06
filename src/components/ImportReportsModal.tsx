import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  HelpCircle,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Search,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { StockReport, ReportItem, ReportType, ReportStatus } from '../types/stock';
import { pid, todayDate } from '../utils/storage';

interface ImportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextReportNumber: number;
  currentUser?: string;
  reporterNames?: string[];
  onConfirmImport: (newReports: StockReport[]) => void;
}

export interface EditableReportRow {
  id: string; // unique internal key
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
}

const ORIGEN_SUGGESTIONS = [
  'Devoluciones',
  'Proveedor',
  'Depósito',
  'Depósito central',
  'Venta',
  'Compras',
  'Empaque',
  'Auditoría física',
  'Interno',
  'Góndola',
  'Otro'
];

const CAUSA_SUGGESTIONS = [
  'Ingreso',
  'Devolución',
  'Transferencia',
  'Roto / Dañado',
  'Faltante en pedido',
  'Vencido / Caducado',
  'Hallado en estantería sin registrar',
  'Recepción de compra / Proveedor',
  'Conteo físico',
  'Otro'
];

const ESTADO_OPTIONS: ReportStatus[] = [
  'Abierto',
  'Notificado',
  'En revisión',
  'Cerrado',
  'Cancelado'
];

const TIPO_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'problema', label: 'Problema' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'encontrado', label: 'Encontrado' }
];

export const ImportReportsModal: React.FC<ImportReportsModalProps> = ({
  isOpen,
  onClose,
  nextReportNumber,
  currentUser = 'Franco',
  reporterNames = ['Franco', 'Matías'],
  onConfirmImport
}) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<EditableReportRow[]>([]);
  const [groupMultiSku, setGroupMultiSku] = useState<'individual' | 'group_by_doc'>('group_by_doc');
  const [searchFilter, setSearchFilter] = useState('');
  const [showMassTools, setShowMassTools] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mass action states
  const [massResp, setMassResp] = useState('');
  const [massOrigen, setMassOrigen] = useState('');
  const [massCausa, setMassCausa] = useState('');
  const [massEstado, setMassEstado] = useState<ReportStatus | ''>('');

  const handleClose = () => {
    setCsvText('');
    setFileName('');
    setRows([]);
    setSearchFilter('');
    setShowMassTools(false);
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

  // Parse CSV text into initial editable rows
  const parseCSVToRows = (text: string): EditableReportRow[] => {
    if (!text.trim()) return [];
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return [];

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
        else if (h.includes('comprob') || h.includes('remito') || h.includes('trx') || h.includes('factura') || h.includes('doc') || h.includes('ref')) colTrx = idx;
        else if (h.includes('origen') || h.includes('proced')) colOrigen = idx;
        else if (h.includes('causa') || h.includes('motivo')) colCausa = idx;
        else if (h.includes('obs') || h.includes('sol') || h.includes('nota') || h.includes('coment')) colSol = idx;
        else if (h.includes('estado') || h.includes('status')) colEstado = idx;
        else if (h.includes('ubic') || h.includes('estant') || h.includes('pasillo')) colUbicacion = idx;
      });
    }

    const parsed: EditableReportRow[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = splitCSVLine(lines[i]);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

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

      parsed.push({
        id: `row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        tipo: rawTipo,
        fecha: rawFecha,
        reporta: rawResp,
        sku: rawSku,
        desc: rawDesc,
        cant: isNaN(rawCant) || rawCant <= 0 ? 1 : rawCant,
        trx: rawTrx,
        origen: rawOrigen,
        causa: rawCausa,
        sol: rawSol,
        estado: rawEstado,
        ubicacion: rawUbicacion
      });
    }

    return parsed;
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
        const parsed = parseCSVToRows(content);
        setRows(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle direct text paste or change
  const handleTextareaChange = (newText: string) => {
    setCsvText(newText);
    const parsed = parseCSVToRows(newText);
    setRows(parsed);
  };

  // Row operations
  const updateRowField = <K extends keyof EditableReportRow>(id: string, field: K, value: EditableReportRow[K]) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDuplicateRow = (id: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copy: EditableReportRow = {
        ...original,
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const handleAddNewRow = () => {
    const newRow: EditableReportRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tipo: 'ingreso',
      fecha: todayDate(),
      reporta: currentUser || 'Franco',
      sku: '',
      desc: '',
      cant: 1,
      trx: '',
      origen: 'Proveedor',
      causa: 'Ingreso',
      sol: '',
      estado: 'Abierto',
      ubicacion: ''
    };
    setRows((prev) => [newRow, ...prev]);
  };

  // Mass update tools
  const applyMassResp = () => {
    if (!massResp.trim()) return;
    setRows((prev) => prev.map((r) => ({ ...r, reporta: massResp.trim() })));
    setMassResp('');
  };

  const applyMassOrigen = () => {
    if (!massOrigen.trim()) return;
    setRows((prev) => prev.map((r) => ({ ...r, origen: massOrigen.trim() })));
    setMassOrigen('');
  };

  const applyMassCausa = () => {
    if (!massCausa.trim()) return;
    setRows((prev) => prev.map((r) => ({ ...r, causa: massCausa.trim() })));
    setMassCausa('');
  };

  const applyMassEstado = () => {
    if (!massEstado) return;
    setRows((prev) => prev.map((r) => ({ ...r, estado: massEstado })));
    setMassEstado('');
  };

  // Validation per row
  const getRowErrors = (r: EditableReportRow): string[] => {
    const errs: string[] = [];
    if (!r.sku.trim()) errs.push('SKU requerido');
    if (!r.desc.trim()) errs.push('Descripción requerida');
    if (isNaN(r.cant) || r.cant <= 0) errs.push('Cantidad debe ser mayor a 0');
    return errs;
  };

  // Filtered rows for UI
  const filteredRows = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => {
      const text = [
        r.sku,
        r.desc,
        r.trx,
        r.reporta,
        r.origen,
        r.causa,
        r.sol,
        r.estado,
        r.tipo,
        r.ubicacion
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [rows, searchFilter]);

  const validRows = useMemo(() => rows.filter((r) => getRowErrors(r).length === 0), [rows]);
  const invalidRowsCount = rows.length - validRows.length;

  // Generate Reports assigning IDs automatically (db.np sequential)
  const preparedReports = useMemo(() => {
    if (validRows.length === 0) return [];
    let currentNp = nextReportNumber;
    const reports: StockReport[] = [];

    if (groupMultiSku === 'group_by_doc') {
      // Group rows that share the same Comprobante_Trx + Tipo + Fecha + Reporta
      const groups = new Map<string, EditableReportRow[]>();

      validRows.forEach((row, idx) => {
        const hasSpecificDoc = row.trx && row.trx.trim() !== 'Sin remito' && row.trx.trim() !== 'Sin transacción' && row.trx.trim() !== '';
        const key = hasSpecificDoc
          ? `${row.tipo}__${row.fecha}__${row.reporta}__${row.trx.trim().toLowerCase()}`
          : `single__${row.id || idx}`;

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });

      groups.forEach((groupRows) => {
        const id = pid(currentNp++);
        const first = groupRows[0];
        const items: ReportItem[] = groupRows.map((r) => ({
          sku: r.sku.trim().toUpperCase(),
          desc: r.desc.trim(),
          cant: Number(r.cant) || 1
        }));
        const totalCant = items.reduce((sum, it) => sum + it.cant, 0);
        const firstSku = items[0].sku;
        const summaryDesc =
          items.length === 1
            ? items[0].desc
            : `${items[0].desc} (+${items.length - 1} ${items.length - 1 === 1 ? 'producto más' : 'productos más'})`;

        reports.push({
          id,
          tipo: first.tipo,
          fecha: first.fecha || todayDate(),
          reporta: first.reporta || currentUser || 'Franco',
          items,
          sku: firstSku,
          desc: summaryDesc,
          cant: totalCant,
          trx: first.trx.trim() || (first.tipo === 'ingreso' ? 'Sin remito' : 'Sin transacción'),
          origen: first.origen.trim() || (first.tipo === 'ingreso' ? 'Proveedor' : 'Depósito'),
          causa: first.causa.trim() || (first.tipo === 'ingreso' ? 'Ingreso' : 'Devolución'),
          sol: first.sol.trim(),
          estado: first.estado || 'Abierto',
          ubicacion: first.ubicacion.trim(),
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
          fecha: r.fecha || todayDate(),
          reporta: r.reporta || currentUser || 'Franco',
          items: [{ sku: r.sku.trim().toUpperCase(), desc: r.desc.trim(), cant: Number(r.cant) || 1 }],
          sku: r.sku.trim().toUpperCase(),
          desc: r.desc.trim(),
          cant: Number(r.cant) || 1,
          trx: r.trx.trim() || (r.tipo === 'ingreso' ? 'Sin remito' : 'Sin transacción'),
          origen: r.origen.trim() || (r.tipo === 'ingreso' ? 'Proveedor' : 'Depósito'),
          causa: r.causa.trim() || (r.tipo === 'ingreso' ? 'Ingreso' : 'Devolución'),
          sol: r.sol.trim(),
          estado: r.estado || 'Abierto',
          ubicacion: r.ubicacion.trim(),
          mov: null
        });
      });
    }

    return reports;
  }, [validRows, groupMultiSku, nextReportNumber, currentUser]);

  // Submit Handler
  const handleConfirm = () => {
    if (preparedReports.length === 0) return;
    onConfirmImport(preparedReports);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-900/60 backdrop-blur-xs">
      {/* HTML Datalists for Autocomplete */}
      <datalist id="reporters-list">
        {reporterNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <datalist id="origen-list">
        {ORIGEN_SUGGESTIONS.map((orig) => (
          <option key={orig} value={orig} />
        ))}
      </datalist>

      <datalist id="causa-list">
        {CAUSA_SUGGESTIONS.map((causa) => (
          <option key={causa} value={causa} />
        ))}
      </datalist>

      <div className="bg-white dark:bg-neutral-850 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-750 flex items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900 dark:text-white leading-tight flex items-center gap-2">
                <span>Cargar y Editar Plantilla CSV de Reportes</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  Edición en vivo
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sube tu CSV o agrega filas para modificar libremente referencia, responsable, procedencia, motivo, SKU, cantidad, observaciones y estado antes de confirmar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Top Options Bar: Template Download & File Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Download template card */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-750 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <div className="text-xs text-neutral-700 dark:text-neutral-300 truncate">
                  <div className="font-bold">Plantilla oficial con 12 columnas</div>
                  <div className="text-[11px] text-neutral-400 truncate">Tipo, Fecha, Resp, SKU, Desc, Cant, Trx, Origen, Causa...</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar CSV</span>
              </button>
            </div>

            {/* Upload file card */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-750 gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-2.5 min-w-0">
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs min-w-0">
                  <div className="font-bold text-neutral-900 dark:text-white truncate">
                    {fileName ? `Archivo: ${fileName}` : 'Cargar archivo CSV desde tu PC'}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    {rows.length > 0 ? `${rows.length} filas detectadas` : 'Arrastra o selecciona tu archivo'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {fileName && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileName('');
                      setCsvText('');
                      setRows([]);
                    }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer font-semibold"
                  >
                    Quitar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-900 dark:text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{fileName ? 'Reemplazar' : 'Seleccionar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick manual paste toggle (if no rows yet or to paste CSV directly) */}
          {rows.length === 0 && (
            <div className="space-y-2 p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-200 dark:border-neutral-750">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  O pega aquí el contenido de tu CSV:
                </label>
                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Empezar con fila vacía manual</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={csvText}
                onChange={(e) => handleTextareaChange(e.target.value)}
                placeholder={"Tipo,Fecha,Responsable,SKU,Descripcion,Cantidad,Comprobante_Trx,Origen,Causa_Motivo,Observaciones,Estado,Ubicacion\ningreso,2026-10-06,Matías,CW1108,Juego de llaves tubo 94 pzs,10,REM-2024-0089,Proveedor,Ingreso,Recepción completa,Abierto,Estantería A1"}
                className="w-full p-3 font-mono text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
          )}

          {/* When rows exist: Main Interactive Editor Toolbar */}
          {rows.length > 0 && (
            <div className="space-y-3">
              {/* Toolbar: Search, Add row, Group mode, Mass tools toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200 dark:border-neutral-750">
                {/* Search in loaded rows */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar en filas (SKU, remito, desc, responsable...)"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-neutral-700"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Center / Right controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Add manual row */}
                  <button
                    type="button"
                    onClick={handleAddNewRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-900 dark:text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Agregar fila</span>
                  </button>

                  {/* Mass actions dropdown toggle */}
                  <button
                    type="button"
                    onClick={() => setShowMassTools((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                      showMassTools
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Edición masiva</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMassTools ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Group Multi-SKU option */}
                  <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-xl p-0.5 bg-neutral-100 dark:bg-neutral-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setGroupMultiSku('group_by_doc')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        groupMultiSku === 'group_by_doc'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                      title="Agrupa filas con el mismo Remito / Comprobante en un único ticket multi-SKU"
                    >
                      Multi-SKU (x Remito)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupMultiSku('individual')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        groupMultiSku === 'individual'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                      }`}
                      title="Crea un ticket separado por cada fila cargada"
                    >
                      1 Ticket por fila
                    </button>
                  </div>
                </div>
              </div>

              {/* Mass Actions Drawer */}
              {showMassTools && (
                <div className="p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/60 rounded-2xl space-y-3 animate-in fade-in-50 duration-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-300">
                    <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Herramientas de edición masiva (aplicar a todas las {rows.length} filas):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Mass Resp */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                        Quién Registra
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          list="reporters-list"
                          value={massResp}
                          onChange={(e) => setMassResp(e.target.value)}
                          placeholder="Ej: Franco"
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={applyMassResp}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>

                    {/* Mass Origen */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                        Procedencia / Origen
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          list="origen-list"
                          value={massOrigen}
                          onChange={(e) => setMassOrigen(e.target.value)}
                          placeholder="Ej: Proveedor"
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={applyMassOrigen}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>

                    {/* Mass Causa */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                        Motivo / Causa
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          list="causa-list"
                          value={massCausa}
                          onChange={(e) => setMassCausa(e.target.value)}
                          placeholder="Ej: Ingreso"
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={applyMassCausa}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>

                    {/* Mass Estado */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                        Estado
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          value={massEstado}
                          onChange={(e) => setMassEstado(e.target.value as ReportStatus)}
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        >
                          <option value="">Seleccionar...</option>
                          {ESTADO_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={applyMassEstado}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status summary pill banner */}
              <div className="flex items-center justify-between text-xs px-1 flex-wrap gap-2">
                <div className="flex items-center gap-2 font-bold flex-wrap">
                  <span className="text-neutral-800 dark:text-neutral-200">Total: {rows.length} filas</span>
                  <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {validRows.length} válidas
                  </span>
                  {invalidRowsCount > 0 && (
                    <span className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {invalidRowsCount} con datos faltantes (puedes corregirlos abajo)
                    </span>
                  )}
                  <span className="text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    {preparedReports.length} tickets finales a crear (IDs: {pid(nextReportNumber)} → {pid(nextReportNumber + preparedReports.length - 1)})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Seguro que deseas vaciar todas las filas cargadas?')) {
                        setRows([]);
                        setCsvText('');
                        setFileName('');
                      }
                    }}
                    className="text-xs text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                </div>
              </div>

              {/* Editable Data Table (Spreadsheet style) */}
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-neutral-800">
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-neutral-100 dark:bg-neutral-900 sticky top-0 z-10 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700 shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-8">#</th>
                        <th className="py-2.5 px-2.5 w-24">Tipo</th>
                        <th className="py-2.5 px-2.5 min-w-[120px]">SKU *</th>
                        <th className="py-2.5 px-2.5 min-w-[200px]">Descripción *</th>
                        <th className="py-2.5 px-2 text-center w-20">Cant *</th>
                        <th className="py-2.5 px-2.5 min-w-[140px]">Nº Ref / Remito</th>
                        <th className="py-2.5 px-2.5 min-w-[130px]">Quién Registra</th>
                        <th className="py-2.5 px-2.5 min-w-[130px]">Procedencia</th>
                        <th className="py-2.5 px-2.5 min-w-[130px]">Motivo</th>
                        <th className="py-2.5 px-2.5 min-w-[150px]">Observaciones</th>
                        <th className="py-2.5 px-2.5 w-28">Estado</th>
                        <th className="py-2.5 px-2 text-center w-16">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 font-mono text-[11px]">
                      {filteredRows.map((row, index) => {
                        const errors = getRowErrors(row);
                        const hasErrors = errors.length > 0;

                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors ${
                              hasErrors
                                ? 'bg-rose-50/70 dark:bg-rose-950/30'
                                : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-750/50'
                            }`}
                          >
                            {/* Row Index & status */}
                            <td className="py-2 px-2 text-center text-neutral-400 select-none">
                              {hasErrors ? (
                                <span title={errors.join(', ')} className="text-rose-600 font-bold cursor-help">
                                  ⚠️
                                </span>
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </td>

                            {/* Tipo */}
                            <td className="py-2 px-2.5 font-sans">
                              <select
                                value={row.tipo}
                                onChange={(e) => updateRowField(row.id, 'tipo', e.target.value as ReportType)}
                                className={`w-full py-1 px-1.5 text-[11px] font-bold rounded-lg border focus:outline-hidden ${
                                  row.tipo === 'ingreso'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : row.tipo === 'encontrado'
                                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                }`}
                              >
                                {TIPO_OPTIONS.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* SKU */}
                            <td className="py-2 px-2.5">
                              <input
                                type="text"
                                required
                                value={row.sku}
                                onChange={(e) => updateRowField(row.id, 'sku', e.target.value.toUpperCase())}
                                placeholder="SKU-1234"
                                className={`w-full py-1 px-2 font-bold rounded-lg border text-neutral-900 dark:text-white uppercase ${
                                  !row.sku.trim()
                                    ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/50'
                                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                                } focus:outline-hidden focus:ring-1 focus:ring-neutral-900`}
                              />
                            </td>

                            {/* Descripción */}
                            <td className="py-2 px-2.5 font-sans">
                              <input
                                type="text"
                                required
                                value={row.desc}
                                onChange={(e) => updateRowField(row.id, 'desc', e.target.value)}
                                placeholder="Descripción del producto..."
                                className={`w-full py-1 px-2 rounded-lg border text-neutral-900 dark:text-white ${
                                  !row.desc.trim()
                                    ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/50'
                                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                                } focus:outline-hidden focus:ring-1 focus:ring-neutral-900`}
                              />
                            </td>

                            {/* Cantidad */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min={1}
                                required
                                value={row.cant}
                                onChange={(e) => updateRowField(row.id, 'cant', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className={`w-16 py-1 px-1.5 text-center font-bold rounded-lg border text-neutral-900 dark:text-white ${
                                  row.cant <= 0
                                    ? 'border-rose-400 bg-rose-50/50'
                                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                                } focus:outline-hidden focus:ring-1 focus:ring-neutral-900`}
                              />
                            </td>

                            {/* Nro de Referencia / Remito / Comprobante */}
                            <td className="py-2 px-2.5">
                              <input
                                type="text"
                                value={row.trx}
                                onChange={(e) => updateRowField(row.id, 'trx', e.target.value)}
                                placeholder="REM-0012 / #12345"
                                className="w-full py-1 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                              />
                            </td>

                            {/* Quién Registra (Responsable) */}
                            <td className="py-2 px-2.5 font-sans">
                              <input
                                type="text"
                                list="reporters-list"
                                value={row.reporta}
                                onChange={(e) => updateRowField(row.id, 'reporta', e.target.value)}
                                placeholder="Franco"
                                className="w-full py-1 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                              />
                            </td>

                            {/* Procedencia (Origen) */}
                            <td className="py-2 px-2.5 font-sans">
                              <input
                                type="text"
                                list="origen-list"
                                value={row.origen}
                                onChange={(e) => updateRowField(row.id, 'origen', e.target.value)}
                                placeholder="Proveedor / Depósito"
                                className="w-full py-1 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                              />
                            </td>

                            {/* Motivo (Causa) */}
                            <td className="py-2 px-2.5 font-sans">
                              <input
                                type="text"
                                list="causa-list"
                                value={row.causa}
                                onChange={(e) => updateRowField(row.id, 'causa', e.target.value)}
                                placeholder="Ingreso / Devolución"
                                className="w-full py-1 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                              />
                            </td>

                            {/* Observaciones (Sol) */}
                            <td className="py-2 px-2.5 font-sans">
                              <input
                                type="text"
                                value={row.sol}
                                onChange={(e) => updateRowField(row.id, 'sol', e.target.value)}
                                placeholder="Comentarios / detalles..."
                                className="w-full py-1 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                              />
                            </td>

                            {/* Estado */}
                            <td className="py-2 px-2.5 font-sans">
                              <select
                                value={row.estado}
                                onChange={(e) => updateRowField(row.id, 'estado', e.target.value as ReportStatus)}
                                className="w-full py-1 px-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-[11px] font-semibold focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                              >
                                {ESTADO_OPTIONS.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Actions (Duplicate / Delete) */}
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRow(row.id)}
                                  className="p-1 rounded-md text-neutral-400 hover:text-sky-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                                  title="Duplicar fila"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                                  title="Eliminar fila"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-750 bg-neutral-50/70 dark:bg-neutral-900/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="flex items-center gap-3">
            {invalidRowsCount > 0 && (
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold hidden sm:inline">
                Hay {invalidRowsCount} fila(s) con SKU o descripción vacía.
              </span>
            )}

            <button
              type="button"
              disabled={validRows.length === 0}
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>
                Confirmar e Importar {preparedReports.length > 0 && `(${preparedReports.length} reportes)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
