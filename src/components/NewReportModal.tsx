import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, AlertCircle, ArrowDownToLine, Search, Plus, Trash2, Eye } from 'lucide-react';
import { StockReport, ReportType, ReportStatus, ReportItem } from '../types/stock';
import { todayDate, pid } from '../utils/storage';
import { ReportCard } from './ReportCard';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: Omit<StockReport, 'id' | 'fecha' | 'mov'>) => void;
  nextIdNumber: number;
  initialType?: ReportType | null;
  reporterNames: string[];
}

const ORIGEN_OPTIONS: Record<ReportType, string[]> = {
  problema: ['Devoluciones', 'Venta', 'Depósito', 'Empaque', 'Interno', 'Otro'],
  ingreso: ['Proveedor', 'Depósito central', 'Compras', 'Importación', 'Fábrica', 'Otro'],
  encontrado: ['Depósito', 'Mostrador', 'Área de embalaje', 'Auditoría física', 'Góndola', 'Otro']
};

// Opciones de causa simplificadas según requerimientos: Ingreso, Devolución, Transferencia
const CAUSA_OPTIONS: Record<ReportType, string[]> = {
  problema: ['Devolución', 'Transferencia', 'Ingreso', 'Roto / Dañado', 'Faltante en pedido', 'Vencido / Caducado', 'Otro'],
  ingreso: ['Ingreso', 'Devolución', 'Transferencia', 'Recepción de compra / Proveedor'],
  encontrado: ['Transferencia', 'Ingreso', 'Devolución', 'Hallado en estantería sin registrar']
};

