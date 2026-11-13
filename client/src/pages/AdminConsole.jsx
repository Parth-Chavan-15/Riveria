import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function AdminConsole() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [broadcastLevel, setBroadcastLevel] = useState('info');
  const [broadcastStatus, setBroadcastStatus] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await apiRequest('/admin/metrics');
      setMetrics(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch engine telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 8000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!announcement.trim()) return;

    try {
      setBroadcastStatus('Broadcasting across mesh...');
      await apiRequest('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message: announcement, level: broadcastLevel })
      });
      setBroadcastStatus('Announcement broadcasted successfully to all active peers!');
      setAnnouncement('');
      setTimeout(() => setBroadcastStatus(''), 4000);
    } catch (err) {
      setBroadcastStatus(`Broadcast failed: ${err.message}`);
    }
  };

  const handleTerminateRoom = async (roomId) => {
    if (!window.confirm(`Force terminate WebRTC listening jam room ${roomId.toUpperCase()}?`)) return;

    try {
      await apiRequest(`/admin/terminate-room/${roomId}`, { method: 'POST' });
      setActionNotice(`Room ${roomId.toUpperCase()} terminated and peers evicted.`);
      fetchMetrics();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      setActionNotice(`Termination failed: ${err.message}`);
    }
  };

  const handlePurgeServerCache = async () => {
    try {
      await apiRequest('/admin/purge-cache', { method: 'POST' });
      setActionNotice('Server audio buffers and memory caches purged.');
      fetchMetrics();
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      setActionNotice(`Purge failed: ${err.message}`);
    }
  };

  return (
    <main className="flex-1 h-full overflow-y-auto px-4 pb-36 pt-24 md:ml-80 md:px-8 md:pt-28 text-white scroll-smooth">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">Master Governance</p>
            </div>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Engine Console & Mesh Telemetry</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                ARCHITECT ROOT
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Live operational metrics, active WebRTC listening jams, system resource utilization, and emergency overrides.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePurgeServerCache}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">cleaning_services</span>
              <span>Purge Caches</span>
            </button>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(208,188,255,0.4)] active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{actionNotice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Real-Time Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Active Jams</span>
              <span className="material-symbols-outlined text-emerald-400 text-lg">settings_input_antenna</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-white">
                {metrics?.mesh?.activeRoomCount ?? '--'}
              </span>
              <span className="text-xs text-emerald-400 font-mono">
                {metrics?.mesh?.connectedPeersCount ?? 0} peers
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Active WebRTC P2P mesh sessions</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Heap Allocation</span>
              <span className="material-symbols-outlined text-primary text-lg">memory</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-white">
                {metrics?.system?.memory?.heapUsedMB ?? '--'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {metrics?.system?.memory?.heapTotalMB ?? '--'} MB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Node.js V8 runtime memory</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Database Cluster</span>
              <span className="material-symbols-outlined text-cyan-400 text-lg">database</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-400 uppercase">
                {metrics?.database?.status ?? 'Connected'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 truncate" title={metrics?.database?.host}>
              {metrics?.database?.host || 'MongoDB Atlas'}
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Catalog & Storage</span>
              <span className="material-symbols-outlined text-amber-400 text-lg">library_music</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-white">
                {metrics?.catalog?.trackCount ?? '--'}
              </span>
              <span className="text-xs text-amber-400 font-mono">
                {metrics?.catalog?.totalStorageMB ?? 0} MB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Mounted GridFS master audio</p>
          </div>
        </div>

        {/* Global Mesh Broadcast Console */}
        <section className="glass-panel p-6 rounded-2xl border border-white/10 bg-[#0e0c15]/80 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <span className="material-symbols-outlined text-rose-400 text-xl">campaign</span>
            <div>
              <h3 className="font-bold text-lg text-white">Real-Time Global Mesh Broadcast</h3>
              <p className="text-xs text-slate-400">Push instant notifications and audio stream advisories across all listening sessions</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. Server maintenance scheduled in 10 minutes. Audio sync remains uninterrupted."
              className="flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-400 transition-colors"
            />
            <select
              value={broadcastLevel}
              onChange={(e) => setBroadcastLevel(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-rose-400 transition-colors"
            >
              <option value="info">Info Advisory</option>
              <option value="warning">System Warning</option>
              <option value="urgent">Urgent Overhaul</option>
            </select>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 text-white text-xs uppercase tracking-wider font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95"
            >
              Broadcast
            </button>
          </form>

          {broadcastStatus && (
            <p className="text-xs font-mono text-emerald-400 animate-pulse">{broadcastStatus}</p>
          )}
        </section>

        {/* Active WebRTC Jam Sessions Table */}
        <section className="glass-panel p-6 rounded-2xl border border-white/10 bg-[#0e0c15]/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-xl">hub</span>
              <div>
                <h3 className="font-bold text-lg text-white">Live WebRTC Jam Sessions</h3>
                <p className="text-xs text-slate-400">Decentralized P2P mesh topologies and connected listener peers</p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {metrics?.mesh?.rooms?.length || 0} Rooms Active
            </span>
          </div>

          {metrics?.mesh?.rooms?.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">wifi_off</span>
              <p className="text-sm">No listening jam rooms currently active.</p>
              <p className="text-xs text-slate-500 mt-1">Sessions appear here immediately when listeners join a room.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-white/5 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Room Code</th>
                    <th className="px-4 py-3 font-semibold">Peers Connected</th>
                    <th className="px-4 py-3 font-semibold">Mesh Listener Identities</th>
                    <th className="px-4 py-3 font-semibold">Queue Size</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {metrics?.mesh?.rooms?.map((room) => (
                    <tr key={room.roomId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-bold text-primary">
                        {room.roomId.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">
                        {room.peerCount} peers
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-xs" title={room.peers?.map(p => p.email).join(', ')}>
                        {room.peers?.map(p => p.email || p.peerId).join(', ') || 'Anonymous mesh nodes'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {room.playlistCount} tracks
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleTerminateRoom(room.roomId)}
                          className="px-3 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all active:scale-95"
                        >
                          Terminate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Runtime Environment Specs */}
        <section className="glass-panel p-6 rounded-2xl border border-white/10 bg-[#0e0c15]/80 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <span className="material-symbols-outlined text-slate-400 text-xl">terminal</span>
            <h3 className="font-bold text-lg text-white">System Runtime & Node Architecture</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-500 block">Node.js Engine</span>
              <span className="text-white font-bold">{metrics?.system?.nodeVersion || 'v22.x'}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-500 block">Host Platform</span>
              <span className="text-white font-bold truncate block">{metrics?.system?.platform || 'Linux / Vercel Edge'}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-500 block">CPU Virtual Cores</span>
              <span className="text-white font-bold">{metrics?.system?.cpuCount || 'Multi-core'}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-500 block">Daemon Uptime</span>
              <span className="text-white font-bold">{Math.floor((metrics?.system?.uptimeSeconds || 0) / 60)} minutes</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
