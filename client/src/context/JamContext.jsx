import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';
import { apiRequest, getAccessToken } from '../services/api';

const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
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

const JamContext = createContext(null);

export function JamProvider({ children }) {
  const player = usePlayer();
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const { user } = useAuth();

  const myPeerIdRef = useRef(`peer-${crypto.randomUUID().slice(0, 8)}`);
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const tracksRef = useRef([]);
  const pollTimerRef = useRef(null);
  const signalingModeRef = useRef('socket'); // 'socket' or 'rest'
  const activeIncomingTransferRef = useRef(null);
  const joinedRoomRef = useRef('');
  const isIncomingSyncRef = useRef(false);

  // Persistent room state restored across route navigation and browser tabs
  const getSavedRoom = () => {
    if (typeof window === 'undefined') return '';
    try {
      const query = new URLSearchParams(window.location.search).get('room');
      if (query) return query.toUpperCase();
      return sessionStorage.getItem('reveria:active_jam_room') || localStorage.getItem('reveria:active_jam_room') || '';
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

    isIncomingSyncRef.current = true;
    playerRef.current?.syncPlayback(payload, [...tracksRef.current, ...collabPlaylistRef.current]);
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

  // Stream local audio file bytes across WebRTC DataChannel directly to connected peers
  const streamLocalTrackToPeers = useCallback(async (track) => {
    if (!track?.rawFile) return;
    try {
      addLog('P2P_FILE', `Broadcasting private audio stream for "${track.title}" to peer(s)...`);
      const buffer = await track.rawFile.arrayBuffer();
      const metaPacket = {
        type: 'START_AUDIO_TRANSFER',
        trackId: track._id,
        title: track.title,
        artist: track.artist,
        mimeType: track.rawFile.type || 'audio/mpeg',
        totalBytes: buffer.byteLength
      };

      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          channel.send(JSON.stringify(metaPacket));
        }
      });

      const CHUNK_SIZE = 16384;
      for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
        const slice = buffer.slice(offset, offset + CHUNK_SIZE);
        peersRef.current.forEach(({ channel }) => {
          if (channel?.readyState === 'open') {
            channel.send(slice);
          }
        });
        if (offset % (CHUNK_SIZE * 16) === 0) {
          await new Promise((r) => setTimeout(r, 4));
        }
      }

      peersRef.current.forEach(({ channel }) => {
        if (channel?.readyState === 'open') {
          channel.send(JSON.stringify({ type: 'END_AUDIO_TRANSFER', trackId: track._id }));
        }
      });
      addLog('P2P_FILE', `P2P audio stream for "${track.title}" received by peer device(s).`);
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
        if (collabPlaylist.length > 0) {
          channel.send(JSON.stringify({ type: 'PLAYLIST_SYNC', playlist: collabPlaylist }));
        }
      };

      channel.onmessage = (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            const transfer = activeIncomingTransferRef.current;
            if (transfer) {
              transfer.chunks.push(event.data);
              transfer.receivedBytes += event.data.byteLength;
            }
            return;
          }

          const packet = JSON.parse(event.data);
          if (packet.type === 'PLAYBACK_SYNC') {
            handlePlaybackSync(packet);
          } else if (packet.type === 'PLAYLIST_SYNC') {
            handlePlaylistSync(packet.playlist);
          } else if (packet.type === 'START_AUDIO_TRANSFER') {
            activeIncomingTransferRef.current = {
              trackId: packet.trackId,
              title: packet.title,
              artist: packet.artist,
              mimeType: packet.mimeType || 'audio/mpeg',
              chunks: [],
              receivedBytes: 0,
              totalBytes: packet.totalBytes
            };
            addLog('P2P_FILE', `Receiving private audio stream for "${packet.title}" from peer...`);
          } else if (packet.type === 'END_AUDIO_TRANSFER') {
            const transfer = activeIncomingTransferRef.current;
            if (transfer && transfer.trackId === packet.trackId) {
              const blob = new Blob(transfer.chunks, { type: transfer.mimeType });
              const localUrl = URL.createObjectURL(blob);
              const p2pTrack = {
                _id: transfer.trackId,
                title: transfer.title,
                artist: transfer.artist || 'Peer Device',
                type: 'Local',
                localUrl,
                imageColor: 'bg-gradient-to-br from-cyan-700 via-blue-800 to-slate-950'
              };
              addLog('P2P_FILE', `P2P audio stream for "${transfer.title}" loaded in RAM! Playing in real time.`);
              player.playTrack(p2pTrack);
              activeIncomingTransferRef.current = null;
            }
          } else if (packet.type === 'REQUEST_PLAY_TRACK') {
            const match = player.localTracks.find((t) => t._id === packet.trackId);
            if (match) {
              streamLocalTrackToPeers(match);
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
      if (['failed', 'closed', 'disconnected'].includes(connection.connectionState)) {
        closePeer(peerId);
      }
    };

    peersRef.current.set(peerId, peer);
    updatePeersState();
    return peer;
  }, [closePeer, dispatchSignal, handlePlaybackSync, handlePlaylistSync, collabPlaylist, addLog, updatePeersState, player, streamLocalTrackToPeers]);

  // Handle incoming WebRTC signal (offer/answer/candidate)
  const processSignal = useCallback(async (fromId, signal) => {
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
        dispatchSignal(fromId, { type: 'answer', sdp: answer.sdp });
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
      if (peersRef.current.size === 0) {
        setStatus('Negotiating peer connection mesh…');
      }
      addLog('ERR', `Signaling negotiation retry with peer ${fromId.slice(0, 8)}.`);
    }
  }, [createPeer, dispatchSignal, addLog]);

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
      setTimeout(() => {
        addLog('NET', 'Activated ultra-resilient HTTP REST signaling.');
      }, 0);
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [createPeer, closePeer, processSignal, handlePlaybackSync, handlePlaylistSync, addLog]);

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

        const data = await apiRequest(`/session/poll?roomId=${curRoom}&peerId=${myPeerIdRef.current}`);
        if (!data?.ok) return;

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

        // 3. Auto-synchronize playback if pseudo-server holds updated room state
        if (data.currentPlayback) {
          handlePlaybackSync({
            ...data.currentPlayback,
            roomId: curRoom,
            serverTime: data.serverTime
          });
        }

        // 4. Detect new peers that we haven't handshaked with
        if (Array.isArray(data.peers)) {
          for (const remote of data.peers) {
            if (remote.peerId !== myPeerIdRef.current && !peersRef.current.has(remote.peerId)) {
              if (myPeerIdRef.current > remote.peerId) {
                addLog('JOIN', `Discovered peer ${remote.peerId.slice(0, 8)}. Initiating WebRTC offer...`);
                const peer = createPeer(remote.peerId, true);
                const offer = await peer.connection.createOffer();
                await peer.connection.setLocalDescription(offer);
                await dispatchSignal(remote.peerId, { type: 'offer', sdp: offer.sdp });
              }
            }
          }
        }
      } catch {}
    };

    poll();
    pollTimerRef.current = setInterval(poll, 800);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [joinedRoom, createPeer, dispatchSignal, processSignal, handlePlaybackSync, addLog]);

  // Tab Visibility & Focus Recovery: immediately refresh state when user switches back to browser tab!
  useEffect(() => {
    const handleTabResume = () => {
      const active = joinedRoomRef.current || sessionStorage.getItem('reveria:active_jam_room');
      if (!document.hidden && active) {
        addLog('SYS', 'Browser tab active: Refreshing room mesh and synchronization.');
        apiRequest(`/session/poll?roomId=${active}&peerId=${myPeerIdRef.current}`)
          .then((data) => {
            if (data?.ok) {
              if (data.currentPlayback) {
                handlePlaybackSync({ ...data.currentPlayback, serverTime: data.serverTime });
              }
              if (Array.isArray(data.playlist)) {
                setCollabPlaylist(data.playlist);
              }
            }
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleTabResume);
    window.addEventListener('focus', handleTabResume);
    return () => {
      document.removeEventListener('visibilitychange', handleTabResume);
      window.removeEventListener('focus', handleTabResume);
    };
  }, [handlePlaybackSync, addLog]);

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

      // Persist across tab switches and refreshes!
      try {
        sessionStorage.setItem('reveria:active_jam_room', targetCode);
        localStorage.setItem('reveria:active_jam_room', targetCode);
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState({}, '', `${window.location.pathname}?room=${targetCode}`);
        }
      } catch {}

      if (result.playlist) setCollabPlaylist(result.playlist);
      if (result.currentPlayback) {
        try {
          handlePlaybackSync({
            ...result.currentPlayback,
            serverTime: result.serverTime
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

  // Auto-reconnect saved room on mount if user is authenticated
  useEffect(() => {
    const saved = getSavedRoom();
    if (saved && !joinedRoomRef.current) {
      joinRoom(saved);
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
      } catch {}

      await apiRequest('/session/leave', {
        method: 'POST',
        body: JSON.stringify({ roomId: roomToLeave, peerId: myPeerIdRef.current })
      }).catch(() => {});

      playerRef.current?.resetRoomVersion?.(roomToLeave);
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
      const scheduledStartTime = serverTimeEst + 150; // Single-Speaker 150ms lookahead for synchronized audio start

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
        fromPeerId: myPeerIdRef.current
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

    if (localMatch) {
      player.playTrack(localMatch, [...tracksRef.current, ...player.localTracks]);
      streamLocalTrackToPeers(localMatch);
    } else if (cloudMatch) {
      player.playTrack(cloudMatch, [...tracksRef.current, ...player.localTracks]);
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
        player.playTrack(fallbackCloud, [...tracksRef.current, ...collabPlaylist]);
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
    const inviteUrl = `${window.location.origin}/?room=${activeRoom}`;
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
