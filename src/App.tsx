import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StockDatabase, StockReport, StockMovement, ReportStatus, ReportType } from './types/stock';
import { loadDatabase, saveDatabase, pid } from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { MobileHeader, MobileBottomNav } from './components/MobileNav';
import { ReportsView } from './components/ReportsView';
import { GestionView } from './components/ResolveView';
import { DatabaseView } from './components/DatabaseView';
import { NewReportModal } from './components/NewReportModal';
import { ResolveModal } from './components/ResolveModal';
import { DeleteMovementModal } from './components/DeleteMovementModal';
import { ImportReportsModal } from './components/ImportReportsModal';
import { LoginGate } from './components/LoginGate';

export default function App() {
  const [db, setDb] = useState<StockDatabase>(() => loadDatabase());
  const [currentTab, setCurrentTab] = useState<'reportes' | 'gestion' | 'database'>('reportes');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModalType, setNewModalType] = useState<ReportType | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveIds, setResolveIds] = useState<string[]>([]);
  const [movementToDelete, setMovementToDelete] = useState<StockMovement | null>(null);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);

  // Database view deep-link state
  const [dbQuery, setDbQuery] = useState('');
  const [dbSubTab, setDbSubTab] = useState<'reportes' | 'movimientos'>('reportes');

  // Authentication state (user: Franco, pass: Mecano1234)
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem('tickets_stock_session');
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    try {
      localStorage.removeItem('tickets_stock_session');
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
  };

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Dark mode with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tickets_stock_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('tickets_stock_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('tickets_stock_theme', 'light');
      }
    } catch (e) {
      console.error(e);
    }
  }, [isDarkMode]);

  // Auto-save whenever db updates
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  // Computed reporters list for datalist auto-suggest
  const reporterNames = useMemo(() => {
    const set = new Set<string>(['Franco', 'Matías']);
    db.reportes.forEach((r) => r.reporta && set.add(r.reporta));
    db.movimientos.forEach((m) => m.resp && set.add(m.resp));
    return Array.from(set).filter(Boolean);
  }, [db]);

  // Pending count
  const pendingCount = useMemo(() => {
    return db.reportes.filter((r) => !r.mov && r.estado !== 'Cerrado' && r.estado !== 'Cancelado').length;
  }, [db.reportes]);

  // Handlers
  const handleOpenNewReport = (type?: ReportType | null) => {
    setNewModalType(type || null);
    setIsNewModalOpen(true);
  };

  const handleCreateReport = (data: Omit<StockReport, 'id' | 'fecha' | 'mov'>) => {
    const nextId = pid(db.np);
    const newReport: StockReport = {
      ...data,
      id: nextId,
      fecha: new Date().toISOString().slice(0, 10),
      mov: null
    };

    setDb((prev) => ({
      ...prev,
      np: prev.np + 1,
      reportes: [...prev.reportes, newReport]
    }));
    showToast(`Reporte ${nextId} creado con éxito`);
  };

  const handleStatusChange = (id: string, newStatus: ReportStatus) => {
    setDb((prev) => {
      const updated = prev.reportes.map((r) => {
        if (r.id === id) {
          return { ...r, estado: newStatus };
        }
        return r;
      });
      return { ...prev, reportes: updated };
    });
    showToast(`Estado actualizado: ${newStatus}`);
  };

  const handleOpenResolve = (ids: string[]) => {
    setResolveIds(ids);
    setIsResolveModalOpen(true);
  };

  const handleConfirmMovement = (movement: StockMovement) => {
    const resolvedReportIds = Array.from(new Set(movement.lineas.map((l) => l.pid).filter(Boolean)));
    setDb((prev) => {
      const nextMovements = [...prev.movimientos, movement];
      const nextReports = prev.reportes.map((r) => {
        if (resolvedReportIds.includes(r.id)) {
          return {
            ...r,
            estado: 'Cerrado' as ReportStatus,
            mov: movement.id
          };
        }
        return r;
      });
      return {
        ...prev,
        nm: prev.nm + 1,
        reportes: nextReports,
        movimientos: nextMovements
      };
    });
    showToast(`Movimiento ${movement.id} generado con éxito`);
  };

  const handleDeleteMovement = (movementId: string) => {
    setDb((prev) => {
      const nextReports = prev.reportes.map((r) => {
        if (r.mov === movementId) {
          return {
            ...r,
            mov: null,
            estado: 'Abierto' as ReportStatus
          };
        }
        return r;
      });
      const nextMovements = prev.movimientos.filter((m) => m.id !== movementId);
      return {
        ...prev,
        reportes: nextReports,
        movimientos: nextMovements
      };
    });
    setMovementToDelete(null);
    showToast(`Movimiento ${movementId} anulado`);
  };

  const handleResetExample = () => {
    if (window.confirm('¿Deseas restaurar la base de datos a los valores originales de database.json?')) {
      try {
        localStorage.removeItem('tickets_stock_v2');
      } catch {}
      setDb(loadDatabase());
      showToast('Base de datos restaurada');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('¿Seguro que deseas vaciar toda la base de datos? Se borrarán todos los reportes y movimientos.')) {
      const emptyDb: StockDatabase = {
        np: 1,
        nm: 1,
        reportes: [],
        movimientos: []
      };
      setDb(emptyDb);
      saveDatabase(emptyDb);
      showToast('Base de datos vaciada');
    }
  };

  const handleImportDatabase = (newDb: StockDatabase) => {
    setDb(newDb);
    saveDatabase(newDb);
    showToast(`Base de datos importada (${newDb.reportes.length} tickets, ${newDb.movimientos.length} movimientos)`);
  };

  const handleConfirmImportReports = (newReports: StockReport[]) => {
    setDb((prev) => {
      const nextReports = [...prev.reportes, ...newReports];
      const nextNp = prev.np + newReports.length;
      return {
        ...prev,
        np: nextNp,
        reportes: nextReports
      };
    });
    showToast(`${newReports.length} reportes importados con éxito`);
  };

  const handleExportReportsCsv = () => {
    const quote = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
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

    const rows: string[][] = [];
    db.reportes.forEach((r) => {
      const items = r.items && r.items.length > 0
        ? r.items
        : [{ sku: r.sku, desc: r.desc, cant: r.cant }];

      items.forEach((it) => {
        rows.push([
          r.tipo,
          r.fecha,
          r.reporta,
          it.sku,
          it.desc,
          String(it.cant || 1),
          r.trx || '',
          r.origen || '',
          r.causa || '',
          r.sol || '',
          r.estado || 'Abierto',
          r.ubicacion || ''
        ]);
      });
    });

    const csvContent = '\uFEFF' + [headers.map(quote).join(','), ...rows.map((row) => row.map(quote).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reportes_stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exportados ${db.reportes.length} reportes a CSV`);
  };

  const handleGoToReport = (reportId: string) => {
    setDbQuery(reportId);
    setDbSubTab('reportes');
    setCurrentTab('database');
  };

  const handleGoToMovement = (movementId: string) => {
    setDbQuery(movementId);
    setDbSubTab('movimientos');
    setCurrentTab('database');
  };

  if (!currentUser) {
    return (
      <LoginGate
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          showToast(`Bienvenido ${u}`);
        }}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-100/70 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
      {/* Toast Notification Banner */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-none ${
          toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
        }`}
      >
        <div className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-neutral-700 dark:border-neutral-200 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      </div>

      {/* 2. ESTRUCTURA DE NAVEGACIÓN Y LAYOUT:
          - Desktop (md:flex): Barra lateral izquierda permanente
          - Mobile (md:hidden): Cabecera superior y barra horizontal inferior
      */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab !== 'database') setDbQuery('');
          setCurrentTab(tab);
        }}
        onOpenNewReport={handleOpenNewReport}
        pendingCount={pendingCount}
        totalReportsCount={db.reportes.length}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <MobileHeader
        onOpenNewReport={handleOpenNewReport}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 min-w-0 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24 md:pb-8">
        {currentTab === 'reportes' && (
          <ReportsView
            reportes={db.reportes}
            onStatusChange={handleStatusChange}
            onGoToMovement={handleGoToMovement}
            onResolveSingle={(id) => handleOpenResolve([id])}
            onOpenNewReport={handleOpenNewReport}
            onOpenImportCsv={() => setIsImportCsvOpen(true)}
            onExportCsv={handleExportReportsCsv}
          />
        )}

        {currentTab === 'gestion' && (
          <GestionView
            reportes={db.reportes}
            movimientos={db.movimientos}
            onOpenResolve={handleOpenResolve}
            onGoToReport={handleGoToReport}
            onRequestDeleteMovement={(m) => setMovementToDelete(m)}
          />
        )}

        {currentTab === 'database' && (
          <DatabaseView
            reportes={db.reportes}
            movimientos={db.movimientos}
            onStatusChange={handleStatusChange}
            onGoToReport={handleGoToReport}
            onGoToMovement={handleGoToMovement}
            onRequestDeleteMovement={(m) => setMovementToDelete(m)}
            onResetExample={handleResetExample}
            onClearAll={handleClearAll}
            onImportDatabase={handleImportDatabase}
            onOpenImportCsv={() => setIsImportCsvOpen(true)}
            initialQuery={dbQuery}
            initialSubTab={dbSubTab}
          />
        )}
      </main>

      <MobileBottomNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab !== 'database') setDbQuery('');
          setCurrentTab(tab);
        }}
        pendingCount={pendingCount}
        totalReportsCount={db.reportes.length}
      />

      {/* Modals */}
      <NewReportModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateReport}
        nextIdNumber={db.np}
        initialType={newModalType}
        reporterNames={reporterNames}
      />

      <ResolveModal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        reportIds={resolveIds}
        allReports={db.reportes}
        nextMovementNumber={db.nm}
        reporterNames={reporterNames}
        onConfirm={handleConfirmMovement}
      />

      <DeleteMovementModal
        isOpen={Boolean(movementToDelete)}
        onClose={() => setMovementToDelete(null)}
        movement={movementToDelete}
        onConfirmDelete={handleDeleteMovement}
      />

      <ImportReportsModal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        nextReportNumber={db.np}
        currentUser={currentUser || 'Franco'}
        onConfirmImport={handleConfirmImportReports}
      />
    </div>
  );
}
