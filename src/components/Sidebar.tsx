import React from 'react';
import {
  Boxes,
  Plus,
  ArrowDownToLine,
  FileText,
  SlidersHorizontal,
  Database,
  Sun,
  Moon,
  LogOut,
  User,
  Github
} from 'lucide-react';
import { ReportType } from '../types/stock';

interface SidebarProps {
  currentTab: 'reportes' | 'gestion' | 'database';
  onTabChange: (tab: 'reportes' | 'gestion' | 'database') => void;
  onOpenNewReport: (type?: ReportType | null) => void;
  pendingCount: number;
  totalReportsCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser?: string;
  onLogout?: () => void;
  onOpenGitHubPagesModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewReport,
  pendingCount,
  totalReportsCount,
  isDarkMode,
  onToggleDarkMode,
  currentUser,
  onLogout,
  onOpenGitHubPagesModal
}) => {
  return (
    <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 h-screen sticky top-0 shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-4 lg:p-5 select-none z-30">
      {/* Top Section */}
      <div className="space-y-5">
        {/* 1. Identity: Icon and Title "Tickets de Stock" (subtitle: "Inventario & Movimientos") */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold shadow-md shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-neutral-900 dark:text-white leading-tight truncate">
              Tickets de Stock
            </h1>
            <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 truncate">
              Inventario & Movimientos
            </p>
          </div>
        </div>

        {/* 2. Creation Block (ARRIBA): Botón principal + Nuevo reporte */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenNewReport(null)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo reporte</span>
          </button>

          {/* Quick shortcut to add income */}
          <button
            type="button"
            onClick={() => onOpenNewReport('ingreso')}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>+ Ingreso de mercadería</span>
          </button>
        </div>

        {/* 3. Navigation:
            - Reportes (con contador total de tickets)
            - Gestión (IMPORTANTE: nunca llamarlo "Resolver"; debe incluir badge con cantidad de pendientes si > 0)
            - Base de datos
        */}
        <nav className="space-y-1.5 pt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 pb-1">
            Navegación
          </div>

          {/* Reportes */}
          <button
            type="button"
            onClick={() => onTabChange('reportes')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'reportes'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>Reportes</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                currentTab === 'reportes'
                  ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {totalReportsCount}
            </span>
          </button>

          {/* Gestión (NUNCA llamar "Resolver") */}
          <button
            type="button"
            onClick={() => onTabChange('gestion')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'gestion'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Gestión</span>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-amber-500 text-white shadow-xs">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Base de datos */}
          <button
            type="button"
            onClick={() => onTabChange('database')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'database'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4" />
              <span>Base de datos</span>
            </div>
          </button>

          {/* GitHub Pages & Sincronización */}
          {onOpenGitHubPagesModal && (
            <button
              type="button"
              onClick={onOpenGitHubPagesModal}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Github className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                <span>GitHub Pages</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold">
                Deploy
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Pie de barra lateral: Botón alternador de Modo Claro / Modo Oscuro + logout */}
      <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        {/* Modo Claro / Oscuro toggle button */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-750 transition-colors cursor-pointer"
          aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <div className="flex items-center gap-2">
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-neutral-600" />}
            <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
            {isDarkMode ? 'Oscuro' : 'Claro'}
          </span>
        </button>

        {/* User profile & logout */}
        {currentUser && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200/80 dark:border-neutral-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-200 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {currentUser}
                </div>
                <div className="text-[10px] text-neutral-400 truncate">
                  Sesión iniciada
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
