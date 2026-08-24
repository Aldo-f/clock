import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LogIn, UserPlus, X, Shield, Lock, User as UserIcon, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, login, register } = useAuth();
  const { t } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (authModalMode === 'login') {
        const res = await login(username.trim(), password);
        if (!res.success) {
          setError(res.error || 'Inloggen mislukt.');
        }
      } else {
        const res = await register(username.trim(), password, email.trim() || undefined);
        if (!res.success) {
          setError(res.error || 'Registratie mislukt.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdminLogin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={() => setIsAuthModalOpen(false)}
    >
      <div
        id="auth-modal-card"
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="auth-modal-close-btn"
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {authModalMode === 'login' ? 'Inloggen bij Clocky' : 'Nieuw Account Aanmaken'}
            </h2>
            <p className="text-xs text-slate-400">
              {authModalMode === 'login'
                ? 'Toegang tot gepersonaliseerde klokken en beheer'
                : 'Meld je aan om je eigen klokontwerpen te publiceren'}
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
          <button
            id="auth-tab-login"
            type="button"
            onClick={() => {
              setAuthModalMode('login');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition-all ${
              authModalMode === 'login'
                ? 'bg-slate-800 text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Inloggen</span>
          </button>
          <button
            id="auth-tab-register"
            type="button"
            onClick={() => {
              setAuthModalMode('register');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 py-2 text-sm font-medium rounded-lg transition-all ${
              authModalMode === 'register'
                ? 'bg-slate-800 text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registreren</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gebruikersnaam
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id="auth-input-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="bijv. admin of klokkenmaker"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {authModalMode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mailadres <span className="text-slate-500 font-normal">(optioneel)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id="auth-input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Wachtwoord
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id="auth-input-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : authModalMode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Inloggen</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Account registreren</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Admin Test Hint */}
        {authModalMode === 'login' && (
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-2">Standaard beheerder account:</p>
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-mono text-indigo-300 transition-colors"
            >
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>Vul 'admin / admin123' in</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
