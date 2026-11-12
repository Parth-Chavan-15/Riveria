import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { usePlayer } from '../hooks/usePlayer';
import { apiRequest, getAccessToken } from '../services/api';

const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

function getIceConfiguration() {
  try {
    if (import.meta.env.VITE_ICE_SERVERS) {
      const parsed = JSON.parse(import.meta.env.VITE_ICE_SERVERS);
      if (Array.isArray(parsed) && parsed.length) return { iceServers: parsed };
    }
  } catch {}
  return { iceServers: defaultIceServers };
}

export default function WebRTCSession() {
  const player = usePlayer();
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const tracksRef = useRef([]);
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [status, setStatus] = useState('Enter a room code to join or start an authenticated listening jam.');
  const [peersList, setPeersList] = useState([]);
  const [copied, setCopied] = useState(false);
  const [eventLogs, setEventLogs] = useState([
    { id: '1', time: new Date().toLocaleTimeString(), type: 'SYS', message: 'Aetheric WebRTC Signaling subsystem initialized.' }
  ]);

  const addLog = useCallback((type, message) => {
    setEventLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), type, message },
      ...prev.slice(0, 49)
    ]);
  }, []);

  const updatePeersState = useCallback(() => {
    setPeersList(Array.from(peersRef.current.keys()));
  }, []);

  useEffect(() => {
    apiRequest('/tracks')
      .then((tracks) => { tracksRef.current = tracks; })
      .catch(() => {});
  }, []);

  const handlePlayback = useCallback((payload) => {
    player.syncPlayback(payload, tracksRef.current);
    addLog('SYNC', `Playback synchronized with peer. Pos: ${Math.round(payload.position || 0)}s, State: ${payload.isPlaying ? 'Playing' : 'Paused'}`);
  }, [player, addLog]);

  const closePeer = useCallback((id) => {
    const peer = peersRef.current.get(id);
    peer?.channel?.close();
    peer?.connection?.close();
    peersRef.current.delete(id);
    updatePeersState();
    addLog('PEER', `Peer connection closed: ${id}`);
  }, [addLog, updatePeersState]);

  const createPeer = useCallback((peerId, initiator) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId);
    const connection = new RTCPeerConnection(getIceConfiguration());
    const peer = { connection, channel: null, pendingCandidates: [] };

    const registerChannel = (channel) => {
      peer.channel = channel;
      channel.onopen = () => {
        updatePeersState();
        setStatus(`Direct P2P data channel open with ${peersRef.current.size} peer(s).`);
        addLog('OPEN', `WebRTC data channel established directly with ${peerId}.`);
      };
      channel.onmessage = (event) => {
        try {
          handlePlayback(JSON.parse(event.data));
        } catch {}
      };
      channel.onclose = () => closePeer(peerId);
    };

    if (initiator) {
      registerChannel(connection.createDataChannel('riveria-playback', { ordered: false, maxRetransmits: 0 }));
    }
    connection.ondatachannel = (event) => registerChannel(event.channel);

    connection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('jam:signal', {
          targetId: peerId,
          signal: {
            type: 'candidate',
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          }
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(connection.connectionState)) {
        closePeer(peerId);
      }
    };

    peersRef.current.set(peerId, peer);
    updatePeersState();
    return peer;
  }, [closePeer, handlePlayback, addLog, updatePeersState]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      path: '/socket.io',
      auth: { token: getAccessToken() },
      reconnectionAttempts: 3,
      timeout: 4000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      addLog('NET', `Socket signaling online (ID: ${socket.id.slice(0, 8)}).`);
    });

    socket.on('connect_error', () => {
      setStatus('Jam connection failed. Sign in again and retry.');
      addLog('ERR', 'Socket signaling connection refused or token expired.');
    });

    socket.on('jam:peer-joined', ({ peerId, user: peerUser }) => {
      addLog('JOIN', `New peer joined room: ${peerUser?.email || peerId}. Starting negotiation...`);
      createPeer(peerId, true);
    });

    socket.on('jam:peer-left', ({ peerId }) => {
      addLog('LEAVE', `Peer left room: ${peerId}`);
      closePeer(peerId);
    });

    socket.on('jam:signal', async ({ fromId, signal }) => {
      const peer = createPeer(fromId, false);
      try {
        if (signal.type === 'offer') {
          await peer.connection.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
          while (peer.pendingCandidates?.length) {
            const candidate = peer.pendingCandidates.shift();
            await peer.connection.addIceCandidate(candidate).catch(() => {});
          }
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);
          socket.emit('jam:signal', { targetId: fromId, signal: { type: 'answer', sdp: answer.sdp } });
          addLog('SDP', `Answered offer from peer ${fromId.slice(0, 8)}.`);
        } else if (signal.type === 'answer') {
          await peer.connection.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
          while (peer.pendingCandidates?.length) {
            const candidate = peer.pendingCandidates.shift();
            await peer.connection.addIceCandidate(candidate).catch(() => {});
          }
          addLog('SDP', `Remote answer accepted from peer ${fromId.slice(0, 8)}.`);
        } else if (signal.type === 'candidate' && signal.candidate) {
          const candidateInit = { candidate: signal.candidate, sdpMid: signal.sdpMid, sdpMLineIndex: signal.sdpMLineIndex };
          if (peer.connection.remoteDescription && peer.connection.remoteDescription.type) {
            await peer.connection.addIceCandidate(candidateInit);
          } else {
            peer.pendingCandidates.push(candidateInit);
          }
        }
      } catch {
        setStatus('A peer connection could not be negotiated.');
        addLog('ERR', `Signaling negotiation error with peer ${fromId.slice(0, 8)}.`);
      }
    });

    socket.on('jam:playback', handlePlayback);

    const peers = peersRef.current;
    return () => {
      peers.forEach((_, id) => closePeer(id));
      socket.disconnect();
    };
  }, [closePeer, createPeer, handlePlayback, addLog]);

  const join = () => {
    const normalized = roomId.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,64}$/.test(normalized)) {
      return setStatus('Use 3–64 letters, numbers, underscores, or hyphens.');
    }
    socketRef.current?.emit('jam:join', { roomId: normalized }, async (result) => {
      if (!result?.ok) {
        setStatus(result?.error || 'Unable to join room.');
        addLog('ERR', `Failed to join room: ${result?.error}`);
        return;
      }
      setJoinedRoom(normalized);
      setStatus(`Connected to jam “${normalized}”. Handshaking with ${result.peers.length} active peer(s)…`);
      addLog('ROOM', `Joined jam room: "${normalized}" with ${result.peers.length} existing peer(s).`);

      for (const peerId of result.peers) {
        const peer = createPeer(peerId, true);
        const offer = await peer.connection.createOffer();
        await peer.connection.setLocalDescription(offer);
        socketRef.current?.emit('jam:signal', { targetId: peerId, signal: { type: 'offer', sdp: offer.sdp } });
        addLog('SDP', `Dispatched offer to peer ${peerId.slice(0, 8)}.`);
      }
    });
  };

  const broadcastPlayback = () => {
    if (!joinedRoom || !player.currentTrack) {
      return setStatus('Join a room and start playing a track first.');
    }
    const payload = {
      roomId: joinedRoom,
      trackId: player.currentTrack._id,
      position: player.position,
      isPlaying: player.isPlaying,
      sentAt: Date.now()
    };
    peersRef.current.forEach(({ channel }) => {
      if (channel?.readyState === 'open') {
        channel.send(JSON.stringify(payload));
      }
    });
    socketRef.current?.emit('jam:playback', payload);
    setStatus(`Broadcast playback sync for “${player.currentTrack.title}” across ${peersList.length} direct peer(s).`);
    addLog('BROADCAST', `Sent state sync for "${player.currentTrack.title}" (${player.isPlaying ? 'Play' : 'Pause'} at ${Math.round(player.position)}s).`);
  };

  const copyRoomInvite = () => {
    if (!joinedRoom) return;
    const inviteUrl = `${window.location.origin}/session?room=${joinedRoom}`;
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-32 pt-24 md:ml-80 md:px-8 md:pt-28 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">WebRTC Data Mesh & Signaling</p>
          <h2 className="mt-1 text-3xl font-bold text-white tracking-tight">Zero-Latency Jam Sessions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Riveria connects authenticated listeners directly via WebRTC data channels for sub-50ms synchronized listening.
          </p>
        </div>

        {/* Room Join Card */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="room-code-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Room Code</label>
              <div className="flex gap-2">
                <input
                  id="room-code-input"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && join()}
                  placeholder="e.g. synthwave-lounge"
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-primary transition-colors font-mono text-sm"
                />
                <button
                  onClick={join}
                  className="rounded-xl bg-primary px-6 py-3 font-bold text-black transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(208,188,255,0.3)] active:scale-95"
                >
                  Join Jam
                </button>
              </div>
            </div>

            {joinedRoom && (
              <div className="flex flex-col justify-end">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Invitation Link</span>
                <button
                  onClick={copyRoomInvite}
                  className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-primary hover:bg-white/10 hover:border-primary transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">{copied ? 'done' : 'content_copy'}</span>
                  <span>{copied ? 'Link Copied!' : 'Copy Room Link'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
            <button
              onClick={broadcastPlayback}
              disabled={!joinedRoom || !player.currentTrack}
              className="flex items-center gap-2 rounded-xl border border-secondary/50 bg-secondary/10 px-5 py-2.5 font-semibold text-secondary hover:bg-secondary/20 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-[0_0_15px_rgba(137,206,255,0.15)]"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>sensors</span>
              <span>Sync Current Playback</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`w-2.5 h-2.5 rounded-full ${peersList.length > 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}></span>
              <span>{peersList.length} direct peer{peersList.length === 1 ? '' : 's'} linked in mesh</span>
            </div>
          </div>

          <p aria-live="polite" className="mt-4 rounded-xl bg-black/20 border border-white/5 p-3 text-xs text-slate-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">info</span>
            <span>{status}</span>
          </p>
        </section>

        {/* Split Grid: Connected Peers & Real-Time Event Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Connected Peers (5 cols) */}
          <section className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-[380px]">
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
                  <p className="text-xs">No peers connected yet.</p>
                  <p className="text-[11px] mt-1 text-slate-600">Share your room code with friends to synchronize audio playback.</p>
                </div>
              ) : (
                peersList.map((id) => (
                  <div key={id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-mono font-bold">
                        {id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white truncate max-w-[140px]">peer_{id.slice(0, 8)}</p>
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Data Channel Active
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

          {/* Real-Time Session Log (7 cols) */}
          <section className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-[380px]">
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
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    log.type === 'SYNC' ? 'bg-secondary/20 text-secondary' :
                    log.type === 'JOIN' ? 'bg-emerald-500/20 text-emerald-300' :
                    log.type === 'ERR' ? 'bg-red-500/20 text-red-300' :
                    log.type === 'BROADCAST' ? 'bg-primary/20 text-primary' :
                    'bg-white/10 text-slate-300'
                  }`}>
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