export const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nextIdNumber,
  initialType = null,
  reporterNames
}) => {
  const [step, setStep] = useState<1 | 2>(initialType ? 2 : 1);
  const [tipo, setTipo] = useState<ReportType>(initialType || 'problema');

  // Multi-SKU Items list
  const [items, setItems] = useState<ReportItem[]>([
    { sku: '', desc: '', cant: 1 }
  ]);

  // General fields
  const [trx, setTrx] = useState('');
  const [origen, setOrigen] = useState('');
  const [causa, setCausa] = useState('');
  const [reporta, setReporta] = useState('');
  const [sol, setSol] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [estado, setEstado] = useState<ReportStatus>('Abierto');
  const [error, setError] = useState<string | null>(null);

  // Mobile preview toggle
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialType) {
        setTipo(initialType);
        setStep(2);
      } else {
        setStep(1);
      }
      resetForm();
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    setOrigen(ORIGEN_OPTIONS[tipo][0]);
    setCausa(CAUSA_OPTIONS[tipo][0]);
  }, [tipo]);

  const resetForm = () => {
    setItems([{ sku: '', desc: '', cant: 1 }]);
    setTrx('');
    setSol('');
    setUbicacion('');
    setEstado('Abierto');
    setError(null);
    setShowMobilePreview(false);
  };

  if (!isOpen) return null;

  const handleSelectType = (selectedType: ReportType) => {
    setTipo(selectedType);
    setOrigen(ORIGEN_OPTIONS[selectedType][0]);
    setCausa(CAUSA_OPTIONS[selectedType][0]);
    setStep(2);
  };

  // Item handlers
  const handleAddItem = () => {
    setItems((prev) => [...prev, { sku: '', desc: '', cant: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ReportItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'sku') {
          return { ...item, sku: String(value).toUpperCase() };
        }
        if (field === 'cant') {
          const num = parseInt(value, 10);
          return { ...item, cant: isNaN(num) || num < 1 ? 1 : num };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const totalItemsCount = items.length;
  const totalUnitsCount = items.reduce((sum, it) => sum + (it.cant || 1), 0);

  const handleSave = () => {
    const cleanReporta = reporta.trim();
    if (!cleanReporta) {
      setError('Por favor indicá quién está realizando el reporte / recepción.');
      return;
    }

    // Validate all items
    const cleanItems: ReportItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const cleanSku = it.sku.trim().toUpperCase();
      const cleanDesc = it.desc.trim();
      const cleanCant = Math.max(1, Math.floor(it.cant || 1));

      if (!cleanSku) {
        setError(`Falta ingresar el SKU en el producto #${i + 1}.`);
        return;
      }
      if (!cleanDesc) {
        setError(`Falta ingresar la descripción en el producto #${i + 1} (${cleanSku}).`);
        return;
      }
      cleanItems.push({
        sku: cleanSku,
        desc: cleanDesc,
        cant: cleanCant
      });
    }

    setError(null);
    const firstSku = cleanItems[0].sku;
    const summaryDesc = cleanItems.length === 1
      ? cleanItems[0].desc
      : `${cleanItems[0].desc} (+${cleanItems.length - 1} ${cleanItems.length - 1 === 1 ? 'producto más' : 'productos más'})`;

    onSubmit({
      tipo,
      items: cleanItems,
      sku: firstSku,
      desc: summaryDesc,
      cant: totalUnitsCount,
      trx: trx.trim() || (tipo === 'ingreso' ? 'Sin remito' : 'Sin transacción'),
      origen,
      causa,
      reporta: cleanReporta,
      sol: sol.trim(),
      ubicacion: ubicacion.trim(),
      estado
    });
    onClose();
  };

  // Live preview report object
  const previewItems: ReportItem[] = items.map((it) => ({
    sku: it.sku.trim().toUpperCase() || 'SKU-0000',
    desc: it.desc.trim() || 'Nombre del producto',
    cant: Math.max(1, it.cant || 1)
  }));

  const previewReport: StockReport = {
    id: pid(nextIdNumber),
    tipo,
    fecha: todayDate(),
    reporta: reporta.trim() || 'Tu nombre',
    items: previewItems,
    sku: previewItems[0]?.sku || 'SKU-0000',
    desc: previewItems.length === 1
      ? (previewItems[0]?.desc || 'Producto')
      : `${previewItems[0]?.desc || 'Producto'} (+${previewItems.length - 1} más)`,
    trx: trx.trim() || (tipo === 'ingreso' ? 'REM-001' : '#TRX-001'),
    origen: origen || 'Depósito',
    causa: causa || 'Ingreso',
    cant: totalUnitsCount,
    sol: sol.trim() || '',
    ubicacion: ubicacion.trim() || '',
    estado,
    mov: null
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-800 rounded-3xl max-w-4xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-700 max-h-[94vh] flex flex-col my-auto overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-50/70 dark:bg-neutral-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer shrink-0"
                title="Volver a elegir tipo"
                aria-label="Volver al paso 1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2 truncate">
                <span>Nuevo reporte</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 shrink-0">
                  {pid(nextIdNumber)}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {step === 1
                  ? 'Paso 1: Seleccioná el tipo de reporte'
                  : `Paso 2: Datos para ${
                      tipo === 'problema'
                        ? 'Problema o Faltante (-)'
                        : tipo === 'ingreso'
                        ? 'Ingreso de stock (+)'
                        : 'Producto encontrado (+)'
                    }`}
              </p>
            </div>
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* STEP 1: Type Selection */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="text-center max-w-lg mx-auto mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  ¿Qué movimiento de stock vas a reportar?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Elegí la opción. Podés cargar uno o múltiples SKUs por cada reporte o remito.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {/* Option 1: Problema */}
                <button
                  type="button"
                  onClick={() => handleSelectType('problema')}
                  className="p-4 sm:p-5 text-left rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-rose-500 dark:hover:border-rose-500 bg-white dark:bg-neutral-800/60 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-neutral-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 text-sm">
                        Problema o Faltante
                      </span>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        Resta (-)
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                      Productos rotos, faltantes en pedidos, mercadería vencida o dañada que requiere baja o reclamo.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                    <span>Cargar problema</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Option 2: Ingreso de stock */}
                <button
                  type="button"
                  onClick={() => handleSelectType('ingreso')}
                  className="p-4 sm:p-5 text-left rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-neutral-800/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <ArrowDownToLine className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 text-sm">
                        Ingreso de stock
                      </span>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Suma (+)
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                      Recepción de compras a proveedores, remitos recibidos con varios SKUs, reposición o ingresos nuevos.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                    <span>Cargar ingreso</span>
                    <span>→</span>
                  </div>
                </button>

                {/* Option 3: Producto encontrado */}
                <button
                  type="button"
                  onClick={() => handleSelectType('encontrado')}
                  className="p-4 sm:p-5 text-left rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-sky-500 dark:hover:border-sky-500 bg-white dark:bg-neutral-800/60 hover:bg-sky-50/30 dark:hover:bg-sky-950/20 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Search className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-neutral-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 text-sm">
                        Producto encontrado
                      </span>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                        Suma (+)
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                      Mercadería hallada en depósito que no figuraba en inventario físico, sobrantes o sin registrar.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center justify-between">
                    <span>Cargar hallazgo</span>
                    <span>→</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: The Adaptive Form + Multi-SKU Items */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Section */}
              <div className="lg:col-span-7 space-y-4">
                {/* Type Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTipo('problema')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipo === 'problema'
                        ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Problema (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('ingreso')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipo === 'ingreso'
                        ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Ingreso (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('encontrado')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipo === 'encontrado'
                        ? 'bg-white dark:bg-neutral-800 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Encontrado (+)</span>
                  </button>
                </div>

                {error && (
                  <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Section 1: General Info (Remito/Trx, Reporter, Origin, Cause) */}
                <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Datos del comprobante / origen
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        {tipo === 'ingreso'
                          ? 'Nº Remito / Factura'
                          : tipo === 'encontrado'
                          ? 'Transacción / Ref. (opcional)'
                          : 'Nº Transacción / Ticket'}
                      </label>
                      <input
                        type="text"
                        value={trx}
                        onChange={(e) => setTrx(e.target.value)}
                        placeholder={
                          tipo === 'ingreso'
                            ? 'Ej: REM-2024-0089'
                            : tipo === 'encontrado'
                            ? 'Ej: #AUD-2024-B'
                            : 'Ej: #200006548136'
                        }
                        className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        {tipo === 'ingreso' ? 'Quién recibe / ingresa' : 'Quién reporta'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="reporter-list"
                        value={reporta}
                        onChange={(e) => setReporta(e.target.value)}
                        placeholder="Ej: Franco, Matías..."
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                      <datalist id="reporter-list">
                        {reporterNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        {tipo === 'ingreso'
                          ? 'Procedencia / Proveedor'
                          : tipo === 'encontrado'
                          ? 'Lugar del hallazgo'
                          : 'Origen'}
                      </label>
                      <select
                        value={origen}
                        onChange={(e) => setOrigen(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                      >
                        {ORIGEN_OPTIONS[tipo].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                        Motivo / Causa (simplificada)
                      </label>
                      <select
                        value={causa}
                        onChange={(e) => setCausa(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                      >
                        {CAUSA_OPTIONS[tipo].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: MULTI-SKU PRODUCTS LIST */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Productos / SKUs a registrar
                      </span>
                      <span className="ml-2 font-mono text-[11px] font-semibold text-neutral-500">
                        ({totalItemsCount} {totalItemsCount === 1 ? 'producto' : 'productos'} • {totalUnitsCount} u. total)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 flex items-center gap-1 transition-opacity cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Agregar SKU</span>
                    </button>
                  </div>

                  {/* Items list */}
                  <div className="space-y-3">
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-100 dark:border-neutral-700/60">
                          <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-center text-[10px] font-mono font-bold">
                              {idx + 1}
                            </span>
                            <span>Producto #{idx + 1}</span>
                          </span>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                              title="Quitar este SKU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          {/* SKU */}
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                              SKU <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={it.sku}
                              onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                              placeholder="Ej: CW1160"
                              className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Descripción */}
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                              Descripción / Nombre <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={it.desc}
                              onChange={(e) => handleItemChange(idx, 'desc', e.target.value)}
                              placeholder="Ej: Llave tubo 94 pzs"
                              className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Cantidad */}
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                              {tipo === 'problema' ? 'Cant. (-)' : 'Cant. (+)'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={it.cant}
                                onChange={(e) => handleItemChange(idx, 'cant', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs sm:text-sm font-mono font-bold text-center rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add item helper bottom button */}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-2 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar otro producto al remito / reporte</span>
                  </button>
                </div>

                {/* Section 3: Notes & Initial Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                      Observaciones (opcional)
                    </label>
                    <input
                      type="text"
                      value={sol}
                      onChange={(e) => setSol(e.target.value)}
                      placeholder="Ej: Verificado estado, observaciones o notas..."
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                      Estado inicial
                    </label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value as ReportStatus)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="Abierto">Abierto</option>
                      <option value="Notificado">Notificado</option>
                      <option value="En revisión">En revisión</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Preview Toggle Button */}
                <div className="block lg:hidden pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMobilePreview(!showMobilePreview)}
                    className="w-full py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{showMobilePreview ? 'Ocultar vista previa' : 'Ver vista previa del ticket'}</span>
                  </button>
                  {showMobilePreview && (
                    <div className="mt-3">
                      <ReportCard report={previewReport} isPreview />
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Live Preview Section */}
              <div className="hidden lg:flex lg:col-span-5 flex-col justify-start">
                <div className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                  Vista previa del ticket
                </div>
                <div className="sticky top-2">
                  <ReportCard report={previewReport} isPreview />
                  <p className="text-[11px] text-neutral-400 text-center mt-2">
                    Así se registrará el reporte con sus {items.length} {items.length === 1 ? 'producto' : 'productos'}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 flex items-center justify-between shrink-0">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
              >
                Cancelar
              </button>
              <div className="text-xs text-neutral-400">
                Seleccioná una tarjeta para continuar
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
              >
                ← Tipo
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Registrar reporte ({totalUnitsCount} u.)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
