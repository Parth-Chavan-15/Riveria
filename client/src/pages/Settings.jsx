import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';

export default function Settings() {
  const { user, logout } = useAuth();
  const { localTracks } = usePlayer();
  const [streamQuality, setStreamQuality] = useState(() => localStorage.getItem('reveria:streamQuality') || 'lossless');
  const [latencyMode, setLatencyMode] = useState(() => localStorage.getItem('reveria:latencyMode') || 'ultra-low');
  const [normalizeVolume, setNormalizeVolume] = useState(() => {
    const stored = localStorage.getItem('reveria:normalizeVolume');
    return stored !== null ? stored === 'true' : true;
  });
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = () => {
    localStorage.setItem('reveria:streamQuality', streamQuality);
    localStorage.setItem('reveria:latencyMode', latencyMode);
    localStorage.setItem('reveria:normalizeVolume', String(normalizeVolume));
    setSavedMessage('Settings successfully updated and saved to device.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-32 pt-24 md:ml-80 md:px-8 md:pt-28 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Engine Configuration</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">System Settings</h2>
          <p className="mt-1 text-sm text-slate-400">Configure playback engine preferences, local sync thresholds, and WebRTC jam parameters.</p>
        </div>

        {/* Audio Engine Quality */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-primary text-xl">tune</span>
            <h3 className="font-bold text-lg text-white">Audio Stream & Playback Engine</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="quality-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Streaming Resolution</label>
              <select
                id="quality-select"
                value={streamQuality}
                onChange={(e) => setStreamQuality(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary transition-colors"
              >
                <option value="lossless">Lossless Direct Stream (Original / FLAC / WAV)</option>
                <option value="high">High Fidelity (320 kbps MP3/AAC)</option>
                <option value="balanced">Data Saver (160 kbps)</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">HTTP byte-range seeking is active for instant scrub across chunked tracks.</p>
            </div>

            <div>
              <label htmlFor="latency-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">WebRTC Buffer Mode</label>
              <select
                id="latency-select"
                value={latencyMode}
                onChange={(e) => setLatencyMode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary transition-colors"
              >
                <option value="ultra-low">Zero-Latency Jam (Unbuffered direct)</option>
                <option value="adaptive">Adaptive Jitter Guard (50ms buffer)</option>
                <option value="high-stability">High-Stability Sync (200ms buffer)</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">Direct peer-to-peer data channels keep listeners in sync.</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Dynamic Volume Normalization</p>
              <p className="text-xs text-slate-400">Prevent abrupt volume spikes when transitioning between cloud and local tracks.</p>
            </div>
            <button
              type="button"
              onClick={() => setNormalizeVolume(!normalizeVolume)}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${normalizeVolume ? 'bg-primary' : 'bg-white/20'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-black transition-transform ${normalizeVolume ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </section>

        {/* Local Sync & Privacy */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-secondary text-xl">shield</span>
            <h3 className="font-bold text-lg text-white">Local Sync & Device Storage Sandbox</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-primary font-mono">{localTracks.length}</p>
              <p className="text-xs text-slate-400 mt-1">Mounted Tracks in RAM</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-emerald-400 font-mono">0 Bytes</p>
              <p className="text-xs text-slate-400 mt-1">Local Audio Sent to Server</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-secondary font-mono">Isolated</p>
              <p className="text-xs text-slate-400 mt-1">Browser Sandbox State</p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Local Sync Hub tracks are mounted exclusively through browser memory Object URLs. When you close or refresh this tab, browser resources are automatically released.
          </p>
        </section>

        {/* Account & Session Identity */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
            <h3 className="font-bold text-lg text-white">Active Session Identity</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{user?.email || 'Authenticated User'}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Role: <span className="text-primary font-semibold uppercase">{user?.role || 'standard'}</span> • Session Storage Auth</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all active:scale-95"
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* Save button and feedback */}
        <div className="flex items-center justify-between pt-2">
          {savedMessage ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 animate-pulse">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {savedMessage}
            </p>
          ) : <div></div>}
          <button
            onClick={handleSave}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-black hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(208,188,255,0.4)] active:scale-95"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </main>
  );
}
