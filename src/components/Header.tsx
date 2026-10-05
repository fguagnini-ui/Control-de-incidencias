import React from 'react';
import { ArrowDownToLine, Plus, Sun, Moon, Boxes, LogOut, User } from 'lucide-react';
import { ReportType } from '../types/stock';

interface HeaderProps {
  currentTab: 'reportes' | 'resolver' | 'database';
  onTabChange: (tab: 'reportes' | 'resolver' | 'database') => void;
  onOpenNewReport: (type?: ReportType | null) => void;
  pendingCount: number;
  totalReportsCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenNewReport,
  pendingCount,
  totalReportsCount,
  isDarkMode,
  onToggleDarkMode,
  currentUser,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        {/* Top row on mobile / Left group on desktop: Brand and Mobile Action controls */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          {/* Brand Wordmark Zone */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <button
              type="button"
              onClick={() => onTabChange('reportes')}
              className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 hover:opacity-90 text-left cursor-pointer"
            >
              Tickets de Stock
            </button>
          </div>

          {/* Mobile-only right actions */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <button
              type="button"
              onClick={() => onOpenNewReport(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Alternar modo oscuro"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Center */}
        <nav className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => onTabChange('reportes')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'reportes'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <span>Tickets</span>
            {totalReportsCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                {totalReportsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('resolver')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              currentTab === 'resolver'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <span>Resolver</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('database')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'database'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <span>Base de datos</span>
          </button>
        </nav>

        {/* Desktop-only Right Actions Zone */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Quick Ingreso Button */}
          <button
            type="button"
            onClick={() => onOpenNewReport('ingreso')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
            title="Registrar ingreso de mercadería con uno o varios SKUs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>+ Ingreso (+)</span>
          </button>

          {/* Main Primary Button */}
          <button
            type="button"
            onClick={() => onOpenNewReport(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo reporte</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Alternar modo oscuro"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User profile & logout */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-200 dark:border-neutral-700">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <User className="w-3.5 h-3.5 text-neutral-500" />
                <span>{currentUser}</span>
              </span>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
