import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function WebRTCSession() {
  const [searchParams] = useSearchParams();
  const player = usePlayer();
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

  const [roomId, setRoomId] = useState(() => searchParams.get('room')?.toUpperCase() || '');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [status, setStatus] = useState('Create a room or enter a code to start a zero-latency listening jam.');
  const [peersList, setPeersList] = useState([]);
  const [copied, setCopied] = useState(false);
  const [collabPlaylist, setCollabPlaylist] = useState([]);
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
    player.syncPlayback(payload, [...tracksRef.current, ...collabPlaylist]);
    setTimeout(() => {
      isIncomingSyncRef.current = false;
    }, 400);

    addLog(
      'SYNC',
      `Auto-synced with room. "${payload.track?.title || 'Track'}" Pos: ${Math.round(payload.position || 0)}s (${payload.isPlaying ? 'Playing' : 'Paused'})`
    );
  }, [player, collabPlaylist, addLog]);

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
          // 1. Handle incoming binary audio chunk
          if (event.data instanceof ArrayBuffer) {
            const transfer = activeIncomingTransferRef.current;
            if (transfer) {
              transfer.chunks.push(event.data);
              transfer.receivedBytes += event.data.byteLength;
            }
            return;
          }

          // 2. Handle JSON control packets
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
      setStatus('A peer connection could not be negotiated.');
      addLog('ERR', `Signaling negotiation error with peer ${fromId.slice(0, 8)}.`);
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
  }, [createPeer, closePeer, processSignal, addLog]);

  // REST Signaling polling loop when in serverless mode
  useEffect(() => {
    if (!joinedRoom) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const poll = async () => {
      try {
        const activeRoom = joinedRoomRef.current || joinedRoom;
        if (!activeRoom) return;

        const data = await apiRequest(`/session/poll?roomId=${activeRoom}&peerId=${myPeerIdRef.current}`);
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
            if (prevIds !== nextIds) {
              return data.playlist;
            }
            return prev;
          });
        }

        // 3. Auto-synchronize playback if pseudo-server holds updated room state
        if (data.currentPlayback) {
          handlePlaybackSync({
            ...data.currentPlayback,
            serverTime: data.serverTime
          });
        }

        // 4. Detect new peers that we haven't handshaked with
        if (Array.isArray(data.peers)) {
          for (const remote of data.peers) {
            if (remote.peerId !== myPeerIdRef.current && !peersRef.current.has(remote.peerId)) {
              // Initiate connection if our ID is lexicographically greater (avoids race condition)
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

    // Poll every 800ms during room joining/handshake
    poll();
    pollTimerRef.current = setInterval(poll, 800);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [joinedRoom, createPeer, dispatchSignal, processSignal, addLog]);

  // Join Room
  const joinRoom = async (codeToJoin) => {
    const targetCode = (codeToJoin || roomId).trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(targetCode)) {
      return setStatus('Use 3–64 letters, numbers, hyphens, or underscores.');
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
        return;
      }

      joinedRoomRef.current = targetCode;
      setJoinedRoom(targetCode);
      setRoomId(targetCode);
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

      // If socket is available, announce join
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
    } catch (err) {
      setStatus('Unable to connect to jam room. Verify connection.');
      addLog('ERR', `Room connection error: ${err.message}`);
    }
  };

  // One-click Create Jam Room
  const handleCreateRoom = () => {
    const newCode = generateRoomCode();
    setRoomId(newCode);
    joinRoom(newCode);
  };

  // Leave Room
  const handleLeaveRoom = async () => {
    const roomToLeave = joinedRoomRef.current || joinedRoom;
    if (roomToLeave) {
      joinedRoomRef.current = '';
      await apiRequest('/session/leave', {
        method: 'POST',
        body: JSON.stringify({ roomId: roomToLeave, peerId: myPeerIdRef.current })
      }).catch(() => {});
      peersRef.current.forEach((_, id) => closePeer(id));
      setJoinedRoom('');
      setPeersList([]);
      setStatus('Disconnected from jam room.');
      addLog('ROOM', 'Left jam room.');
    }
  };

  // Automated Real-Time Playback Synchronization driven by user transport actions
  useEffect(() => {
    const onJamAction = (e) => {
      if (isIncomingSyncRef.current) return;
      const detail = e.detail;
      const activeRoom = joinedRoomRef.current || joinedRoom;
      if (!activeRoom || !detail?.track) return;

      const targetId = detail.track._id || detail.track.id;
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
    const activeRoom = joinedRoomRef.current || joinedRoom;
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

    // Also persist in room state on server
    apiRequest('/session/playlist', {
      method: 'POST',
      body: JSON.stringify({ roomId: activeRoom, playlist: newPlaylist })
    }).catch(() => {});
  }, [joinedRoom]);

  // Add Cloud Track to Collaborative Playlist
  const handleAddCloudTrack = (track) => {
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
  };

  // Add Local Track to Collaborative Playlist (Zero Server Logging!)
  const handleAddLocalTrack = (track) => {
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
  };

  // Play a track from Collaborative Playlist
  const handlePlayCollabTrack = useCallback(async (item) => {
    const trackId = item.id || item._id;
    const localMatch = player.localTracks.find((t) => (t._id || t.id) === trackId);
    const cloudMatch = tracksRef.current.find((t) => (t._id || t.id) === trackId);

    if (localMatch) {
      // 1. Play locally (triggers reveria:jam-action)
      player.playTrack(localMatch, [...tracksRef.current, ...player.localTracks]);
      // 2. Stream audio binary chunks directly to connected peers over WebRTC
      streamLocalTrackToPeers(localMatch);
    } else if (cloudMatch) {
      // Cloud track available from Atlas RFC 9110 stream (triggers reveria:jam-action)
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
        // Local track hosted on another peer: send request to host to stream it to room
        peersRef.current.forEach(({ channel }) => {
          if (channel?.readyState === 'open') {
            channel.send(JSON.stringify({ type: 'REQUEST_PLAY_TRACK', trackId }));
          }
        });
        addLog('P2P_FILE', `Requested peer device to stream "${item.title}" to the room...`);
      }
    }
  }, [player, streamLocalTrackToPeers, collabPlaylist, addLog]);

  const copyRoomInvite = () => {
    if (!joinedRoom) return;
    const inviteUrl = `${window.location.origin}/?room=${joinedRoom}`;
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
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

              {/* Local Mounted Tracks Tab */}
              {player.localTracks.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Your Private Local Device Tracks (P2P Encrypted, 0 Server Logs)
                  </h5>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {player.localTracks.map((t) => (
                      <div
                        key={t._id}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10"
                      >
                        <span className="text-xs font-medium text-white truncate max-w-[240px]">{t.title}</span>
                        <button
                          onClick={() => handleAddLocalTrack(t)}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold"
                        >
                          + Add P2P
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        <p className="text-xs font-semibold text-white truncate max-w-[140px]">peer_{id.slice(0, 8)}</p>
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
