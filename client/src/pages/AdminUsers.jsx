import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/admin/users');
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to retrieve user registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleToggle = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMessage = targetUser.role === 'admin'
      ? `Revoke administrative privileges from ${targetUser.email}?`
      : `Promote ${targetUser.email} to System Architect (Admin)?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoadingId(targetUser._id);
      await apiRequest(`/admin/users/${targetUser._id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      setNotice(`User ${targetUser.email} role updated to ${newRole.toUpperCase()}.`);
      fetchUsers();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(`Role update failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (String(targetUser._id) === String(currentUser?._id)) {
      alert('You cannot delete your own administrative account.');
      return;
    }

    if (!window.confirm(`Permanently delete account for ${targetUser.email}? All active sessions will be terminated.`)) return;

    try {
      setActionLoadingId(targetUser._id);
      await apiRequest(`/admin/users/${targetUser._id}`, { method: 'DELETE' });
      setNotice(`Account ${targetUser.email} permanently removed.`);
      fetchUsers();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const listenerCount = users.length - adminCount;

  return (
    <main className="flex-1 h-full overflow-y-auto px-4 pb-36 pt-24 md:ml-80 md:px-8 md:pt-28 text-white scroll-smooth">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Access Governance</p>
            </div>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">User & Security Governance</h2>
            <p className="mt-1 text-sm text-slate-400">
              Audit registered listeners, assign administrative superpowers, and manage cryptographic token identities.
            </p>
          </div>
        </div>

        {notice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Identity & Role Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Registered Identifiers
            </span>
            <span className="text-3xl font-extrabold font-mono text-white">{users.length}</span>
            <p className="text-[11px] text-slate-400 mt-1">Total account credentials stored in MongoDB Atlas</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
              System Architects
            </span>
            <span className="text-3xl font-extrabold font-mono text-rose-400">{adminCount}</span>
            <p className="text-[11px] text-slate-400 mt-1">Full-privilege master console operators</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Standard Listeners
            </span>
            <span className="text-3xl font-extrabold font-mono text-cyan-400">{listenerCount}</span>
            <p className="text-[11px] text-slate-400 mt-1">Audiophile listeners & WebRTC jam participants</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
          <div className="relative w-full sm:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter users by email address..."
              className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>Matching: <strong className="text-cyan-400">{filteredUsers.length}</strong></span>
          </div>
        </div>

        {/* Users Table */}
        <section className="glass-panel rounded-2xl border border-white/10 bg-[#0e0c15]/80 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400 animate-pulse">
              <span className="material-symbols-outlined text-4xl mb-2">sync</span>
              <p className="text-sm">Retrieving user credentials from Atlas...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">person_off</span>
              <p className="text-sm">No accounts found matching search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-white/5 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">User Identity</th>
                    <th className="px-5 py-3.5 font-semibold">Security Role</th>
                    <th className="px-5 py-3.5 font-semibold">Registration Date</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredUsers.map((u) => {
                    const isSelf = String(u._id) === String(currentUser?._id);
                    const isAdmin = u.role === 'admin';
                    const isRoot = u.email === 'admin@riveria.com';
                    const isBusy = actionLoadingId === u._id;

                    return (
                      <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center font-bold text-white text-sm shadow-[0_0_10px_rgba(208,188,255,0.2)]">
                              {(u.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm flex items-center gap-2">
                                <span>{u.email}</span>
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                                    YOU
                                  </span>
                                )}
                              </p>
                              <p className="text-slate-500 font-mono text-[11px]">ID: {u._id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-bold uppercase tracking-wider font-mono shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium tracking-wide font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                              <span>Listener</span>
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono text-slate-400">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Legacy account'}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-emerald-400 flex items-center gap-1.5 font-mono text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Active</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Role toggle button */}
                            <button
                              onClick={() => handleRoleToggle(u)}
                              disabled={isBusy || (isAdmin && isRoot)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                isAdmin
                                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'
                                  : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                              }`}
                              title={isAdmin ? 'Demote to standard listener' : 'Grant administrative superpowers'}
                            >
                              {isAdmin ? 'Demote' : 'Promote Admin'}
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isBusy || isSelf || isRoot}
                              className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isSelf ? 'Cannot delete self' : isRoot ? 'Root admin protected' : 'Delete user account'}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
