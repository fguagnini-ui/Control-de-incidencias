import React, { useState } from 'react';
import {
  X,
  Github,
  Globe,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  Check,
  HardDrive,
  ExternalLink,
  Info,
  Terminal,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StockDatabase } from '../types/stock';
import { downloadDatabaseJSON } from '../utils/storage';

interface GitHubPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: StockDatabase;
  onImportDatabase: (newDb: StockDatabase) => void;
  onExportCsv: () => void;
  onResetExample: () => void;
}

export const GitHubPagesModal: React.FC<GitHubPagesModalProps> = ({
  isOpen,
  onClose,
  db,
  onImportDatabase,
  onExportCsv,
  onResetExample
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadRepoDatabase = () => {
    downloadDatabaseJSON(db);
  };

  // Calculate approximate storage usage
  const storageString = localStorage.getItem('tickets_stock_v2') || '';
  const storageKb = (new Blob([storageString]).size / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-850 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shadow-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                GitHub Pages & Respaldo
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Listo para publicar
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Guía de despliegue gratuito y sincronización de datos de stock
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Status banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Configuración de GitHub Pages completada con éxito
              </h4>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                El proyecto ya incluye rutas relativas (<code className="font-mono font-semibold bg-emerald-100/80 dark:bg-emerald-900/40 px-1 py-0.5 rounded">base: './'</code>), archivo <code className="font-mono bg-emerald-100/80 dark:bg-emerald-900/40 px-1 py-0.5 rounded">.nojekyll</code>, script 404 SPA y el flujo automatizado <code className="font-mono bg-emerald-100/80 dark:bg-emerald-900/40 px-1 py-0.5 rounded">.github/workflows/deploy.yml</code>.
              </p>
            </div>
          </div>

          {/* Quick steps */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              ¿Cómo activarlo en tu repositorio de GitHub? (2 Pasos)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Sube el código a GitHub
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Haz push a tu rama <code className="font-mono text-neutral-700 dark:text-neutral-300">main</code>.
                </p>
                <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px]">
                  <span className="truncate">git push origin main</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('git add . && git commit -m "Deploy a GitHub Pages" && git push origin main', 1)}
                    className="ml-2 text-neutral-400 hover:text-white cursor-pointer"
                    title="Copiar comando"
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Activa Pages en GitHub
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  En GitHub ve a: <strong>Settings</strong> &gt; <strong>Pages</strong>. En <strong>Source</strong> selecciona:
                </p>
                <div className="p-2 rounded-xl bg-neutral-200/80 dark:bg-neutral-700/60 text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>GitHub Actions (Automático)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative manual deploy */}
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-3">
            <div className="text-xs text-neutral-600 dark:text-neutral-300">
              <span className="font-bold">¿Despliegue manual por terminal?</span> También tienes listo el comando{' '}
              <code className="font-mono bg-neutral-200/80 dark:bg-neutral-700 px-1 py-0.5 rounded">npm run deploy</code>.
            </div>
            <button
              type="button"
              onClick={() => handleCopy('npm run deploy', 2)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar</span>
            </button>
          </div>

          {/* Backup & Persistence Section */}
          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" />
                Sincronización de Datos y Respaldos
              </h3>
              <div className="text-[11px] font-mono text-neutral-500">
                {storageKb} KB en uso ({db.reportes.length} reportes, {db.movimientos.length} mov.)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Download database.json for Repo seed */}
              <button
                type="button"
                onClick={handleDownloadRepoDatabase}
                className="flex items-start gap-3 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-left transition-colors cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 transition-colors">
                    Descargar database.json
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                    Para reemplazar <code className="font-mono">src/data/database.json</code> y actualizar la base inicial del repo.
                  </div>
                </div>
              </button>

              {/* Export Full CSV */}
              <button
                type="button"
                onClick={() => {
                  onExportCsv();
                }}
                className="flex items-start gap-3 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-left transition-colors cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    Exportar planilla CSV
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                    Descarga en Excel todos los tickets con SKUs, descripciones y motivos.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 text-xs">
          <div className="flex items-center gap-2 text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tus datos están protegidos en almacenamiento local.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold hover:opacity-95 transition-opacity cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
