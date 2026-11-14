import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';
import { apiRequest, getAccessToken } from '../services/api';

const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
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

function generateRoomCode() {
  const adjectives = ['SONIC', 'AETHER', 'LUMEN', 'HAVEN', 'VELVET', 'OBSIDIAN', 'AURORA'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${num}`;
}

const DEFAULT_ROOM_TRACKS = [
  {
    id: '6af537969bb5c204242f3a2b',
    _id: '6af537969bb5c204242f3a2b',
    title: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    duration: '02:38',
    type: 'Cloud',
    audioSrc: '/audio/post-malone-sunflower.mp3',
    imageSrc: '/covers/sunflower.png',
    imageColor: 'bg-gradient-to-br from-amber-600 via-orange-700 to-zinc-950',
    addedBy: 'Riveria Haven'
  },
  {
    id: '6af537969bb5c204242f3a2c',
    _id: '6af537969bb5c204242f3a2c',
    title: 'Birds',
    artist: 'Imagine Dragons',
    duration: '03:42',
    type: 'Cloud',
    audioSrc: '/audio/imagine-dragons-birds.mp3',
    imageSrc: '/covers/birds.jpg',
    imageColor: 'bg-gradient-to-br from-cyan-600 via-blue-700 to-slate-950',
    addedBy: 'Riveria Haven'
  },
  {
    id: '6af537969bb5c204242f3a2a',
    _id: '6af537969bb5c204242f3a2a',
    title: 'Thunder',
    artist: 'Imagine Dragons',
    duration: '03:07',
    type: 'Cloud',
    audioSrc: '/audio/imagine-dragons-thunder.mp3',
    imageSrc: '/covers/thunder.jpg',
    imageColor: 'bg-gradient-to-br from-purple-600 via-indigo-700 to-zinc-950',
    addedBy: 'Riveria Haven'
  },
  {
    id: '6af537959bb5c204242f3a29',
    _id: '6af537959bb5c204242f3a29',
    title: 'Believer',
    artist: 'Imagine Dragons',
    duration: '03:24',
    type: 'Cloud',
    audioSrc: '/audio/imagine-dragons-believer.mp3',
    imageSrc: '/covers/believer.jpg',
    imageColor: 'bg-gradient-to-br from-rose-600 via-purple-700 to-indigo-950',
    addedBy: 'Riveria Haven'
  },
  {
    id: '6af537969bb5c204242f3a2d',
    _id: '6af537969bb5c204242f3a2d',
    title: 'Happier',
    artist: 'Marshmello ft. Bastille',
    duration: '03:53',
    type: 'Cloud',
    audioSrc: '/audio/marshmello-happier.mp3',
    imageSrc: '/covers/happier.jpg',
    imageColor: 'bg-gradient-to-br from-violet-600 via-fuchsia-700 to-zinc-950',
    addedBy: 'Riveria Haven'
  }
];

// Background-resilient Web Worker timer (prevents browser throttle to 1000ms+ when tab is minimized)
function createWorkerTimer(callback, ms) {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const blob = new Blob([`
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            timer = setInterval(function() {
              self.postMessage('tick');
            }, ${ms});
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
          }
        };
      `], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = () => callback();
      worker.postMessage('start');
      return () => {
        try {
          worker.postMessage('stop');
          worker.terminate();
        } catch {}
      };
    } catch {}
  }
  const id = setInterval(callback, ms);
  return () => clearInterval(id);
}

const JamContext = createContext(null);

export function JamProvider({ children }) {
  const player = usePlayer();
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const { user } = useAuth();

  const getPersistentPeerId = () => {
    if (typeof window === 'undefined') return `peer_${crypto.randomUUID().slice(0, 8)}`;
    try {
      // Isolate strictly per tab using sessionStorage (prevents multi-tab peer collision in same browser)
      const existing = sessionStorage.getItem('reveria:my_tab_peer_id');
      if (existing && existing.startsWith('peer')) return existing;
      const newId = `peer_${crypto.randomUUID().slice(0, 8)}`;
      sessionStorage.setItem('reveria:my_tab_peer_id', newId);
      return newId;
    } catch {
      return `peer_${crypto.randomUUID().slice(0, 8)}`;
    }
  };

  const myPeerIdRef = useRef(getPersistentPeerId());
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const tracksRef = useRef([]);
  const pollTimerRef = useRef(null);
  const signalingModeRef = useRef('socket'); // 'socket' or 'rest'
  const activeIncomingTransferRef = useRef(null);
  const joinedRoomRef = useRef('');
  const isIncomingSyncRef = useRef(false);
  const lastProcessedVersionRef = useRef(0);
  const lastPolledVersionRef = useRef(0);
  const lastServerVersionRef = useRef(0);
  const peerSequencesRef = useRef(new Map());
  const localSeqRef = useRef(0);
  const lastReconnectAttemptRef = useRef(new Map());

  // Persistent room state restored across route navigation and browser tabs
  const getSavedRoom = () => {
    if (typeof window === 'undefined') return '';
    try {
      // Clear legacy localStorage room key that caused stale cross-session popups
      localStorage.removeItem('reveria:active_jam_room');

      // ONLY restore active room if user is actively on the /session route
      if (window.location.pathname === '/session') {
        const query = new URLSearchParams(window.location.search).get('room');
        if (query) return query.toUpperCase();
        return sessionStorage.getItem('reveria:active_jam_room') || '';
      }
      return '';
    } catch {
      return '';
    }
  };

  const [roomId, setRoomId] = useState(getSavedRoom);
  const [joinedRoom, setJoinedRoom] = useState(getSavedRoom);
  const [status, setStatus] = useState('Create a room or enter a code to start a zero-latency listening jam.');
  const [peersList, setPeersList] = useState([]);
  const [copied, setCopied] = useState(false);
  const [collabPlaylist, setCollabPlaylist] = useState([]);
  const collabPlaylistRef = useRef(collabPlaylist);
  useEffect(() => {
    collabPlaylistRef.current = collabPlaylist;
  }, [collabPlaylist]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [availableCloudTracks, setAvailableCloudTracks] = useState([]);
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

  // Fetch cloud tracks for adding to jam playlist
  useEffect(() => {
    apiRequest('/tracks')
      .then((tracks) => {
        tracksRef.current = tracks;
        setAvailableCloudTracks(tracks);
      })
      .catch(() => {});
  }, []);

  // Handle incoming playback sync from a remote peer or pseudo-server
  const handlePlaybackSync = useCallback((payload) => {
    if (!payload?.trackId && !payload?.track) return;
    if (payload.fromPeerId && payload.fromPeerId === myPeerIdRef.current) return;

    // Filter packets by source channel to prevent sequence/version domain collision
    if (payload.fromPeerId) {
      // Peer WebRTC DataChannel packet
      const peerSeq = Number(payload.seq) || 0;
      if (peerSeq) {
        const lastSeq = peerSequencesRef.current.get(payload.fromPeerId) || 0;
        if (peerSeq <= lastSeq) return; // Drop duplicate/stale packet from this specific peer
        peerSequencesRef.current.set(payload.fromPeerId, peerSeq);
      }
    } else if (payload.version) {
      // Server REST Poll state
      const srvVer = Number(payload.version) || 0;
      const currentTrackId = playerRef.current?.currentTrack?._id || playerRef.current?.currentTrack?.id;
      const incomingTrackId = payload.trackId || payload.track?._id || payload.track?.id;
      const isDiff = Boolean(incomingTrackId && currentTrackId !== incomingTrackId);

      // If track is different, NEVER reject!
      if (!isDiff && srvVer && lastServerVersionRef.current && srvVer <= lastServerVersionRef.current) {
        return; // Already processed this or newer server state
      }
      if (srvVer > lastServerVersionRef.current) {
        lastServerVersionRef.current = srvVer;
      }
    }

    isIncomingSyncRef.current = true;
    const effectiveJamTracks = collabPlaylistRef.current.length > 0
      ? collabPlaylistRef.current
      : [...tracksRef.current, ...(playerRef.current?.localTracks || [])];
    playerRef.current?.syncPlayback(payload, effectiveJamTracks);
    setTimeout(() => {
      isIncomingSyncRef.current = false;
    }, 400);

    addLog(
      'SYNC',
      `Auto-synced with room. "${payload.track?.title || 'Track'}" Pos: ${Math.round(payload.position || 0)}s (${payload.isPlaying ? 'Playing' : 'Paused'})`
    );
  }, [addLog]);

  // Handle incoming collaborative playlist updates from a remote peer
  const handlePlaylistSync = useCallback((newPlaylist) => {
    setCollabPlaylist(newPlaylist);
    if (Array.isArray(newPlaylist) && newPlaylist.length > 0) {
      playerRef.current?.setQueue?.(newPlaylist);
    }
    addLog('QUEUE', `Collaborative Jam Playlist updated (${newPlaylist.length} tracks).`);
  }, [addLog]);

  const closePeer = useCallback((id) => {
    const peer = peersRef.current.get(id);
    peer?.channel?.close();
    peer?.connection?.close();
    peersRef.current.delete(id);
    updatePeersState();
    addLog('PEER', `Peer connection closed: ${id}`);
  }, [addLog, updatePeersState]);

  // Dispatch signal via Socket.io or HTTP REST
  const dispatchSignal = useCallback(async (targetId, signal) => {
    const activeRoom = joinedRoomRef.current || joinedRoom;
    if (!activeRoom || !targetId || !signal) return;

    if (signalingModeRef.current === 'socket' && socketRef.current?.connected) {
      socketRef.current.emit('jam:signal', { targetId, signal });
    } else {
      try {
        await apiRequest('/session/signal', {
          method: 'POST',
          body: JSON.stringify({
            roomId: activeRoom,
            fromId: myPeerIdRef.current,
            targetId,
            signal
          })
        });
      } catch {
        addLog('ERR', `Failed to dispatch signal to ${targetId.slice(0, 8)}.`);
      }
    }
  }, [joinedRoom, addLog]);

  const p2pLatencyRef = useRef(new Map());
  const p2pOffsetRef = useRef(new Map());
  const p2pNtpSamplesRef = useRef(new Map());

  // Stream local audio file bytes across WebRTC DataChannel directly to connected peers with flow control
  const streamLocalTrackToPeers = useCallback(async (track) => {
    try {
      const fileOrBlob = track?.rawFile || track?.rawBlob || (track?.localUrl ? await (await fetch(track.localUrl)).blob().catch(() => null) : null);
      if (!fileOrBlob) return;
      addLog('P2P_FILE', `Broadcasting private audio stream for "${track.title}" to peer(s)...`);
      const buffer = await fileOrBlob.arrayBuffer();
      const metaPacket = {
        type: 'START_AUDIO_TRANSFER',
        trackId: track._id || track.id,
        title: track.title,
        artist: track.artist,
        mimeType: fileOrBlob.type || 'audio/mpeg',
        totalBytes: buffer.byteLength,
        startWallTime: Date.now(),
        currentPos: playerRef.current?.getAudioCurrentTime ? playerRef.current.getAudioCurrentTime() : (playerRef.current?.position || 0)
      };

      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          try { channel.send(JSON.stringify(metaPacket)); } catch {}
        }
      });

      const CHUNK_SIZE = 65536; // 64KB high-speed SCTP chunks
      for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
        const slice = buffer.slice(offset, offset + CHUNK_SIZE);
        for (const { channel } of peersRef.current.values()) {
          if (channel?.readyState === 'open') {
            // Flow control: wait if channel send buffer is backlogged (> 256KB)
            while (channel.bufferedAmount > 262144) {
              await new Promise((r) => setTimeout(r, 5));
            }
            try { channel.send(slice); } catch {}
          }
        }
      }

      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          try {
            channel.send(JSON.stringify({
              type: 'END_AUDIO_TRANSFER',
              trackId: track._id || track.id,
              totalBytes: buffer.byteLength,
              startWallTime: metaPacket.startWallTime,
              currentPos: metaPacket.currentPos
            }));
          } catch {}
        }
      });
      addLog('P2P_FILE', `P2P audio stream for "${track.title}" successfully transferred to peers.`);
    } catch {
      addLog('ERR', `P2P audio stream failed for "${track.title}".`);
    }
  }, [addLog]);

  // Create an RTCPeerConnection and wire DataChannel
  const createPeer = useCallback((peerId, initiator) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId);
    const connection = new RTCPeerConnection(getIceConfiguration());
    const peer = { connection, channel: null, pendingCandidates: [] };

    const registerChannel = (channel) => {
      peer.channel = channel;
      channel.binaryType = 'arraybuffer';

      channel.onopen = () => {
        updatePeersState();
        setStatus(`Direct P2P Encrypted Tunnel Active with ${peersRef.current.size} peer(s).`);
        addLog('OPEN', `Direct WebRTC DataChannel established with ${peerId}.`);

        // Send our current collaborative playlist to new peer
        if (collabPlaylistRef.current.length > 0) {
          try { channel.send(JSON.stringify({ type: 'PLAYLIST_SYNC', playlist: collabPlaylistRef.current })); } catch {}
        }

        // Burst 3 micro-NTP pings for instant clock calibration within 250ms
        try { channel.send(JSON.stringify({ type: 'P2P_PING', t1: Date.now() })); } catch {}
        setTimeout(() => {
          if (channel?.readyState === 'open') {
            try { channel.send(JSON.stringify({ type: 'P2P_PING', t1: Date.now() })); } catch {}
          }
        }, 120);
        setTimeout(() => {
          if (channel?.readyState === 'open') {
            try { channel.send(JSON.stringify({ type: 'P2P_PING', t1: Date.now() })); } catch {}
          }
        }, 250);
      };

      channel.onmessage = async (event) => {
        try {
          let data = event.data;
          if (data instanceof Blob) {
            data = await data.arrayBuffer();
          }
          if (data instanceof ArrayBuffer) {
            const transfer = activeIncomingTransferRef.current;
            if (transfer) {
              transfer.chunks.push(data);
              transfer.receivedBytes += data.byteLength;
            }
            return;
          }

          const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
          const packet = JSON.parse(text);
          if (packet.type === 'PLAYBACK_SYNC') {
            handlePlaybackSync(packet);
          } else if (packet.type === 'PLAYLIST_SYNC') {
            handlePlaylistSync(packet.playlist);
          } else if (packet.type === 'PLAYBACK_HEARTBEAT') {
            const currentTrackId = playerRef.current?.currentTrack?._id || playerRef.current?.currentTrack?.id;
            if (packet.trackId === currentTrackId && playerRef.current?.isPlaying && typeof packet.position === 'number') {
              const p2pOffset = p2pOffsetRef.current?.get(peerId) || 0;
              const now = Date.now();
              const sentAt = Number(packet.sentAt || packet.timestamp) || now;
              // True elapsed seconds on sender since sender sampled position:
              const elapsedSinceSend = Math.max(0, (now + p2pOffset - sentAt) / 1000);
              const currentSenderPos = packet.position + (packet.isPlaying ? elapsedSinceSend : 0);
              playerRef.current?.correctDrift?.(currentSenderPos);
            }
          } else if (packet.type === 'START_AUDIO_TRANSFER') {
            activeIncomingTransferRef.current = {
              trackId: packet.trackId,
              title: packet.title,
              artist: packet.artist,
              mimeType: packet.mimeType || 'audio/mpeg',
              chunks: [],
              receivedBytes: 0,
              totalBytes: packet.totalBytes,
              startWallTime: packet.startWallTime || Date.now(),
              currentPos: packet.currentPos || 0
            };
            addLog('P2P_FILE', `Receiving private audio stream for "${packet.title}" (${Math.round((packet.totalBytes || 0) / 1024)} KB) from peer...`);
          } else if (packet.type === 'END_AUDIO_TRANSFER') {
            const transfer = activeIncomingTransferRef.current;
            if (transfer && transfer.trackId === packet.trackId) {
              const blob = new Blob(transfer.chunks, { type: transfer.mimeType });
              const localUrl = URL.createObjectURL(blob);
              const p2pTrack = {
                _id: transfer.trackId,
                id: transfer.trackId,
                title: transfer.title,
                artist: transfer.artist || 'Peer Device',
                type: 'Local',
                localUrl,
                rawBlob: blob,
                duration: 'Local',
                imageColor: 'bg-gradient-to-br from-cyan-700 via-blue-800 to-slate-950'
              };
              playerRef.current?.addP2PTrack?.(p2pTrack);

              // Calculate elapsed playhead delta so remote peer joins in exact phase lock
              const transferElapsed = Math.max(0, (Date.now() - (transfer.startWallTime || Date.now())) / 1000);
              const targetPos = Math.max(0, (transfer.currentPos || 0) + transferElapsed);

              addLog('P2P_FILE', `P2P audio stream for "${transfer.title}" loaded in RAM! Locking live playback at ${targetPos.toFixed(1)}s.`);
              await playerRef.current?.playTrack?.(p2pTrack, collabPlaylistRef.current, true /* autoPlay */, true /* fromSync = true */);
              const audioElem = window.__riveriaAudio;
              if (audioElem && targetPos > 0) {
                if (audioElem.readyState >= 1) {
                  audioElem.currentTime = targetPos;
                } else {
                  audioElem.addEventListener('loadedmetadata', () => {
                    try { audioElem.currentTime = targetPos; } catch {}
                  }, { once: true });
                }
              }
              activeIncomingTransferRef.current = null;
            }
          } else if (packet.type === 'REQUEST_PLAY_TRACK') {
            const match = playerRef.current?.localTracks?.find((t) => (t._id || t.id) === packet.trackId);
            if (match) {
              addLog('P2P_FILE', `Peer requested playback of local track "${match.title}". Starting room broadcast...`);
              playerRef.current?.playTrack?.(match, collabPlaylistRef.current, true, false);
              streamLocalTrackToPeers(match);
            }
          } else if (packet.type === 'P2P_PING') {
            if (channel?.readyState === 'open') {
              try {
                const t2 = Date.now();
                channel.send(JSON.stringify({
                  type: 'P2P_PONG',
                  t1: packet.t1,
                  t2,
                  t3: Date.now()
                }));
              } catch {}
            }
          } else if (packet.type === 'P2P_PONG') {
            const t4 = Date.now();
            const t1 = Number(packet.t1) || t4;
            const t2 = Number(packet.t2) || t4;
            const t3 = Number(packet.t3) || t2;
            const p2pRtt = Math.max(1, (t4 - t1) - (t3 - t2));
            // Standard RFC 5905 NTP clock offset formula:
            const p2pOffset = ((t2 - t1) + (t3 - t4)) / 2;

            // Update sample filter
            const samples = p2pNtpSamplesRef.current.get(peerId) || [];
            samples.push({ offset: p2pOffset, rtt: p2pRtt, time: t4 });
            if (samples.length > 8) samples.shift();
            p2pNtpSamplesRef.current.set(peerId, samples);

            // Jitter-free filter: take lowest 50% RTT samples (least network queue delay)
            const sorted = [...samples].sort((a, b) => a.rtt - b.rtt);
            const best = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.5)));
            const avgOffset = best.reduce((acc, s) => acc + s.offset, 0) / best.length;

            p2pLatencyRef.current.set(peerId, best[0].rtt);
            p2pOffsetRef.current.set(peerId, avgOffset);
            playerRef.current?.setPeerClockOffset?.(peerId, avgOffset);

            // Inform the remote peer of their reciprocal offset immediately:
            if (channel?.readyState === 'open') {
              try {
                channel.send(JSON.stringify({
                  type: 'NTP_CALIBRATED',
                  offset: -avgOffset,
                  rtt: best[0].rtt
                }));
              } catch {}
            }
          } else if (packet.type === 'NTP_CALIBRATED') {
            if (typeof packet.offset === 'number' && Number.isFinite(packet.offset)) {
              p2pOffsetRef.current.set(peerId, packet.offset);
              if (packet.rtt) p2pLatencyRef.current.set(peerId, packet.rtt);
              playerRef.current?.setPeerClockOffset?.(peerId, packet.offset);
            }
          }
        } catch {}
      };

      channel.onclose = () => closePeer(peerId);
    };

    if (initiator) {
      registerChannel(
        connection.createDataChannel('riveria-playback', { ordered: true })
      );
    }
    connection.ondatachannel = (event) => registerChannel(event.channel);

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        dispatchSignal(peerId, {
          type: 'candidate',
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      }
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      if (['failed', 'closed'].includes(state)) {
        lastReconnectAttemptRef.current.delete(peerId);
        closePeer(peerId);
      } else if (state === 'disconnected') {
        // Fast dynamic ICE restart on transient network handover (e.g. Wi-Fi to cellular data)
        setTimeout(async () => {
          if (peer.connection?.connectionState === 'disconnected') {
            try {
              if (myPeerIdRef.current > peerId) {
                const offer = await peer.connection.createOffer({ iceRestart: true });
                await peer.connection.setLocalDescription(offer);
                dispatchSignal(peerId, { type: 'offer', sdp: offer.sdp });
              } else {
                dispatchSignal(peerId, { type: 'reconnect_request' });
              }
            } catch {
              lastReconnectAttemptRef.current.delete(peerId);
              closePeer(peerId);
            }
          }
        }, 1500);
      }
    };

    connection.oniceconnectionstatechange = () => {
      const state = connection.iceConnectionState;
      if (['failed', 'closed'].includes(state)) {
        lastReconnectAttemptRef.current.delete(peerId);
        closePeer(peerId);
      } else if (state === 'disconnected') {
        setTimeout(async () => {
          if (peer.connection?.iceConnectionState === 'disconnected') {
            try {
              if (myPeerIdRef.current > peerId) {
                const offer = await peer.connection.createOffer({ iceRestart: true });
                await peer.connection.setLocalDescription(offer);
                dispatchSignal(peerId, { type: 'offer', sdp: offer.sdp });
              } else {
                dispatchSignal(peerId, { type: 'reconnect_request' });
              }
            } catch {
              lastReconnectAttemptRef.current.delete(peerId);
              closePeer(peerId);
            }
          }
        }, 1500);
      }
    };

    peersRef.current.set(peerId, peer);
    updatePeersState();
    return peer;
  }, [closePeer, dispatchSignal, handlePlaybackSync, handlePlaylistSync, addLog, updatePeersState, streamLocalTrackToPeers]);

  // Handle incoming WebRTC signal (offer/answer/candidate)
  const processSignal = useCallback(async (fromId, signal) => {
    try {
      if (signal.type === 'offer') {
        let peer = peersRef.current.get(fromId);
        if (peer && ['closed', 'failed'].includes(peer.connection?.connectionState)) {
          closePeer(fromId);
          peer = null;
        }
        if (!peer) {
          peer = createPeer(fromId, false);
        }
        await peer.connection.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        while (peer.pendingCandidates?.length) {
          const candidate = peer.pendingCandidates.shift();
          await peer.connection.addIceCandidate(candidate).catch(() => {});
        }
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        dispatchSignal(fromId, { type: 'answer', sdp: answer.sdp });
        addLog('SDP', `Answered offer from peer ${fromId.slice(0, 8)}.`);
      } else if (signal.type === 'answer') {
        const peer = createPeer(fromId, false);
        await peer.connection.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        while (peer.pendingCandidates?.length) {
          const candidate = peer.pendingCandidates.shift();
          await peer.connection.addIceCandidate(candidate).catch(() => {});
        }
        addLog('SDP', `Remote answer accepted from peer ${fromId.slice(0, 8)}.`);
      } else if (signal.type === 'candidate' && signal.candidate) {
        const peer = createPeer(fromId, false);
        const candidateInit = { candidate: signal.candidate, sdpMid: signal.sdpMid, sdpMLineIndex: signal.sdpMLineIndex };
        if (peer.connection.remoteDescription && peer.connection.remoteDescription.type) {
          await peer.connection.addIceCandidate(candidateInit);
        } else {
          peer.pendingCandidates.push(candidateInit);
        }
      } else if (signal.type === 'reconnect_request') {
        closePeer(fromId);
        const peer = createPeer(fromId, true);
        const offer = await peer.connection.createOffer({ iceRestart: true });
        await peer.connection.setLocalDescription(offer);
        await dispatchSignal(fromId, { type: 'offer', sdp: offer.sdp });
        addLog('SDP', `Reconnecting tunnel with peer ${fromId.slice(0, 8)} via ICE restart.`);
      }
    } catch {
      if (peersRef.current.size === 0) {
        setStatus('Negotiating peer connection mesh…');
      }
      addLog('ERR', `Signaling negotiation retry with peer ${fromId.slice(0, 8)}.`);
    }
  }, [createPeer, closePeer, dispatchSignal, addLog]);

  // Initialize Hybrid Signaling (Socket.io with automatic Serverless REST fallback)
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    const isVercelServerless = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
    const targetUrl = socketUrl || (!isVercelServerless ? window.location.origin : null);

    if (targetUrl) {
      try {
        const socket = io(targetUrl, {
          path: '/socket.io',
          auth: { token: getAccessToken() },
          reconnectionAttempts: 2,
          timeout: 2500
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          signalingModeRef.current = 'socket';
          addLog('NET', `Socket signaling online (ID: ${socket.id.slice(0, 8)}).`);
        });

        socket.on('connect_error', () => {
          signalingModeRef.current = 'rest';
          addLog('NET', 'Serverless environment detected: Activated ultra-resilient HTTP REST signaling.');
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
          await processSignal(fromId, signal);
        });

        socket.on('jam:playback-sync', (payload) => {
          handlePlaybackSync(payload);
        });

        socket.on('jam:playlist-sync', ({ playlist }) => {
          if (Array.isArray(playlist)) {
            handlePlaylistSync(playlist);
          }
        });
      } catch {}
    } else {
      signalingModeRef.current = 'rest';
      addLog('NET', 'Activated ultra-resilient HTTP REST signaling.');
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // REST Signaling polling loop when in serverless mode
  useEffect(() => {
    const activeRoom = joinedRoomRef.current || joinedRoom;
    if (!activeRoom) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const poll = async () => {
      try {
        const curRoom = joinedRoomRef.current || joinedRoom;
        if (!curRoom) return;

        const reqStart = Date.now();
        const data = await apiRequest(`/session/poll?roomId=${curRoom}&peerId=${myPeerIdRef.current}`);
        if (!data?.ok) return;

        // Accurate Cristian's clock skew calibration against central server with minimum-RTT weighting
        if (typeof data.serverTime === 'number') {
          const reqEnd = Date.now();
          const rtt = Math.max(1, reqEnd - reqStart);
          const estServerNow = data.serverTime + (rtt / 2);
          const skew = estServerNow - reqEnd;
          playerRef.current?.calibrateClock?.(skew, rtt);
        }

        // 1. Process any waiting signals
        if (Array.isArray(data.signals) && data.signals.length > 0) {
          for (const s of data.signals) {
            await processSignal(s.fromId, s.signal);
          }
        }

        // 2. Synchronize Collaborative Playlist if server has updates
        if (Array.isArray(data.playlist)) {
          setCollabPlaylist((prev) => {
            const prevIds = prev.map((p) => p.id || p._id).join(',');
            const nextIds = data.playlist.map((p) => p.id || p._id).join(',');
            if (prevIds !== nextIds || prev.length !== data.playlist.length) {
              return data.playlist;
            }
            return prev;
          });
        }

        // 3. Auto-synchronize playback: trigger full sync on version or track change, continuous drift lock during stream
        if (data.currentPlayback) {
          const incomingVersion = Number(data.currentPlayback.version) || 0;
          const currentTrackId = playerRef.current?.currentTrack?._id || playerRef.current?.currentTrack?.id;
          const incomingTrackId = data.currentPlayback.trackId || data.currentPlayback.track?._id || data.currentPlayback.track?.id;
          const isDifferentTrack = Boolean(incomingTrackId && currentTrackId !== incomingTrackId);

          if (incomingVersion > lastPolledVersionRef.current || isDifferentTrack || lastPolledVersionRef.current === 0) {
            lastPolledVersionRef.current = Math.max(lastPolledVersionRef.current, incomingVersion);
            handlePlaybackSync({
              ...data.currentPlayback,
              roomId: curRoom,
              currentServerTime: data.serverTime
            });
          } else if (data.currentPlayback.isPlaying && !isDifferentTrack && playerRef.current?.isPlaying) {
            // Continuous Cristian-calibrated clock drift lock during ongoing playback
            const recordedServerTime = Number(data.currentPlayback.serverTime || data.currentPlayback.timestamp) || 0;
            const originTime = recordedServerTime || Number(data.currentPlayback.timestamp) || 0;
            const elapsed = Math.max(0, (data.serverTime - originTime) / 1000);
            const remotePos = (Number(data.currentPlayback.position) || 0) + elapsed;
            playerRef.current?.correctDrift?.(remotePos);
          }
        }

        // 4. Detect new peers or auto-heal disconnected peers
        if (Array.isArray(data.peers)) {
          setPeersList(data.peers.map((p) => p.peerId));

          for (const remote of data.peers) {
            if (remote.peerId !== myPeerIdRef.current) {
              const existing = peersRef.current.get(remote.peerId);
              const isDisconnected = !existing ||
                ['failed', 'closed'].includes(existing.connection?.connectionState) ||
                ['failed', 'closed'].includes(existing.connection?.iceConnectionState);

              if (isDisconnected) {
                const now = Date.now();
                const lastAttempt = lastReconnectAttemptRef.current.get(remote.peerId) || 0;
                // Enforce 10-second cooldown between reconnection attempts to prevent cellular signaling storms
                if (now - lastAttempt > 10000) {
                  lastReconnectAttemptRef.current.set(remote.peerId, now);
                  if (existing) closePeer(remote.peerId);
                  if (myPeerIdRef.current > remote.peerId) {
                    addLog('JOIN', `Mesh tunnel reset with peer ${remote.peerId.slice(0, 8)}. Sending offer...`);
                    const peer = createPeer(remote.peerId, true);
                    const offer = await peer.connection.createOffer({ iceRestart: true });
                    await peer.connection.setLocalDescription(offer);
                    await dispatchSignal(remote.peerId, { type: 'offer', sdp: offer.sdp });
                  } else {
                    await dispatchSignal(remote.peerId, { type: 'reconnect_request' });
                  }
                }
              }
            }
          }
        }
      } catch {}
    };

    poll();
    const stopPolling = createWorkerTimer(poll, 800);

    return () => {
      stopPolling();
    };
  }, [joinedRoom, createPeer, dispatchSignal, processSignal, handlePlaybackSync, handlePlaylistSync, addLog]);

  // WebRTC Real-Time Playback Heartbeat (Direct P2P zero-drift phase lock)
  useEffect(() => {
    const activeRoom = joinedRoomRef.current || joinedRoom;
    if (!activeRoom) return;

    const sendHeartbeat = () => {
      if (!playerRef.current?.isPlaying || !playerRef.current?.currentTrack) return;
      const currentTrack = playerRef.current.currentTrack;
      const trackId = currentTrack._id || currentTrack.id;
      const currentTime = playerRef.current.getAudioCurrentTime ? playerRef.current.getAudioCurrentTime() : playerRef.current.position;

      const heartbeat = JSON.stringify({
        type: 'PLAYBACK_HEARTBEAT',
        fromPeerId: myPeerIdRef.current,
        trackId,
        position: currentTime,
        sentAt: Date.now(),
        isPlaying: Boolean(playerRef.current.isPlaying)
      });

      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          try {
            channel.send(heartbeat);
          } catch {}
        }
      });
    };

    const stopHeartbeat = createWorkerTimer(sendHeartbeat, 250);
    return () => {
      stopHeartbeat();
    };
  }, [joinedRoom]);

  // Periodic direct P2P ping across active DataChannels for sub-5ms latency measurement
  useEffect(() => {
    const pingPeers = () => {
      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          try {
            channel.send(JSON.stringify({ type: 'P2P_PING', t1: Date.now() }));
          } catch {}
        }
      });
    };
    const stopPing = createWorkerTimer(pingPeers, 1200);
    return () => stopPing();
  }, [joinedRoom]);

  // Handle requests for local P2P audio files
  useEffect(() => {
    const onTrackNeeded = (e) => {
      const neededTrackId = e.detail?.trackId;
      if (!neededTrackId) return;
      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          try {
            channel.send(JSON.stringify({ type: 'REQUEST_PLAY_TRACK', trackId: neededTrackId }));
          } catch {}
        }
      });
    };
    window.addEventListener('reveria:p2p-track-needed', onTrackNeeded);
    return () => window.removeEventListener('reveria:p2p-track-needed', onTrackNeeded);
  }, []);

  // Tab Visibility & Network Handover: seamlessly refresh state without destroying healthy DataChannels!
  useEffect(() => {
    const handleTabResume = () => {
      const active = joinedRoomRef.current || sessionStorage.getItem('reveria:active_jam_room');
      if (!document.hidden && active) {
        addLog('SYS', 'Window focus active: Synchronizing room state.');
        apiRequest(`/session/poll?roomId=${active}&peerId=${myPeerIdRef.current}`)
          .then((data) => {
            if (data?.ok) {
              if (data.currentPlayback) {
                handlePlaybackSync({ ...data.currentPlayback, currentServerTime: data.serverTime });
              }
              if (Array.isArray(data.playlist)) {
                setCollabPlaylist(data.playlist);
              }
            }
          })
          .catch(() => {});
      }
    };

    const handleNetworkOnline = async () => {
      const active = joinedRoomRef.current || sessionStorage.getItem('reveria:active_jam_room');
      if (!active) return;
      addLog('NET', 'Network interface reconnected: Fast mesh recovery initiated.');
      // 1. Immediately wipe reconnect cooldowns so recovery is instantaneous (< 300ms)
      lastReconnectAttemptRef.current.clear();
      // 2. Perform fast ICE restart on all peers without destroying instances
      for (const [id, peer] of peersRef.current.entries()) {
        try {
          if (peer.connection && !['closed', 'failed'].includes(peer.connection.connectionState)) {
            if (myPeerIdRef.current > id) {
              const offer = await peer.connection.createOffer({ iceRestart: true });
              await peer.connection.setLocalDescription(offer);
              dispatchSignal(id, { type: 'offer', sdp: offer.sdp });
            } else {
              dispatchSignal(id, { type: 'reconnect_request' });
            }
          } else {
            closePeer(id);
            createPeer(id, myPeerIdRef.current > id);
          }
        } catch {
          closePeer(id);
          createPeer(id, myPeerIdRef.current > id);
        }
      }
      // 3. Fast signal poll
      try {
        const data = await apiRequest(`/session/poll?roomId=${active}&peerId=${myPeerIdRef.current}`);
        if (data?.ok && data.currentPlayback) {
          handlePlaybackSync({ ...data.currentPlayback, currentServerTime: data.serverTime });
        }
      } catch {}
    };

    document.addEventListener('visibilitychange', handleTabResume);
    window.addEventListener('focus', handleTabResume);
    window.addEventListener('online', handleNetworkOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleTabResume);
      window.removeEventListener('focus', handleTabResume);
      window.removeEventListener('online', handleNetworkOnline);
    };
  }, [handlePlaybackSync, addLog, dispatchSignal, createPeer, closePeer]);

  // Join Room
  const joinRoom = useCallback(async (codeToJoin) => {
    const targetCode = (codeToJoin || roomId || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(targetCode)) {
      setStatus('Use 3–64 letters, numbers, hyphens, or underscores.');
      return false;
    }

    try {
      setStatus(`Joining jam "${targetCode}"…`);
      const result = await apiRequest('/session/rooms', {
        method: 'POST',
        body: JSON.stringify({
          roomId: targetCode,
          peerId: myPeerIdRef.current,
          user: { email: user?.email, role: user?.role }
        })
      });

      if (!result?.ok) {
        setStatus(result?.error || 'Unable to join jam room.');
        addLog('ERR', `Failed to join room: ${result?.error}`);
        return false;
      }

      joinedRoomRef.current = targetCode;
      setJoinedRoom(targetCode);
      setRoomId(targetCode);
      playerRef.current?.resetRoomVersion?.(targetCode);

      // Persist across tab switches and refreshes ONLY on /session!
      try {
        sessionStorage.setItem('reveria:active_jam_room', targetCode);
        if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname === '/session') {
          window.history.replaceState({}, '', `/session?room=${targetCode}`);
        }
      } catch {}

      if (result.playlist && result.playlist.length > 0) {
        setCollabPlaylist(result.playlist);
      } else {
        const source = (tracksRef.current && tracksRef.current.length > 0) ? tracksRef.current : DEFAULT_ROOM_TRACKS;
        const initialTracks = source.slice(0, 5).map((t) => ({
          id: t._id || t.id,
          _id: t._id || t.id,
          title: t.title,
          artist: t.artist,
          duration: t.duration,
          type: 'Cloud',
          audioSrc: t.audioSrc,
          imageSrc: t.imageSrc,
          imageColor: t.imageColor,
          addedBy: 'Riveria Haven'
        }));
        setCollabPlaylist(initialTracks);
        broadcastPlaylist(initialTracks);
      }
      if (result.currentPlayback) {
        try {
          handlePlaybackSync({
            ...result.currentPlayback,
            roomId: targetCode,
            currentServerTime: result.serverTime
          });
        } catch {}
      }

      setStatus(`Connected to jam "${targetCode}". Handshaking with ${result.peers.length} active peer(s)…`);
      addLog('ROOM', `Joined jam room "${targetCode}" (${result.peers.length} existing peer(s)).`);

      // Announce join via socket if available
      socketRef.current?.emit('jam:join', { roomId: targetCode }, () => {});

      // Initiate WebRTC negotiation with existing peers
      for (const p of result.peers) {
        if (p.peerId !== myPeerIdRef.current) {
          const peer = createPeer(p.peerId, true);
          const offer = await peer.connection.createOffer();
          await peer.connection.setLocalDescription(offer);
          await dispatchSignal(p.peerId, { type: 'offer', sdp: offer.sdp });
          addLog('SDP', `Dispatched WebRTC offer to peer ${p.peerId.slice(0, 8)}.`);
        }
      }
      return true;
    } catch (err) {
      if (!joinedRoomRef.current) {
        setStatus('Unable to connect to jam room. Verify connection.');
      }
      addLog('ERR', `Room connection error: ${err.message}`);
      return false;
    }
  }, [roomId, user, createPeer, dispatchSignal, handlePlaybackSync, addLog]);

  // Auto-reconnect saved room on mount ONLY if actively on /session
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/session') {
      const saved = getSavedRoom();
      if (saved && !joinedRoomRef.current) {
        joinRoom(saved);
      }
    }
  }, [joinRoom]);

  // One-click Create Jam Room
  const handleCreateRoom = useCallback(() => {
    const newCode = generateRoomCode();
    setRoomId(newCode);
    joinRoom(newCode);
  }, [joinRoom]);

  // Leave Room explicitly
  const handleLeaveRoom = useCallback(async () => {
    const roomToLeave = joinedRoomRef.current || joinedRoom;
    if (roomToLeave) {
      joinedRoomRef.current = '';
      try {
        sessionStorage.removeItem('reveria:active_jam_room');
        localStorage.removeItem('reveria:active_jam_room');
        if (typeof window !== 'undefined' && window.history?.replaceState && window.location.pathname === '/session') {
          window.history.replaceState({}, '', '/session');
        }
      } catch {}

      await apiRequest('/session/leave', {
        method: 'POST',
        body: JSON.stringify({ roomId: roomToLeave, peerId: myPeerIdRef.current })
      }).catch(() => {});

      playerRef.current?.resetRoomVersion?.(roomToLeave);
      lastPolledVersionRef.current = 0;
      lastProcessedVersionRef.current = 0;
      peersRef.current.forEach((_, id) => closePeer(id));
      setJoinedRoom('');
      setPeersList([]);
      setStatus('Disconnected from jam room.');
      addLog('ROOM', 'Left jam room.');
    }
  }, [joinedRoom, closePeer, addLog]);

  // Automated Real-Time Playback Synchronization driven by user transport actions across entire app!
  useEffect(() => {
    const onJamAction = (e) => {
      if (isIncomingSyncRef.current) return;
      const detail = e.detail;
      const activeRoom = joinedRoomRef.current || joinedRoom || sessionStorage.getItem('reveria:active_jam_room');
      if (!activeRoom || !detail?.track) return;

      const targetId = detail.track._id || detail.track.id;
      const serverTimeEst = Date.now() + (playerRef.current?.clockSkew || 0);
      const scheduledStartTime = serverTimeEst + 40; // Tight 40ms lookahead for instant synchronized start

      const actionPayload = {
        type: 'PLAYBACK_SYNC',
        roomId: activeRoom,
        action: detail.action || 'update',
        trackId: targetId,
        track: {
          _id: targetId,
          id: targetId,
          title: detail.track.title,
          artist: detail.track.artist,
          duration: detail.track.duration,
          type: detail.track.type,
          audioSrc: detail.track.audioSrc,
          imageSrc: detail.track.imageSrc,
          imageColor: detail.track.imageColor
        },
        position: detail.position || 0,
        isPlaying: Boolean(detail.isPlaying),
        timestamp: Date.now(),
        serverTime: serverTimeEst,
        scheduledStartTime,
        fromPeerId: myPeerIdRef.current,
        seq: ++localSeqRef.current
      };

      // 1. Direct WebRTC DataChannel (sub-10ms peer-to-peer sync)
      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          try {
            channel.send(JSON.stringify(actionPayload));
          } catch {}
        }
      });

      // 2. Socket.io room broadcast (if connected)
      if (socketRef.current?.connected) {
        socketRef.current.emit('jam:playback-sync', { roomId: activeRoom, currentPlayback: actionPayload });
      }

      // 3. Pseudo-Server REST Sync (persists in MongoDB and atomically increments room version)
      apiRequest('/session/sync', {
        method: 'POST',
        body: JSON.stringify({
          roomId: activeRoom,
          currentPlayback: actionPayload
        })
      }).catch(() => {});

      // 4. If playing a private local file, stream its binary buffer to connected peers across WebRTC DataChannel
      if (detail.track?.type === 'Local' || (targetId && String(targetId).startsWith('local-'))) {
        const localMatch = playerRef.current?.localTracks?.find((t) => (t._id || t.id) === targetId);
        if (localMatch) {
          streamLocalTrackToPeers(localMatch);
        }
      }
    };

    window.addEventListener('reveria:jam-action', onJamAction);
    return () => window.removeEventListener('reveria:jam-action', onJamAction);
  }, [joinedRoom]);

  // Broadcast Collab Playlist to All Peers
  const broadcastPlaylist = useCallback((newPlaylist) => {
    setCollabPlaylist(newPlaylist);
    const activeRoom = joinedRoomRef.current || joinedRoom || sessionStorage.getItem('reveria:active_jam_room');
    if (!activeRoom) return;

    peersRef.current.forEach(({ channel }) => {
      if (channel?.readyState === 'open') {
        try {
          channel.send(JSON.stringify({ type: 'PLAYLIST_SYNC', playlist: newPlaylist }));
        } catch {}
      }
    });

    if (socketRef.current?.connected) {
      socketRef.current.emit('jam:playlist-sync', { roomId: activeRoom, playlist: newPlaylist });
    }

    apiRequest('/session/playlist', {
      method: 'POST',
      body: JSON.stringify({ roomId: activeRoom, playlist: newPlaylist })
    }).catch(() => {});
  }, [joinedRoom]);

  // Add Cloud Track to Collaborative Playlist
  const handleAddCloudTrack = useCallback((track) => {
    const trackId = track._id || track.id;
    const item = {
      id: trackId,
      _id: trackId,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      type: 'Cloud',
      audioSrc: track.audioSrc,
      imageSrc: track.imageSrc,
      imageColor: track.imageColor,
      addedBy: user?.email || 'Listener'
    };
    const next = [...collabPlaylist, item];
    broadcastPlaylist(next);
    setShowAddModal(false);
    addLog('QUEUE', `Added "${track.title}" (Cloud) to Collaborative Playlist.`);
  }, [collabPlaylist, user, broadcastPlaylist, addLog]);

  // Add Local Track to Collaborative Playlist (Zero Server Logging!)
  const handleAddLocalTrack = useCallback((track) => {
    const trackId = track._id || track.id;
    const item = {
      id: trackId,
      _id: trackId,
      title: track.title,
      artist: track.artist || 'This device',
      duration: track.duration || 'Local',
      type: 'Local',
      addedBy: `${user?.email || 'Peer'} (P2P Private)`
    };
    const next = [...collabPlaylist, item];
    broadcastPlaylist(next);
    setShowAddModal(false);
    addLog('QUEUE', `Added local file "${track.title}" to Collaborative Playlist (P2P Private).`);
  }, [collabPlaylist, user, broadcastPlaylist, addLog]);

  // Play a track from Collaborative Playlist
  const handlePlayCollabTrack = useCallback(async (item) => {
    const trackId = item.id || item._id;
    const localMatch = player.localTracks.find((t) => (t._id || t.id) === trackId);
    const cloudMatch = tracksRef.current.find((t) => (t._id || t.id) === trackId);
    const effectiveQueue = collabPlaylist.length > 0 ? collabPlaylist : [...tracksRef.current, ...player.localTracks];

    if (localMatch) {
      player.playTrack(localMatch, effectiveQueue);
      streamLocalTrackToPeers(localMatch);
    } else if (cloudMatch) {
      player.playTrack(cloudMatch, effectiveQueue);
    } else {
      const fallbackCloud = item.type === 'Cloud' || !item.type ? {
        _id: trackId,
        id: trackId,
        title: item.title,
        artist: item.artist,
        duration: item.duration,
        type: 'Cloud',
        audioSrc: item.audioSrc || `/tracks/${trackId}/stream`,
        imageSrc: item.imageSrc || '/covers/default.png',
        imageColor: item.imageColor || 'bg-gradient-to-br from-purple-600 to-indigo-950'
      } : null;

      if (fallbackCloud) {
        player.playTrack(fallbackCloud, effectiveQueue);
      } else {
        peersRef.current.forEach(({ channel }) => {
          if (channel?.readyState === 'open') {
            channel.send(JSON.stringify({ type: 'REQUEST_PLAY_TRACK', trackId }));
          }
        });
        addLog('P2P_FILE', `Requested peer device to stream "${item.title}" to the room...`);
      }
    }
  }, [player, streamLocalTrackToPeers, collabPlaylist, addLog]);

  const copyRoomInvite = useCallback(() => {
    const activeRoom = joinedRoomRef.current || joinedRoom;
    if (!activeRoom) return;
    const inviteUrl = `${window.location.origin}/session?room=${activeRoom}&invite=true`;
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [joinedRoom]);

  const value = {
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
    broadcastPlaylist,
    handleAddCloudTrack,
    handleAddLocalTrack,
    handlePlayCollabTrack,
    copyRoomInvite,
    streamLocalTrackToPeers
  };

  return <JamContext.Provider value={value}>{children}</JamContext.Provider>;
}

export function useJam() {
  const context = useContext(JamContext);
  if (!context) {
    throw new Error('useJam must be used within a JamProvider');
  }
  return context;
}
