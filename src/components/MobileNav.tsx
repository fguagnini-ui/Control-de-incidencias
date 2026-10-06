import React from 'react';
import {
  Boxes,
  Plus,
  Sun,
  Moon,
  LogOut,
  FileText,
  SlidersHorizontal,
  Database
} from 'lucide-react';
import { ReportType } from '../types/stock';

interface MobileHeaderProps {
  onOpenNewReport: (type?: ReportType | null) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenNewReport,
  isDarkMode,
  onToggleDarkMode,
  onLogout
}) => {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3.5 py-2.5 flex items-center justify-between">
      {/* Icono y título */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold shadow-xs shrink-0">
          <Boxes className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-black tracking-tight text-neutral-900 dark:text-white">
            Tickets de Stock
          </h1>
          <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
            Inventario & Movimientos
          </p>
        </div>
      </div>

      {/* Shortcut y Modo Oscuro/Claro + Logout */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onOpenNewReport(null)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nuevo</span>
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Alternar modo oscuro"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

interface MobileBottomNavProps {
  currentTab: 'reportes' | 'gestion' | 'database';
  onTabChange: (tab: 'reportes' | 'gestion' | 'database') => void;
  pendingCount: number;
  totalReportsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  pendingCount,
  totalReportsCount
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 px-3 py-1.5 flex items-center justify-around shadow-lg">
      {/* Reportes */}
      <button
        type="button"
        onClick={() => onTabChange('reportes')}
        className={`flex-1 py-1.5 px-2 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
          currentTab === 'reportes'
            ? 'text-neutral-900 dark:text-white'
            : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <div className="relative">
          <FileText className="w-4 h-4" />
          {totalReportsCount > 0 && (
            <span className="absolute -top-1.5 -right-3 px-1 py-0.1 text-[9px] font-mono font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full">
              {totalReportsCount}
            </span>
          )}
        </div>
        <span>Reportes</span>
      </button>

      {/* Gestión */}
      <button
        type="button"
        onClick={() => onTabChange('gestion')}
        className={`flex-1 py-1.5 px-2 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
          currentTab === 'gestion'
            ? 'text-neutral-900 dark:text-white'
            : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <div className="relative">
          <SlidersHorizontal className="w-4 h-4" />
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-3 px-1.5 py-0.1 text-[9px] font-mono font-black bg-amber-500 text-white rounded-full animate-pulse">
              {pendingCount}
            </span>
          )}
        </div>
        <span>Gestión</span>
      </button>

      {/* Base de datos */}
      <button
        type="button"
        onClick={() => onTabChange('database')}
        className={`flex-1 py-1.5 px-2 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
          currentTab === 'database'
            ? 'text-neutral-900 dark:text-white'
            : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <Database className="w-4 h-4" />
        <span>Base de datos</span>
      </button>
    </nav>
  );
};
