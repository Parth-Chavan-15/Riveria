import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { apiRequest, getAccessToken } from '../services/api';

const rtcConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

export default function WebRTCSession() {
  const { user } = useAuth();
  const player = usePlayer();
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const roomRef = useRef('');
  const tracksRef = useRef([]);
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('Choose a room code to start a private jam.');
  const [peerCount, setPeerCount] = useState(0);

  useEffect(() => { apiRequest('/tracks').then((tracks) => { tracksRef.current = tracks; }).catch(() => {}); }, []);
  const handlePlayback = useCallback((payload) => player.syncPlayback(payload, tracksRef.current), [player]);

  const closePeer = useCallback((id) => {
    const peer = peersRef.current.get(id);
    peer?.channel?.close();
    peer?.connection?.close();
    peersRef.current.delete(id);
    setPeerCount(peersRef.current.size);
  }, []);

  const createPeer = useCallback((peerId, initiator) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId);
    const connection = new RTCPeerConnection(rtcConfiguration);
    const peer = { connection, channel: null };
    const registerChannel = (channel) => {
      peer.channel = channel;
      channel.onopen = () => { setPeerCount(peersRef.current.size); setStatus(`Connected directly to ${peersRef.current.size} jam peer(s).`); };
      channel.onmessage = (event) => { try { handlePlayback(JSON.parse(event.data)); } catch {} };
      channel.onclose = () => closePeer(peerId);
    };
    if (initiator) registerChannel(connection.createDataChannel('riveria-playback', { ordered: false, maxRetransmits: 0 }));
    connection.ondatachannel = (event) => registerChannel(event.channel);
    connection.onicecandidate = (event) => event.candidate && socketRef.current?.emit('jam:signal', { targetId: peerId, signal: { type: 'candidate', candidate: event.candidate.candidate, sdpMid: event.candidate.sdpMid, sdpMLineIndex: event.candidate.sdpMLineIndex } });
    connection.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(connection.connectionState)) closePeer(peerId); };
    peersRef.current.set(peerId, peer);
    setPeerCount(peersRef.current.size);
    return peer;
  }, [closePeer, handlePlayback]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { path: '/socket.io', auth: { token: getAccessToken() } });
    socketRef.current = socket;
    socket.on('connect_error', () => setStatus('Jam connection failed. Sign in again and retry.'));
    socket.on('jam:peer-joined', ({ peerId }) => { createPeer(peerId, true); });
    socket.on('jam:peer-left', ({ peerId }) => closePeer(peerId));
    socket.on('jam:signal', async ({ fromId, signal }) => {
      const peer = createPeer(fromId, false);
      try {
        if (signal.type === 'offer') { await peer.connection.setRemoteDescription({ type: 'offer', sdp: signal.sdp }); const answer = await peer.connection.createAnswer(); await peer.connection.setLocalDescription(answer); socket.emit('jam:signal', { targetId: fromId, signal: { type: 'answer', sdp: answer.sdp } }); }
        else if (signal.type === 'answer') await peer.connection.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        else if (signal.type === 'candidate' && signal.candidate) await peer.connection.addIceCandidate({ candidate: signal.candidate, sdpMid: signal.sdpMid, sdpMLineIndex: signal.sdpMLineIndex });
      } catch { setStatus('A peer connection could not be negotiated.'); }
    });
    socket.on('jam:playback', handlePlayback);
    return () => { peersRef.current.forEach((_, id) => closePeer(id)); socket.disconnect(); };
  }, [closePeer, createPeer, handlePlayback]);

  const join = () => {
    const normalized = roomId.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,64}$/.test(normalized)) return setStatus('Use 3–64 letters, numbers, underscores, or hyphens.');
    socketRef.current?.emit('jam:join', { roomId: normalized }, async (result) => {
      if (!result?.ok) return setStatus(result?.error || 'Unable to join room.');
      roomRef.current = normalized;
      setStatus(`Joined “${normalized}” as ${user?.email}. Creating direct peer links…`);
      for (const peerId of result.peers) {
        const peer = createPeer(peerId, true);
        const offer = await peer.connection.createOffer();
        await peer.connection.setLocalDescription(offer);
        socketRef.current?.emit('jam:signal', { targetId: peerId, signal: { type: 'offer', sdp: offer.sdp } });
      }
    });
  };

  const broadcastPlayback = () => {
    if (!roomRef.current || !player.currentTrack) return setStatus('Join a room and start a playable track first.');
    const payload = { roomId: roomRef.current, trackId: player.currentTrack._id, position: player.position, isPlaying: player.isPlaying, sentAt: Date.now() };
    peersRef.current.forEach(({ channel }) => channel?.readyState === 'open' && channel.send(JSON.stringify(payload)));
    socketRef.current?.emit('jam:playback', payload);
    setStatus(`Playback synchronized with ${peersRef.current.size} peer(s).`);
  };

  return <main className="flex-1 md:ml-64 p-5 pb-32 pt-24 md:p-10 md:pt-28 text-white"><section className="glass-panel mx-auto max-w-3xl rounded-2xl p-6 md:p-10"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">WebRTC data channels</p><h2 className="mt-2 text-3xl font-bold">Zero-Latency Jams</h2><p className="mt-3 text-slate-400">Riveria creates authenticated signaling links, then sends playback state directly between browsers. For production NAT coverage, provide a TURN service alongside the included STUN servers.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="room-code" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-primary" /><button onClick={join} className="rounded-xl bg-primary px-5 py-3 font-bold text-black">Join jam</button></div><div className="mt-6 flex flex-wrap items-center gap-3"><button onClick={broadcastPlayback} className="rounded-xl border border-secondary/50 bg-secondary/10 px-5 py-3 font-semibold text-secondary">Sync current playback</button><span className="text-sm text-slate-400">{peerCount} direct peer{peerCount === 1 ? '' : 's'} connected</span></div><p aria-live="polite" className="mt-5 rounded-lg bg-white/5 p-3 text-sm text-slate-300">{status}</p></section></main>;
}
