import { useState } from 'react';
import { useJam } from '../context/JamContext';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../services/api';

export default function WebRTCSession() {
  const player = usePlayer();
  const {
    roomId,
    setRoomId,
    joinedRoom,
    status,
    peersList,
    copied,
    collabPlaylist,
    showAddModal,
    setShowAddModal,
    availableCloudTracks,
    eventLogs,
    joinRoom,
    handleCreateRoom,
    handleLeaveRoom,
    handleAddCloudTrack,
    handleAddLocalTrack,
    handlePlayCollabTrack,
    copyRoomInvite
  } = useJam();

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [directorNotice, setDirectorNotice] = useState('');

  const handleForceSyncPeers = () => {
    if (!joinedRoom || !player.currentTrack) return;
    window.dispatchEvent(
      new CustomEvent('reveria:jam-action', {
        detail: {
          action: 'seek',
          track: player.currentTrack,
          isPlaying: player.isPlaying,
          position: player.position
        }
      })
    );
    setDirectorNotice('Acoustic Phase-Lock: High-priority sync broadcast delivered to all mesh peers.');
    setTimeout(() => setDirectorNotice(''), 4000);
  };

  const handleDirectorIntercom = async () => {
    const msg = prompt('Enter Director Intercom broadcast to beam across all mesh peers:');
    if (!msg || !msg.trim()) return;

    try {
      await apiRequest('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message: `[JAM DIRECT]: ${msg.trim()}`, level: 'info' })
      });
      setDirectorNotice(`Broadcast delivered: "${msg.trim()}"`);
      setTimeout(() => setDirectorNotice(''), 4000);
    } catch (e) {
      setDirectorNotice(`Broadcast failed: ${e.message}`);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-36 pt-24 md:ml-80 md:px-8 md:pt-28 text-white max-w-6xl">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">settings_input_antenna</span>
              Zero-Latency Jam Mesh &bull; P2P Encrypted
            </p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">WebRTC Listening Jam</h2>
            <p className="mt-1 text-sm text-slate-400">
              Listen together with friends in real time. Works across mobile phones, laptops, and tablets with sub-50ms synchronized audio.
            </p>
          </div>

          {!joinedRoom && (
            <button
              onClick={handleCreateRoom}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-purple-300 to-secondary px-5 py-3 font-bold text-black shadow-[0_0_20px_rgba(208,188,255,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              <span>Create Jam Room</span>
            </button>
          )}
        </div>

        {/* Room Join & Connected Console */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-[#09090c]/85">
          {!joinedRoom ? (
            <div className="space-y-4">
              <label htmlFor="room-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Enter Room Code
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="room-input"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                  placeholder="e.g. HAVEN-7824"
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-primary font-mono text-sm tracking-wider uppercase"
                />
                <button
                  onClick={() => joinRoom()}
                  className="rounded-xl bg-primary px-6 py-3 font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(208,188,255,0.3)]"
                >
                  Join Jam
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Connected Room</span>
                    <h3 className="text-xl md:text-2xl font-bold font-mono text-primary tracking-wider">{joinedRoom}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={copyRoomInvite}
                    className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-white/10 hover:border-primary transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">{copied ? 'done' : 'content_copy'}</span>
                    <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
                  </button>

                  <button
                    onClick={handleLeaveRoom}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span>Leave Room</span>
                  </button>
                </div>
              </div>

              {/* Admin Director Override Suite */}
              {isAdmin && joinedRoom && (
                <div className="p-4 rounded-2xl bg-[#140c1d] border border-rose-500/30 text-xs space-y-3 shadow-[0_0_25px_rgba(244,63,94,0.12)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-400 text-lg">admin_panel_settings</span>
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">WebRTC Jam Director Suite</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[9px] border border-rose-500/30">ROOT CONTROL</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Active Room: <strong>{joinedRoom}</strong> &bull; {peersList.length} Connected Mesh Nodes
                    </span>
                  </div>

                  {directorNotice && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>{directorNotice}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handleForceSyncPeers}
                      className="px-3 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">sync</span>
                      <span>Force Multi-Peer Acoustic Re-Sync</span>
                    </button>

                    <button
                      onClick={handleDirectorIntercom}
                      className="px-3 py-2 rounded-xl bg-white/10 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-white/15 active:scale-95 border border-white/10 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">campaign</span>
                      <span>Director Intercom Announcement</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sync Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Zero-Latency Real-Time Sync (Automated)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 font-mono">
                    {peersList.length} direct peer{peersList.length === 1 ? '' : 's'} linked in mesh
                  </span>
                  {player.currentTrack && (
                    <span className="truncate max-w-[200px] text-slate-300">
                      Now: <strong>{player.currentTrack.title}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <p aria-live="polite" className="mt-4 rounded-xl bg-black/30 border border-white/5 p-3 text-xs text-slate-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">info</span>
            <span>{status}</span>
          </p>
        </section>

        {/* 2. COLLABORATIVE SESSION PLAYLIST */}
        {joinedRoom && (
          <section className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl bg-[#09090c]/85">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">queue_music</span>
                <h3 className="font-bold text-base text-white">Collaborative Jam Playlist</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono text-primary font-bold">
                  {collabPlaylist.length}
                </span>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Add Track to Jam</span>
              </button>
            </div>

            <div className="space-y-2">
              {collabPlaylist.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-500">
                  <p className="text-xs">Collaborative Playlist is empty.</p>
                  <p className="text-[11px] mt-1 text-slate-600">
                    Click "Add Track to Jam" to queue cloud songs or local device audio with zero server logs.
                  </p>
                </div>
              ) : (
                collabPlaylist.map((item, idx) => {
                  const isPlayingThis = player.currentTrack?._id === item.id && player.isPlaying;

                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-slate-500 w-4 text-center">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                            <span>{item.title}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                item.type === 'Local'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              }`}
                            >
                              {item.type === 'Local' ? 'P2P Private' : 'Cloud Stream'}
                            </span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {item.artist} &bull; Added by {item.addedBy}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayCollabTrack(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isPlayingThis
                              ? 'bg-primary text-black font-bold shadow-[0_0_10px_rgba(208,188,255,0.4)]'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {isPlayingThis ? 'Playing' : 'Play for Room'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* 3. ADD TRACK MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-white/15 bg-[#0d0c13] shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h4 className="font-bold text-base text-white">Add Track to Collab Playlist</h4>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Local Mounted Tracks Tab & Direct Device Audio Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Private Local Device Tracks (P2P Encrypted, 0 Server Logs)
                  </h5>
                  <label
                    htmlFor="jam-local-file-picker"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">upload_file</span>
                    <span>Browse Device</span>
                  </label>
                  <input
                    id="jam-local-file-picker"
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.wav,.ogg,.aac,.flac,.m4a"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files?.length) {
                        await player.mountLocalFiles(e.target.files);
                      }
                    }}
                  />
                </div>

                {player.localTracks.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {player.localTracks.map((t) => (
                      <div
                        key={t._id}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10"
                      >
                        <div className="truncate max-w-[240px]">
                          <p className="text-xs font-medium text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-cyan-300/70 truncate">{t.artist || 'Local Device Audio'}</p>
                        </div>
                        <button
                          onClick={() => handleAddLocalTrack(t)}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold"
                        >
                          + Add P2P
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 text-center">
                    <p className="text-xs text-slate-300">No local tracks mounted on this device yet.</p>
                    <label
                      htmlFor="jam-local-file-picker"
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      <span>Pick Audio File from Device</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Cloud Tracks */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                  Cloud Library Tracks
                </h5>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {availableCloudTracks.map((t) => (
                    <div
                      key={t._id}
                      className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10"
                    >
                      <div className="truncate max-w-[240px]">
                        <p className="text-xs font-medium text-white truncate">{t.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.artist}</p>
                      </div>
                      <button
                        onClick={() => handleAddCloudTrack(t)}
                        className="px-2.5 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 text-xs font-semibold"
                      >
                        + Add Cloud
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SPLIT GRID: Active Peers & Live Session Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Peers (5 cols) */}
          <section className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-[360px] bg-[#09090c]/85">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">group</span>
                <h3 className="font-bold text-sm text-white">Active Peers ({peersList.length})</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">P2P Encrypted</span>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
              {peersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">wifi_find</span>
                  <p className="text-xs font-medium">No peers connected yet.</p>
                  <p className="text-[11px] mt-1 text-slate-600">
                    Open this room code on your phone or share it with a friend to begin synchronized listening.
                  </p>
                </div>
              ) : (
                peersList.map((id) => (
                  <div key={id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-mono font-bold">
                        {id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white truncate max-w-[140px] font-mono">
                          {id.startsWith('peer-') ? `peer_${id.slice(5, 13)}` : `peer_${id.slice(0, 8)}`}
                        </p>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Direct DataChannel Active
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => closePeer(id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Disconnect peer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Real-Time Session Telemetry Log (7 cols) */}
          <section className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-[360px] bg-[#09090c]/85">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg">terminal</span>
                <h3 className="font-bold text-sm text-white">Session Telemetry Log</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Live Stream</span>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 font-mono text-xs space-y-1.5 pr-1">
              {eventLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-slate-300 py-0.5">
                  <span className="text-slate-500 select-none">[{log.time}]</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      log.type === 'SYNC'
                        ? 'bg-secondary/20 text-secondary'
                        : log.type === 'JOIN'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : log.type === 'ERR'
                        ? 'bg-red-500/20 text-red-300'
                        : log.type === 'BROADCAST'
                        ? 'bg-primary/20 text-primary'
                        : log.type === 'QUEUE'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="flex-1 break-all text-slate-300">{log.message}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
