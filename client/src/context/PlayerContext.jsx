import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../services/api';
import { audioCoordinator } from '../services/audioCoordinator';
import { PlayerContext } from './playerContextDef';
import { extractAudioMetadata } from '../utils/audioMetadata';
import { dspEngine } from '../services/dspEngine';

const STATIC_TRACK_MAP = {
  sunflower: '/audio/post-malone-sunflower.mp3',
  birds: '/audio/imagine-dragons-birds.mp3',
  thunder: '/audio/imagine-dragons-thunder.mp3',
  believer: '/audio/imagine-dragons-believer.mp3',
  happier: '/audio/marshmello-happier.mp3'
};

function sourceFor(track) {
  if (!track) return '';
  if (track.localUrl) return track.localUrl;
  const tid = track._id || track.id;
  const isLocal = track.type === 'Local' || (tid && String(tid).startsWith('local-'));
  if (isLocal) {
    // For local private audio, only in-memory blob URLs are valid; never request from server!
    return track.localUrl || '';
  }

  // Fast Edge CDN path for the 5 movement tracks (< 15ms start time)
  const titleKey = String(track.title || '').trim().toLowerCase();
  for (const [key, path] of Object.entries(STATIC_TRACK_MAP)) {
    if (titleKey.includes(key)) {
      return path;
    }
  }

  if (track.audioSrc) return track.audioSrc;
  if (track.audioFile?.filename && tid) return apiUrl(`/tracks/${tid}/stream`);
  if (tid) return apiUrl(`/tracks/${tid}/stream`);
  return '';
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);
  const currentTrackRef = useRef(null);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const localTracksRef = useRef([]);

  // Queue & Navigation state
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'

  // Volume & Mute state
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('reveria:volume');
    return saved !== null ? Number(saved) : 80;
  });
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(80);

  // Group Jam & Pseudo-Server Sync refs
  const roomVersionsRef = useRef(new Map());
  const scheduledTimerRef = useRef(null);
  const rateNudgeTimerRef = useRef(null);
  const lastRateNudgeTimeRef = useRef(0);
  const clockSkewRef = useRef(0);
  const clockSamplesRef = useRef([]);
  const lastTrackChangeTimeRef = useRef(0);
  const trackLoadingRef = useRef(null);
  const seekDebounceTimerRef = useRef(null);

  // Minimum-RTT Weighted Precision Cristian/NTP Clock Skew Estimator
  const calibrateClock = useCallback((skew, rtt = 50) => {
    if (typeof skew !== 'number' || !Number.isFinite(skew)) return;
    const safeRtt = Math.max(1, Number(rtt) || 50);
    clockSamplesRef.current.push({ skew, rtt: safeRtt, time: Date.now() });
    if (clockSamplesRef.current.length > 20) {
      clockSamplesRef.current.shift();
    }

    // Sort samples by round-trip time and isolate best 60% with least queue delay
    const sortedByRtt = [...clockSamplesRef.current].sort((a, b) => a.rtt - b.rtt);
    const bestSamples = sortedByRtt.slice(0, Math.max(1, Math.ceil(sortedByRtt.length * 0.6)));

    // RTT-squared inverse weighting (samples with lowest RTT receive exponentially higher trust)
    let totalWeight = 0;
    let weightedSkewSum = 0;
    bestSamples.forEach((sample) => {
      const weight = 1 / Math.pow(sample.rtt + 2, 2);
      totalWeight += weight;
      weightedSkewSum += sample.skew * weight;
    });

    const targetSkew = totalWeight > 0 ? weightedSkewSum / totalWeight : skew;

    // Smooth exponential filtering
    if (clockSkewRef.current === 0) {
      clockSkewRef.current = targetSkew;
    } else {
      clockSkewRef.current = clockSkewRef.current * 0.75 + targetSkew * 0.25;
    }
  }, []);

  // Continuous Dynamic Phase-Locked Loop (PLL) Engine
  const correctDrift = useCallback((remotePos) => {
    const audio = audioRef.current;
    if (!audio || audio.paused || !isPlayingRef.current) return;
    if (typeof remotePos !== 'number' || !Number.isFinite(remotePos)) return;

    const drift = remotePos - audio.currentTime;
    const absDrift = Math.abs(drift);

    // Zone 1: Haas Precedence Deadband (<= 18ms): Bit-perfect native 1.0x playback
    if (absDrift <= 0.018) {
      if (audio.playbackRate !== 1.0) {
        audio.playbackRate = 1.0;
      }
      return;
    }

    // Zone 3: Hard Phase-Snap (> 250ms): Snap immediately on seeks or tab un-minimize
    if (absDrift > 0.25) {
      audio.currentTime = remotePos;
      setPosition(remotePos);
      if (rateNudgeTimerRef.current) clearTimeout(rateNudgeTimerRef.current);
      audio.playbackRate = 1.0;
      return;
    }

    // Zone 2: Continuous Phase-Locked Loop (18ms - 250ms):
    // Smooth proportional slew without audible pitch warble
    const now = Date.now();
    if (!lastRateNudgeTimeRef.current || (now - lastRateNudgeTimeRef.current > 350)) {
      lastRateNudgeTimeRef.current = now;
      if (rateNudgeTimerRef.current) clearTimeout(rateNudgeTimerRef.current);

      // Proportional gain Kp = 0.08, clamped to ±0.025 (2.5% rate adjustment)
      const rateNudge = Math.max(-0.025, Math.min(0.025, drift * 0.08));
      audio.playbackRate = 1.0 + rateNudge;

      rateNudgeTimerRef.current = setTimeout(() => {
        if (audioRef.current) audioRef.current.playbackRate = 1.0;
      }, 450);
    }
  }, []);

  const resetRoomVersion = useCallback((roomId) => {
    if (roomId) {
      roomVersionsRef.current.delete(roomId.toLowerCase());
    } else {
      roomVersionsRef.current.clear();
    }
  }, []);

  // Sync ref with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    const audio = audioRef.current;
    audio.preload = 'auto';
    audioCoordinator.register(audio);
    if (typeof window !== 'undefined') {
      window.__riveriaAudio = audio;
    }

    const onTime = () => setPosition(audio.currentTime || 0);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      if (audio.src && audio.error && audio.error.code !== 0) {
        // Auto-heal network dropouts (code 2 = MEDIA_ERR_NETWORK) during mobile network handover
        if (audio.error.code === 2) {
          setTimeout(() => {
            if (audioRef.current && currentTrackRef.current) {
              const resumePos = audioRef.current.currentTime || 0;
              setError('');
              audioRef.current.src = sourceFor(currentTrackRef.current);
              audioRef.current.load();
              audioRef.current.currentTime = resumePos;
              audioRef.current.play().catch(() => {});
            }
          }, 1200);
          return;
        }
        setError('This audio track could not be loaded.');
      }
    };

    let stallWatchdog = null;
    const onWaitingOrStalled = () => {
      if (isPlayingRef.current) {
        if (stallWatchdog) clearTimeout(stallWatchdog);
        stallWatchdog = setTimeout(() => {
          if (audioRef.current && currentTrackRef.current && isPlayingRef.current) {
            const resumePos = audioRef.current.currentTime || 0;
            audioRef.current.src = sourceFor(currentTrackRef.current);
            audioRef.current.load();
            audioRef.current.currentTime = resumePos;
            audioRef.current.play().then(() => {
              setIsAutoplayBlocked(false);
            }).catch(() => {});
          }
        }, 2000);
      }
    };
    const onClearWatchdog = () => {
      if (stallWatchdog) clearTimeout(stallWatchdog);
    };

    const handleOnline = () => {
      setError('');
      if (audioRef.current && currentTrackRef.current && isPlayingRef.current) {
        const resumePos = audioRef.current.currentTime || 0;
        audioRef.current.src = sourceFor(currentTrackRef.current);
        audioRef.current.load();
        audioRef.current.currentTime = resumePos;
        audioRef.current.play().then(() => {
          setIsAutoplayBlocked(false);
        }).catch(() => {});
      }
    };

    const handleStopAll = () => {
      audio.pause();
      setIsPlaying(false);
    };

    const handleExclusiveClaimed = (e) => {
      if (e.detail?.source !== 'player-context') {
        audio.pause();
        setIsPlaying(false);
      }
    };

    // Mobile Web Autoplay Unlock: satisfy mobile browser gesture policies on user touch
    const unlockAudio = () => {
      const a = audioRef.current;
      if (a && currentTrackRef.current && isPlayingRef.current) {
        audioCoordinator.claimExclusivePlayback(a, 'player-context');
        if (a.paused) {
          a.play().then(() => {
            setIsAutoplayBlocked(false);
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('reveria:all-audio-stopped', handleStopAll);
    window.addEventListener('reveria:exclusive-audio-claimed', handleExclusiveClaimed);
    window.addEventListener('online', handleOnline);
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onClearWatchdog);
    audio.addEventListener('waiting', onWaitingOrStalled);
    audio.addEventListener('stalled', onWaitingOrStalled);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audioCoordinator.unregister(audio);
      if (stallWatchdog) clearTimeout(stallWatchdog);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('reveria:all-audio-stopped', handleStopAll);
      window.removeEventListener('reveria:exclusive-audio-claimed', handleExclusiveClaimed);
      window.removeEventListener('online', handleOnline);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onClearWatchdog);
      audio.removeEventListener('waiting', onWaitingOrStalled);
      audio.removeEventListener('stalled', onWaitingOrStalled);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      localTracksRef.current.forEach((track) => track.localUrl && URL.revokeObjectURL(track.localUrl));
    };
  }, []);

  // Isolate volume & mute updates so volume changes NEVER pause or reload audio!
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [isMuted, volume]);

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(100, Number(val)));
    setVolumeState(clamped);
    localStorage.setItem('reveria:volume', String(clamped));
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped / 100;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((muted) => {
      const next = !muted;
      if (next) {
        prevVolumeRef.current = volume;
        if (audioRef.current) audioRef.current.volume = 0;
      } else {
        if (audioRef.current) audioRef.current.volume = (prevVolumeRef.current || 80) / 100;
      }
      return next;
    });
  }, [volume]);

  const playTrack = useCallback(async (track, newQueue = null, autoPlay = true, fromSync = false) => {
    if (!track) return;
    const source = sourceFor(track);
    if (!source) {
      const isLocal = track.type === 'Local' || (track._id && String(track._id).startsWith('local-'));
      if (isLocal) {
        // Pending private P2P audio stream from peer: maintain state and await incoming chunks
        setError('');
        setCurrentTrack(track);
        return;
      }
      setError('This cloud track does not have a playable audio stream.');
      setCurrentTrack(track);
      return;
    }

    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      setQueue(newQueue);
      queueRef.current = newQueue;
    }

    const audio = audioRef.current;
    setError('');
    lastTrackChangeTimeRef.current = Date.now();

    // Broadcast track change immediately so peers start buffering simultaneously
    if (!fromSync) {
      window.dispatchEvent(
        new CustomEvent('reveria:jam-action', {
          detail: {
            action: 'track_change',
            track,
            isPlaying: autoPlay,
            position: 0
          }
        })
      );
    }

    const currentId = currentTrackRef.current?._id || currentTrackRef.current?.id;
    const nextId = track._id || track.id;
    const isDifferent = currentId !== nextId || !audio.src || (audio.src !== source && !audio.src.endsWith(source));

    if (isDifferent) {
      trackLoadingRef.current = nextId;
      audio.src = source;
      audio.preload = 'auto';
      audio.volume = isMuted ? 0 : volume / 100;
      audio.load();
      currentTrackRef.current = track;
      setCurrentTrack(track);
      setPosition(0);
      trackLoadingRef.current = null;
    }

    if (autoPlay) {
      try {
        dspEngine.init(audio);
        audioCoordinator.claimExclusivePlayback(audio, 'player-context');
        await audio.play();
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setIsAutoplayBlocked(true);
        } else if (err.name !== 'AbortError') {
          setError('Playback was blocked. Tap play again to allow audio.');
        }
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, isMuted, volume]);

  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    const nextIsPlaying = audio.paused;

    if (nextIsPlaying) {
      try {
        dspEngine.init(audio);
        audioCoordinator.claimExclusivePlayback(audio, 'player-context');
        await audio.play();
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
        setError('');
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setIsAutoplayBlocked(true);
        } else if (err.name !== 'AbortError') {
          setError('Playback was blocked by the browser.');
        }
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }

    window.dispatchEvent(
      new CustomEvent('reveria:jam-action', {
        detail: {
          action: nextIsPlaying ? 'play' : 'pause',
          track: currentTrack,
          isPlaying: nextIsPlaying,
          position: audio.currentTime || 0
        }
      })
    );
  }, [currentTrack]);

  const playNext = useCallback(() => {
    const currentQueue = queueRef.current.length > 0 ? queueRef.current : localTracksRef.current;
    if (!currentQueue || currentQueue.length === 0) return;

    if (repeatMode === 'one' && currentTrack) {
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    if (isShuffle && currentQueue.length > 1) {
      let randIdx;
      do {
        randIdx = Math.floor(Math.random() * currentQueue.length);
      } while (currentQueue[randIdx]._id === currentTrack?._id);
      playTrack(currentQueue[randIdx]);
      return;
    }

    const currentIndex = currentQueue.findIndex((t) => t._id === currentTrack?._id);
    if (currentIndex === -1) {
      playTrack(currentQueue[0]);
    } else if (currentIndex < currentQueue.length - 1) {
      playTrack(currentQueue[currentIndex + 1]);
    } else if (repeatMode === 'all') {
      playTrack(currentQueue[0]);
    }
  }, [currentTrack, isShuffle, repeatMode, playTrack]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setPosition(0);
      return;
    }

    const currentQueue = queueRef.current.length > 0 ? queueRef.current : localTracksRef.current;
    if (!currentQueue || currentQueue.length === 0) return;

    const currentIndex = currentQueue.findIndex((t) => t._id === currentTrack?._id);
    if (currentIndex > 0) {
      playTrack(currentQueue[currentIndex - 1]);
    } else {
      playTrack(currentQueue[currentQueue.length - 1]);
    }
  }, [currentTrack, playTrack]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Handle track ended auto-advance
  useEffect(() => {
    const audio = audioRef.current;
    const onEnded = () => {
      // Guard against race conditions and double-skips during transitions
      if (Date.now() - lastTrackChangeTimeRef.current < 2000) return;
      lastTrackChangeTimeRef.current = Date.now();
      playNext();
    };
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, [playNext]);

  const seek = useCallback((seconds, fromSync = false) => {
    const audio = audioRef.current;
    const target = Math.max(0, Math.min(seconds, Number.isFinite(audio.duration) ? audio.duration : seconds));
    audio.currentTime = target;
    setPosition(target);

    if (!fromSync && currentTrackRef.current) {
      if (seekDebounceTimerRef.current) clearTimeout(seekDebounceTimerRef.current);
      seekDebounceTimerRef.current = setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('reveria:jam-action', {
            detail: {
              action: 'seek',
              track: currentTrackRef.current,
              isPlaying: !audio.paused,
              position: target
            }
          })
        );
      }, 60);
    }
  }, []);

  const mountLocalFiles = useCallback(async (files) => {
    const audioFiles = [...files].filter((file) => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|aac|m4a|flac|webm)$/i.test(file.name));
    if (audioFiles.length === 0) return 0;

    const mounted = await Promise.all(
      audioFiles.map(async (file) => {
        const meta = await extractAudioMetadata(file);
        return {
          _id: `local-${crypto.randomUUID()}`,
          title: meta.title,
          artist: meta.artist,
          imageSrc: meta.thumbnailUrl,
          duration: 'Local',
          type: 'Local',
          imageColor: 'bg-gradient-to-br from-cyan-700 via-blue-800 to-slate-950',
          localUrl: URL.createObjectURL(file),
          fileSize: file.size,
          rawFile: file
        };
      })
    );

    setLocalTracks((tracks) => {
      const next = [...mounted, ...tracks];
      localTracksRef.current = next;
      return next;
    });
    return mounted.length;
  }, []);

  const addP2PTrack = useCallback((track) => {
    if (!track?._id || !track.localUrl) return;
    setLocalTracks((prev) => {
      const exists = prev.some((t) => t._id === track._id);
      if (exists) {
        return prev.map((t) => (t._id === track._id ? { ...t, ...track } : t));
      }
      const next = [track, ...prev];
      localTracksRef.current = next;
      return next;
    });
  }, []);

  const removeLocalTrack = useCallback((id) => {
    setLocalTracks((tracks) => {
      const track = tracks.find((item) => item._id === id);
      if (track?.localUrl) URL.revokeObjectURL(track.localUrl);
      if (track?.imageSrc && track.imageSrc.startsWith('blob:')) URL.revokeObjectURL(track.imageSrc);
      const next = tracks.filter((item) => item._id !== id);
      localTracksRef.current = next;
      return next;
    });

    if (currentTrack?._id === id) {
      const audio = audioRef.current;
      audio.pause();
      audio.src = '';
      setCurrentTrack(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
    }
  }, [currentTrack]);

  const syncPlayback = useCallback(async (payload, tracks = []) => {
    if (!payload) return;
    const {
      roomId,
      trackId,
      position: remotePosition,
      isPlaying: remoteIsPlaying,
      track: directTrack,
      timestamp,
      serverTime: recordedServerTime,
      currentServerTime,
      scheduledStartTime,
      version,
      action
    } = payload;

    const clientNow = Date.now();

    // 1. Clock Calibration (against central server time with minimum-RTT weighting)
    if (currentServerTime && typeof currentServerTime === 'number') {
      const instantaneousSkew = currentServerTime - clientNow;
      calibrateClock(instantaneousSkew, 60);
    }

    const roomKey = (roomId || 'default').toLowerCase();
    const incVersion = Number(version) || 0;
    const lastRoomVersion = roomVersionsRef.current.get(roomKey) || 0;

    const targetId = trackId || (typeof directTrack === 'string' ? directTrack : (directTrack?._id || directTrack?.id));
    const isLocalTrack = directTrack?.type === 'Local' || (targetId && String(targetId).startsWith('local-'));
    const allTracks = [...tracks, ...localTracksRef.current];
    const matchedTrack = allTracks.find((item) => (item._id || item.id) === targetId);
    let track = matchedTrack || (typeof directTrack === 'object' ? directTrack : null);
    if (!track && targetId) {
      track = {
        _id: targetId,
        id: targetId,
        title: directTrack?.title || (isLocalTrack ? 'Private P2P Audio' : 'Jam Track'),
        artist: directTrack?.artist || (isLocalTrack ? 'Peer Device' : 'Riveria Haven'),
        type: isLocalTrack ? 'Local' : 'Cloud',
        audioSrc: isLocalTrack ? '' : `/tracks/${targetId}/stream`
      };
    }
    if (!track) return;

    // Normalize track IDs
    track._id = track._id || targetId;
    track.id = track.id || targetId;

    const audio = audioRef.current;
    const isTargetPlaying = Boolean(remoteIsPlaying);
    const nowServerEst = clientNow + clockSkewRef.current;
    const currentId = currentTrackRef.current?._id || currentTrackRef.current?.id;
    const isDifferentTrack = currentId !== targetId || !audio.src;
    const isExplicitTrackChange = action === 'track_change' || isDifferentTrack;
    const isExplicitSeek = action === 'seek';

    // 2. Compute target position: track changes always start at 0s, seeks jump directly
    let targetPos = Math.max(0, Number(remotePosition) || 0);
    if (isExplicitTrackChange) {
      targetPos = 0;
    } else if (isExplicitSeek) {
      targetPos = Math.max(0, Number(remotePosition) || 0);
    } else if (isTargetPlaying) {
      // Catch-up for continuing streams: use server-measured elapsed delta if available
      if (currentServerTime && recordedServerTime && currentServerTime >= recordedServerTime) {
        const srvElapsed = (currentServerTime - recordedServerTime) / 1000;
        targetPos += Math.max(0, Math.min(3600, srvElapsed));
      } else {
        const originTime = recordedServerTime || (timestamp ? new Date(timestamp).getTime() : nowServerEst);
        const rawElapsed = (nowServerEst - originTime) / 1000;
        if (rawElapsed > 0 && rawElapsed < 6) {
          targetPos += rawElapsed;
        }
      }
    }

    // A. Track is different -> ALWAYS load and synchronize the room's track immediately!
    if (isDifferentTrack) {
      if (trackLoadingRef.current === targetId) return; // Prevent concurrent re-entry
      if (incVersion > 0) roomVersionsRef.current.set(roomKey, incVersion);
      if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);
      lastTrackChangeTimeRef.current = Date.now();

      // If local track and no localUrl in memory yet, hold state and notify JamContext to fetch P2P stream
      if (track.type === 'Local' && !track.localUrl) {
        const localCached = localTracksRef.current.find((t) => (t._id || t.id) === targetId);
        if (localCached?.localUrl) {
          track = localCached;
        } else {
          currentTrackRef.current = track;
          setCurrentTrack(track);
          setIsPlaying(isTargetPlaying);
          window.dispatchEvent(new CustomEvent('reveria:p2p-track-needed', { detail: { trackId: targetId } }));
          return;
        }
      }

      await playTrack(track, allTracks, false /* do not autoplay yet; schedule synchronously */, true /* fromSync */);

      // Scheduled Start Time Alignment (Acoustic Phase-Lock)
      const targetTime = Number(scheduledStartTime) || (nowServerEst + 40);
      const delayMs = targetTime - nowServerEst;
      const isHidden = typeof document !== 'undefined' && document.hidden;

      if (isTargetPlaying) {
        if (!isHidden && delayMs > 5 && delayMs < 100) {
          // Tight lookahead alignment (5-100ms) for simultaneous start in active window
          scheduledTimerRef.current = setTimeout(() => {
            try {
              audioCoordinator.claimExclusivePlayback(audio, 'player-context');
              if (targetPos > 0) {
                if (audio.readyState >= 1) {
                  audio.currentTime = targetPos;
                } else {
                  const onMeta = () => {
                    try { audio.currentTime = targetPos; } catch {}
                    audio.removeEventListener('loadedmetadata', onMeta);
                  };
                  audio.addEventListener('loadedmetadata', onMeta);
                }
              } else {
                audio.currentTime = 0;
              }
              setPosition(targetPos);
              audio.play().then(() => {
                setIsAutoplayBlocked(false);
              }).catch((err) => {
                if (err.name === 'NotAllowedError') setIsAutoplayBlocked(true);
              });
              setIsPlaying(true);
            } catch {}
          }, delayMs);
        } else {
          // Play immediately without delay (for minimized windows or delay <= 0)
          try {
            audioCoordinator.claimExclusivePlayback(audio, 'player-context');
            if (targetPos > 0) {
              if (audio.readyState >= 1) {
                audio.currentTime = targetPos;
              } else {
                const onMeta = () => {
                  try { audio.currentTime = targetPos; } catch {}
                  audio.removeEventListener('loadedmetadata', onMeta);
                };
                audio.addEventListener('loadedmetadata', onMeta);
              }
            } else {
              audio.currentTime = 0;
            }
            setPosition(targetPos);
            audio.play().then(() => {
              setIsAutoplayBlocked(false);
            }).catch((err) => {
              if (err.name === 'NotAllowedError') setIsAutoplayBlocked(true);
            });
            setIsPlaying(true);
          } catch {}
        }
      } else {
        if (targetPos > 0) {
          if (audio.readyState >= 1) {
            audio.currentTime = targetPos;
          } else {
            const onMeta = () => {
              try { audio.currentTime = targetPos; } catch {}
              audio.removeEventListener('loadedmetadata', onMeta);
            };
            audio.addEventListener('loadedmetadata', onMeta);
          }
        } else {
          audio.currentTime = 0;
        }
        setPosition(targetPos);
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    // B. Track is the same: check if this is a discrete command (action version > last)
    const isNewAction = incVersion > 0 && incVersion > lastRoomVersion;
    if (isNewAction) {
      roomVersionsRef.current.set(roomKey, incVersion);
    }

    // Explicit seek command: snap immediately without delay or rate nudging
    if (isExplicitSeek) {
      if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);
      audio.currentTime = targetPos;
      setPosition(targetPos);
      if (rateNudgeTimerRef.current) clearTimeout(rateNudgeTimerRef.current);
      audio.playbackRate = 1.0;
      if (isTargetPlaying && audio.paused) {
        try {
          audioCoordinator.claimExclusivePlayback(audio, 'player-context');
          audio.play().then(() => setIsAutoplayBlocked(false)).catch(() => {});
          setIsPlaying(true);
        } catch {}
      }
      return;
    }

    if (!isTargetPlaying) {
      // Pause command from room: immediate crisp pause, snap position, reset rate
      if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);
      if (!audio.paused) {
        audio.pause();
        setIsPlaying(false);
      }
      if (Math.abs(audio.currentTime - targetPos) > 0.04) {
        audio.currentTime = targetPos;
        setPosition(targetPos);
      }
      if (rateNudgeTimerRef.current) clearTimeout(rateNudgeTimerRef.current);
      audio.playbackRate = 1.0;
    } else {
      // Play command from room
      if (audio.paused) {
        const isHidden = typeof document !== 'undefined' && document.hidden;
        const targetTime = Number(scheduledStartTime) || (nowServerEst + 40);
        const delayMs = targetTime - nowServerEst;
        if (!isHidden && delayMs > 5 && delayMs < 100) {
          scheduledTimerRef.current = setTimeout(() => {
            try {
              audioCoordinator.claimExclusivePlayback(audio, 'player-context');
              audio.currentTime = targetPos;
              setPosition(targetPos);
              audio.play().then(() => {
                setIsAutoplayBlocked(false);
              }).catch((err) => {
                if (err.name === 'NotAllowedError') setIsAutoplayBlocked(true);
              });
              setIsPlaying(true);
            } catch {}
          }, delayMs);
        } else {
          try {
            audioCoordinator.claimExclusivePlayback(audio, 'player-context');
            audio.currentTime = targetPos;
            setPosition(targetPos);
            audio.play().then(() => {
              setIsAutoplayBlocked(false);
            }).catch((err) => {
              if (err.name === 'NotAllowedError') setIsAutoplayBlocked(true);
            });
            setIsPlaying(true);
          } catch {}
        }
      } else {
        // Continuous Dynamic Phase-Lock Loop
        correctDrift(targetPos);
      }
    }
  }, [currentTrack, playTrack, correctDrift]);

  const value = useMemo(() => ({
    currentTrack,
    isPlaying,
    position,
    duration,
    error,
    localTracks,
    queue,
    setQueue,
    isShuffle,
    repeatMode,
    volume,
    isMuted,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    toggleMute,
    seek,
    mountLocalFiles,
    addP2PTrack,
    removeLocalTrack,
    syncPlayback,
    resetRoomVersion,
    calibrateClock,
    correctDrift,
    isAutoplayBlocked,
    clockSkew: clockSkewRef.current,
    getAudioCurrentTime: () => audioRef.current?.currentTime || 0
  }), [
    currentTrack,
    isPlaying,
    position,
    duration,
    error,
    isAutoplayBlocked,
    localTracks,
    queue,
    setQueue,
    isShuffle,
    repeatMode,
    volume,
    isMuted,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    toggleMute,
    seek,
    mountLocalFiles,
    addP2PTrack,
    removeLocalTrack,
    syncPlayback,
    resetRoomVersion,
    calibrateClock,
    correctDrift
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
