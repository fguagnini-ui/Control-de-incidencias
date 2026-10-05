import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
  Plus,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Sparkles,
  Copy,
  Check,
  Globe,
  Key
} from 'lucide-react';
import { User } from 'firebase/auth';
import { StockDatabase } from '../types/stock';
import { googleSignIn, googleLogout, initAuth } from '../services/auth';
import {
  createStockSpreadsheet,
  syncDatabaseToSheets,
  loadDatabaseFromSheets,
  syncDatabaseViaWebhook,
  loadDatabaseViaWebhook,
  extractSpreadsheetId,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  STORAGE_WEBHOOK_KEY,
  APPS_SCRIPT_TEMPLATE
} from '../services/googleSheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: StockDatabase;
  onUpdateDb: (newDb: StockDatabase) => void;
  showToast: (msg: string) => void;
  webhookUrl?: string;
  onUpdateWebhookUrl?: (url: string) => void;
}

const STORAGE_SPREADSHEET_KEY = 'tickets_stock_spreadsheet_id';
const STORAGE_LAST_SYNC_KEY = 'tickets_stock_last_sync';

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  db,
  onUpdateDb,
  showToast,
  webhookUrl: initialWebhook = '',
  onUpdateWebhookUrl
}) => {
  const [activeMode, setActiveMode] = useState<'webhook' | 'oauth'>('webhook');

  // Webhook state
  const [webhookInput, setWebhookInput] = useState<string>(() => {
    try {
      return initialWebhook || localStorage.getItem(STORAGE_WEBHOOK_KEY) || '';
    } catch {
      return initialWebhook || '';
    }
  });
  const [copiedCode, setCopiedCode] = useState(false);

  // OAuth state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SPREADSHEET_KEY);
      return saved || DEFAULT_SPREADSHEET_ID;
    } catch {
      return DEFAULT_SPREADSHEET_ID;
    }
  });
  const [lastSync, setLastSync] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_LAST_SYNC_KEY) || '';
    } catch {
      return '';
    }
  });

  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<'sync' | 'import' | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    showToast('Código de Apps Script copiado al portapapeles');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = webhookInput.trim();
    if (!cleanUrl) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // Test sync immediately
      await syncDatabaseViaWebhook(cleanUrl, db);
      localStorage.setItem(STORAGE_WEBHOOK_KEY, cleanUrl);
      if (onUpdateWebhookUrl) onUpdateWebhookUrl(cleanUrl);

      const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      setLastSync(nowStr);
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, nowStr);

      setStatusMessage({
        type: 'success',
        text: '¡Webhook conectado y datos sincronizados! Ahora cualquier usuario en la web podrá guardar tickets sin iniciar sesión.'
      });
      showToast('Sincronización directa sin login activada');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al conectar con la URL del Webhook'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearWebhook = () => {
    localStorage.removeItem(STORAGE_WEBHOOK_KEY);
    setWebhookInput('');
    if (onUpdateWebhookUrl) onUpdateWebhookUrl('');
    showToast('Webhook desconectado');
  };

  // OAuth Handlers
  const handleSignIn = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        showToast(`Conectado como ${res.user.email}`);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al conectar con Google'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await googleLogout();
    setGoogleUser(null);
    showToast('Sesión de Google cerrada');
  };

  const handleCreateSheet = async () => {
    if (!googleUser) return;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const { spreadsheetId: newId } = await createStockSpreadsheet();
      setSpreadsheetId(newId);
      localStorage.setItem(STORAGE_SPREADSHEET_KEY, newId);

      await syncDatabaseToSheets(newId, db);
      const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      setLastSync(nowStr);
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, nowStr);

      setStatusMessage({
        type: 'success',
        text: 'Planilla creada y datos iniciales sincronizados con éxito.'
      });
      showToast('Planilla de Google Sheets creada y sincronizada');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al crear la planilla'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkExistingSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractSpreadsheetId(inputUrl);
    if (!cleanId) return;

    setSpreadsheetId(cleanId);
    localStorage.setItem(STORAGE_SPREADSHEET_KEY, cleanId);
    setInputUrl('');
    setStatusMessage({
      type: 'success',
      text: `Planilla vinculada con ID: ${cleanId}`
    });
    showToast('Planilla de Google Sheets vinculada');
  };

  const handleConfirmSync = async () => {
    if (!spreadsheetId) return;
    setConfirmAction(null);
    setIsLoading(true);
    setStatusMessage(null);

    try {
      await syncDatabaseToSheets(spreadsheetId, db);
      const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      setLastSync(nowStr);
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, nowStr);

      setStatusMessage({
        type: 'success',
        text: 'Datos sincronizados exitosamente con Google Sheets.'
      });
      showToast('Exportación a Google Sheets completada');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al exportar datos a Google Sheets'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!spreadsheetId) return;
    setConfirmAction(null);
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const importedDb = await loadDatabaseFromSheets(spreadsheetId);
      onUpdateDb(importedDb);

      const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      setLastSync(nowStr);
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, nowStr);

      setStatusMessage({
        type: 'success',
        text: `Datos importados: ${importedDb.reportes.length} reportes y ${importedDb.movimientos.length} movimientos cargados.`
      });
      showToast('Datos importados desde Google Sheets');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al importar datos desde Google Sheets'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentSheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : DEFAULT_SPREADSHEET_URL;

  const isWebhookActive = Boolean(webhookInput.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white">
                Sincronización con Google Sheets
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Base de datos centralizada para todo el equipo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-3 border-b border-neutral-100 dark:border-neutral-700/80 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('webhook')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeMode === 'webhook'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Acceso Directo (Sin Login)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-bold">
              Recomendado
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('oauth')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeMode === 'oauth'
                ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Cuenta Google (OAuth)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeMode === 'webhook' ? (
            /* TAB 1: WEBHOOK (NO LOGIN REQUIRED) */
            <div className="space-y-4">
              {isWebhookActive ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Sincronización directa activa (Sin inicio de sesión)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearWebhook}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Cambiar URL
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Cualquier persona que use la aplicación desde la web (en GitHub Pages, computadora o celular) guardará y leerá tickets directamente de tu planilla de Google Sheets sin tener que iniciar sesión en Google.
                  </p>
                  <div className="text-[10px] text-neutral-400 font-mono truncate">
                    Webhook: {webhookInput}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
                  <strong>¿Cómo funciona?</strong> Google Sheets permite crear una "Aplicación Web" (Apps Script) con un enlace privado. La app enviará los tickets a esa dirección directamente, permitiendo que cualquiera cargue tickets sin pedirle cuenta de Google.
                </div>
              )}

              {/* Instructions steps */}
              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Paso a paso para habilitar el acceso público (1 minuto):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? '¡Copiado!' : 'Copiar código Apps Script'}</span>
                  </button>
                </div>

                <ol className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 list-decimal list-inside">
                  <li>
                    Abre tu{' '}
                    <a
                      href={DEFAULT_SPREADSHEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Planilla de Google Sheets
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    .
                  </li>
                  <li>En el menú superior ve a: <strong>Extensiones &gt; Apps Script</strong>.</li>
                  <li>Borra todo lo que aparezca en el editor y <strong>pega el código</strong> que copiaste.</li>
                  <li>
                    Haz clic arriba a la derecha en <strong>Implementar &gt; Nueva implementación</strong>:
                    <ul className="list-disc list-inside pl-4 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 space-y-0.5">
                      <li>Tipo: <strong>Aplicación web</strong></li>
                      <li>Ejecutar como: <strong>Yo (tu correo)</strong></li>
                      <li>Quién tiene acceso: <strong>Cualquier persona</strong></li>
                    </ul>
                  </li>
                  <li>Copia la <strong>URL de la aplicación web</strong> que te da Google y pégala aquí abajo:</li>
                </ol>

                <form onSubmit={handleSaveWebhook} className="pt-2 flex gap-2">
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={!webhookInput.trim() || isLoading}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Guardar y Probar</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* TAB 2: OAUTH LOGIN */
            <div className="space-y-4">
              {/* Google Account Connection */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-750/30 space-y-3">
                <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  1. Cuenta de Google
                </div>

                {googleUser ? (
                  <div className="flex items-center justify-between gap-3 bg-white dark:bg-neutral-800 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {googleUser.photoURL ? (
                        <img
                          src={googleUser.photoURL}
                          alt={googleUser.displayName || 'Google'}
                          className="w-7 h-7 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold">
                          {googleUser.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                          {googleUser.displayName || 'Usuario Google'}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                          {googleUser.email}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                      title="Desconectar cuenta"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs cursor-pointer transition-all"
                  >
                    <span>Conectar con Google (OAuth)</span>
                  </button>
                )}
              </div>

              {/* Spreadsheet Association */}
              {googleUser && (
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-750/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      2. Planilla Vinculada
                    </span>
                    {spreadsheetId && (
                      <a
                        href={currentSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Abrir planilla</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        Control de Stock - Mecano Tools
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono truncate">
                        ID: {spreadsheetId}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Sync Actions */}
              {googleUser && spreadsheetId && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAction('sync')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Exportar todo a Sheets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmAction('import')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs cursor-pointer transition-all"
                  >
                    <DownloadCloud className="w-4 h-4 text-neutral-500" />
                    <span>Importar desde Sheets</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Destructive Action Confirmations */}
          {confirmAction && (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  {confirmAction === 'sync'
                    ? '¿Confirmás exportar a Google Sheets?'
                    : '¿Confirmás importar desde Google Sheets?'}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                {confirmAction === 'sync'
                  ? `Se actualizará la hoja unificada 'Base de Datos' en la planilla con todos los registros actuales (${db.reportes.length} tickets, ${db.movimientos.length} movimientos).`
                  : 'Se reemplazarán los datos locales actuales de la aplicación con los registros encontrados en tu Google Sheet.'}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-neutral-300 dark:border-neutral-600 hover:bg-white dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAction === 'sync' ? handleConfirmSync : handleConfirmImport}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 cursor-pointer shadow-xs"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-center justify-between text-[11px] text-neutral-500">
          <div>
            {lastSync ? (
              <span>Última sincronización: <strong>{lastSync}</strong></span>
            ) : (
              <span>Sin sincronización reciente</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
