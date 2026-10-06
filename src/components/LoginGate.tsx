import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Boxes, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginGateProps {
  onLoginSuccess: (user: string) => void;
  isDarkMode: boolean;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('Franco');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Required user: Franco, password: Mecano1234
    if (cleanUser === 'franco' && cleanPass === 'Mecano1234') {
      try {
        localStorage.setItem('tickets_stock_session', 'Franco');
      } catch (err) {
        console.error(err);
      }
      onLoginSuccess('Franco');
    } else {
      setIsSubmitting(false);
      setError('Credenciales incorrectas. Verificá tu usuario y contraseña.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-900 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm mb-1">
            <Boxes className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            Tickets de Stock
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Ingreso restringido para control de inventario y movimientos
          </p>
        </div>

        {/* Security badge info */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-750 border border-neutral-200/80 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Acceso seguro protegido por credenciales autorizadas.</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Usuario
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-hidden transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-hidden transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username || !password}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Iniciar sesión</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          Mecano Tools • Sistema de tickets y movimientos de stock
        </div>
      </div>
    </div>
  );
};
