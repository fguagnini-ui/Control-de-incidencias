import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { ReportStatus } from '../types/stock';

interface StatusButtonProps {
  status: ReportStatus;
  onChange?: (newStatus: ReportStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

interface StatusConfig {
  label: ReportStatus;
  description: string;
  dotClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const STATUS_CONFIG: Record<ReportStatus, StatusConfig> = {
  Abierto: {
    label: 'Abierto',
    description: 'Pendiente de gestión o revisión',
    dotClass: 'bg-sky-500',
    bgClass: 'bg-sky-50 dark:bg-sky-950/50',
    borderClass: 'border-sky-300 dark:border-sky-700',
    textClass: 'text-sky-800 dark:text-sky-200'
  },
  Notificado: {
    label: 'Notificado',
    description: 'Comunicado a responsable / cliente',
    dotClass: 'bg-orange-500',
    bgClass: 'bg-orange-50 dark:bg-orange-950/50',
    borderClass: 'border-orange-300 dark:border-orange-700',
    textClass: 'text-orange-800 dark:text-orange-200'
  },
  'En revisión': {
    label: 'En revisión',
    description: 'Verificando stock o documentación',
    dotClass: 'bg-yellow-500',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/50',
    borderClass: 'border-yellow-300 dark:border-yellow-700',
    textClass: 'text-yellow-800 dark:text-yellow-200'
  },
  Cerrado: {
    label: 'Cerrado',
    description: 'Movimiento confirmado o resuelto',
    dotClass: 'bg-emerald-500',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    textClass: 'text-emerald-800 dark:text-emerald-200'
  },
  Cancelado: {
    label: 'Cancelado',
    description: 'Desestimado o cancelado',
    dotClass: 'bg-rose-500',
    bgClass: 'bg-rose-50 dark:bg-rose-950/50',
    borderClass: 'border-rose-300 dark:border-rose-700',
    textClass: 'text-rose-800 dark:text-rose-200'
  }
};

const ALL_STATUSES: ReportStatus[] = ['Abierto', 'Notificado', 'En revisión', 'Cerrado', 'Cancelado'];

export const StatusButton: React.FC<StatusButtonProps> = ({
  status,
  onChange,
  disabled = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = STATUS_CONFIG[status] || STATUS_CONFIG['Abierto'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (s: ReportStatus) => {
    if (onChange && s !== status) {
      onChange(s);
    }
    setIsOpen(false);
  };

  const isInteractive = Boolean(onChange) && !disabled;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        disabled={!isInteractive}
        onClick={() => isInteractive && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1.5 rounded-full border transition-all select-none
          ${current.bgClass} ${current.borderClass} ${current.textClass}
          ${size === 'sm' ? 'px-2.5 py-0.5 text-xs font-semibold' : 'px-3 py-1 text-xs font-bold'}
          ${isInteractive ? 'cursor-pointer hover:shadow-xs active:scale-[0.98]' : 'cursor-default opacity-90'}
          focus-visible:outline-2 focus-visible:outline-sky-500`}
        title={isInteractive ? 'Clic para cambiar estado' : `Estado: ${current.label}`}
      >
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${current.dotClass}`} />
        <span className="whitespace-nowrap font-bold">{current.label}</span>
        {isInteractive && (
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Cambiar estado
          </div>
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const isSelected = s === status;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/60 cursor-pointer
                  ${isSelected ? 'bg-neutral-50 dark:bg-neutral-700/40 font-bold text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotClass}`} />
                  <div className="truncate">
                    <div className="font-bold leading-tight">{cfg.label}</div>
                    <div className="text-[11px] text-neutral-400 dark:text-neutral-400 font-normal truncate">
                      {cfg.description}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
