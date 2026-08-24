import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  User as UserIcon,
  Trash2,
  Lock,
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Key,
  X
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser, authFetch } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create User Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Reset Modal
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/admin/users');
      if (!res.ok) throw new Error('Kon gebruikers niet laden.');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Fout bij ophalen gebruikers.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    try {
      setIsSubmitting(true);
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          email: newEmail.trim() || undefined,
          role: newRole
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Aanmaken mislukt.');
      }

      showNotification('success', `Gebruiker "${newUsername}" succesvol aangemaakt!`);
      setIsCreateModalOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewRole('user');
      loadUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRole = async (targetUser: User) => {
    const newRole: UserRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (
      targetUser.id === currentUser?.id &&
      !window.confirm('Weet je zeker dat je je eigen admin-rol wilt intrekken?')
    ) {
      return;
    }

    try {
      const res = await authFetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Rol wijzigen mislukt.');

      showNotification('success', `Rol van ${targetUser.username} gewijzigd naar ${newRole}.`);
      loadUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      showNotification('error', 'Je kunt je eigen account niet deactiveren.');
      return;
    }

    try {
      const res = await authFetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !targetUser.isActive })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Status wijzigen mislukt.');

      showNotification(
        'success',
        `Status van ${targetUser.username} gewijzigd naar ${!targetUser.isActive ? 'Actief' : 'Gedeactiveerd'}.`
      );
      loadUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUserId || !newResetPassword) return;

    try {
      const res = await authFetch(`/api/admin/users/${resettingUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newResetPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Wachtwoord reset mislukt.');

      showNotification('success', 'Wachtwoord succesvol opnieuw ingesteld.');
      setResettingUserId(null);
      setNewResetPassword('');
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      showNotification('error', 'Je kunt je eigen admin-account niet verwijderen.');
      return;
    }
    if (!window.confirm(`Weet je zeker dat je gebruiker "${targetUser.username}" wilt verwijderen?`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/admin/users/${targetUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Verwijderen mislukt.');

      showNotification('success', `Gebruiker "${targetUser.username}" verwijderd.`);
      loadUsers();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2 text-sm font-medium">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Gebruikersbeheer & Rollen
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Overzicht van geregistreerde gebruikers, beheer van administrator-rechten en toegangsstatus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Zoek gebruiker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nieuwe Gebruiker Aanmaken</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Gebruikers inladen...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Gebruiker</th>
                  <th className="py-3.5 px-4">E-mail</th>
                  <th className="py-3.5 px-4">Rol</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Aangemaakt</th>
                  <th className="py-3.5 px-4 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                        {u.role === 'admin' ? (
                          <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <span>{u.username}</span>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono">
                          (Jij)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {u.email || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-medium text-[11px] border transition-colors ${
                          u.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Klik om rol te wijzigen"
                      >
                        {u.role === 'admin' ? (
                          <Shield className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <UserIcon className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{u.role === 'admin' ? 'Administrator' : 'Gebruiker'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-medium text-[11px] border transition-colors ${
                          u.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                        }`}
                      >
                        <span>{u.isActive ? 'Actief' : 'Gedeactiveerd'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setResettingUserId(u.id);
                          setNewResetPassword('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Wachtwoord opnieuw instellen"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Gebruiker verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE USER */}
      {/* ------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Nieuwe Gebruiker Aanmaken</h3>
            <p className="text-xs text-slate-400 mb-6">
              Voeg een nieuw lid of administrator toe aan het platform.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gebruikersnaam
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="bijv. john_doe"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mailadres <span className="text-slate-500 font-normal">(optioneel)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="john@voorbeeld.nl"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Wachtwoord
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimaal 6 tekens"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="user">Gebruiker (standaard)</option>
                  <option value="admin">Administrator (volledig beheer)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Aanmaken...' : 'Gebruiker Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RESET PASSWORD */}
      {/* ------------------------------------------------------------- */}
      {resettingUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setResettingUserId(null)}
        >
          <div
            className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setResettingUserId(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Wachtwoord Resetten</h3>
            <p className="text-xs text-slate-400 mb-4">
              Stel een nieuw wachtwoord in voor deze gebruiker.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nieuw Wachtwoord
                </label>
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Voer nieuw wachtwoord in..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUserId(null)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                >
                  Wachtwoord Bijwerken
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
