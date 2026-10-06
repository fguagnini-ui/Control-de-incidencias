import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { StockMovement } from '../types/stock';

interface DeleteMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: StockMovement | null;
  onConfirmDelete: (movementId: string) => void;
}

export const DeleteMovementModal: React.FC<DeleteMovementModalProps> = ({
  isOpen,
  onClose,
  movement,
  onConfirmDelete
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  if (!isOpen || !movement) return null;

  const isMatched = confirmationInput.trim() === movement.id;

  const handleDelete = () => {
    if (!isMatched) return;
    onConfirmDelete(movement.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-800 rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-extrabold text-neutral-900 dark:text-white">
              Borrar movimiento {movement.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Vas a anular el movimiento confirmado <strong className="font-mono text-neutral-900 dark:text-white">{movement.id}</strong>.
            Los reportes vinculados (<span className="font-mono">{Array.from(new Set(movement.lineas.map((l) => l.pid))).join(', ')}</span>) volverán
            a quedar pendientes de resolver. Esta acción no se puede deshacer.
          </p>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Para confirmar, escribí <span className="font-mono font-bold text-neutral-900 dark:text-white">{movement.id}</span>:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={movement.id}
              className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isMatched}
            onClick={handleDelete}
            className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
          >
            Borrar movimiento
          </button>
        </div>
      </div>
    </div>
  );
};
