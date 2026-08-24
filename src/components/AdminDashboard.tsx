import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClockItem } from '../types';
import { AIProviderSettings } from './admin/AIProviderSettings';
import { ClockManagement } from './admin/ClockManagement';
import { UserManagement } from './admin/UserManagement';
import { GenerationLogsView } from './admin/GenerationLogsView';
import {
  Shield,
  Cpu,
  Clock,
  Users,
  Activity,
  Layers,
  Sparkles,
  Lock,
  ArrowLeft
} from 'lucide-react';

interface AdminDashboardProps {
  presetClocks: ClockItem[];
  onClocksUpdated?: () => void;
  onNavigateHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  presetClocks,
  onClocksUpdated,
  onNavigateHome
}) => {
  const { user, isAdmin, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'ai' | 'clocks' | 'users' | 'logs'>('ai');

  // If user is not an admin, display access denied view with easy login action
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-4 shadow-xl">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
          Administrator Toegang Vereist
        </h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Deze pagina is exclusief voor administrators om AI providers, model waterval-cascades,
          alle klokken en geregistreerde gebruikers te beheren.
        </p>
        <div className="flex items-center space-x-3">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Terug naar Galerij</span>
            </button>
          )}
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5"
          >
            <Shield className="w-4 h-4" />
            <span>Inloggen als Beheerder</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Admin Controlepaneel
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingelogd als <span className="text-indigo-400 font-semibold">{user?.username}</span> &bull; Volledig beheer van AI modellen, klokken en gebruikers
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 shadow-md overflow-x-auto max-w-full no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI & Waterfall</span>
          </button>

          <button
            onClick={() => setActiveTab('clocks')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'clocks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Klokken Beheer</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gebruikers</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Telemetrie</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'ai' && <AIProviderSettings />}
      {activeTab === 'clocks' && (
        <ClockManagement
          presetClocks={presetClocks}
          onClocksUpdated={onClocksUpdated}
        />
      )}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'logs' && <GenerationLogsView />}
    </div>
  );
};
