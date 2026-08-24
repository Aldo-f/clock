import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GenerationLog } from '../../types';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, Sparkles, Clock, Zap } from 'lucide-react';

export const GenerationLogsView: React.FC = () => {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/admin/generation-logs');
      if (!res.ok) throw new Error('Kon logs niet laden.');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              AI-generatie & waterfall-telemetrie
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realtime inzicht in alle gegenereerde klokken, waterfall fallback cascades, latency en foutafhandeling.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Vernieuwen</span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Logs inladen...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nog geen generatieverzoeken vastgelegd.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tijdstip</th>
                  <th className="py-3.5 px-4">Prompt</th>
                  <th className="py-3.5 px-4">Provider & Model</th>
                  <th className="py-3.5 px-4">Waterfall Stap</th>
                  <th className="py-3.5 px-4">Duur</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-white font-sans text-xs max-w-xs truncate" title={log.prompt}>
                      "{log.prompt}"
                    </td>
                    <td className="py-3 px-4 text-indigo-300 text-[11px]">
                      <span className="font-semibold text-slate-200">{log.providerNameUsed}</span>
                      {log.modelUsed && <span className="text-slate-500 ml-1">({log.modelUsed})</span>}
                    </td>
                    <td className="py-3 px-4">
                      {log.isFallback ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                          Lokale Fallback Engine
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-sans">
                          Stap {log.waterfallStepIndex || 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {log.durationMs}ms
                    </td>
                    <td className="py-3 px-4">
                      {log.success ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Succes</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-red-400 text-[11px] font-sans" title={log.error}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Mislukt</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
