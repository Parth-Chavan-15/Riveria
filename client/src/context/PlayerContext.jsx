import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../services/api';
import { audioCoordinator } from '../services/audioCoordinator';
import { PlayerContext } from './playerContextDef';
import { extractAudioMetadata } from '../utils/audioMetadata';

function sourceFor(track) {
  if (!track) return '';
  if (track.localUrl) return track.localUrl;
  const tid = track._id || track.id;
  if (tid && track.type !== 'Local') return apiUrl(`/tracks/${tid}/stream`);
  if (track.audioFile?.filename && tid) return apiUrl(`/tracks/${tid}/stream`);
  if (track.audioSrc && !track.audioSrc.startsWith('/audio/')) return track.audioSrc;
  if (tid) return apiUrl(`/tracks/${tid}/stream`);
  return '';
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
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
  const clockSkewRef = useRef(0);
  const clockSamplesRef = useRef([]);

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

    const onTime = () => setPosition(audio.currentTime || 0);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      if (audio.src && audio.error && audio.error.code !== 0) {
        setError('This audio track could not be loaded.');
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

    window.addEventListener('reveria:all-audio-stopped', handleStopAll);
    window.addEventListener('reveria:exclusive-audio-claimed', handleExclusiveClaimed);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audioCoordinator.unregister(audio);
      window.removeEventListener('reveria:all-audio-stopped', handleStopAll);
      window.removeEventListener('reveria:exclusive-audio-claimed', handleExclusiveClaimed);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('play', onPlay);
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

    const isDifferent = (currentTrack?._id || currentTrack?.id) !== (track._id || track.id);
    if (isDifferent) {
      audio.src = source;
      audio.preload = 'auto';
      audio.volume = isMuted ? 0 : volume / 100;
      audio.load();
      setCurrentTrack(track);
      setPosition(0);
    }

    if (autoPlay) {
      try {
        audioCoordinator.claimExclusivePlayback(audio, 'player-context');
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Playback was blocked. Tap play again to allow audio.');
        }
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }

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
  }, [currentTrack, isMuted, volume]);

  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    const nextIsPlaying = audio.paused;

    if (nextIsPlaying) {
      try {
        audioCoordinator.claimExclusivePlayback(audio, 'player-context');
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        if (err.name !== 'AbortError') {
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

    if (!fromSync && currentTrack) {
      window.dispatchEvent(
        new CustomEvent('reveria:jam-action', {
          detail: {
            action: 'seek',
            track: currentTrack,
            isPlaying: !audio.paused,
            position: target
          }
        })
      );
    }
  }, [currentTrack]);

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
      serverTime,
      scheduledStartTime,
      version,
      action
    } = payload;

    const clientNow = Date.now();

    // 1. Clock Calibration (Cristian's algorithm with low-jitter filtering from Rust engine)
    if (serverTime && typeof serverTime === 'number') {
      const instantaneousSkew = serverTime - clientNow;
      // Add sample
      clockSamplesRef.current.push(instantaneousSkew);
      if (clockSamplesRef.current.length > 20) {
        clockSamplesRef.current.shift();
      }
      // Sort and take middle/lowest jitter cluster
      const sorted = [...clockSamplesRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      clockSkewRef.current = clockSkewRef.current === 0
        ? median
        : clockSkewRef.current * 0.75 + median * 0.25;
    }

    const roomKey = (roomId || 'default').toLowerCase();
    const incVersion = Number(version) || 0;
    const lastRoomVersion = roomVersionsRef.current.get(roomKey) || 0;

    const targetId = trackId || (typeof directTrack === 'string' ? directTrack : (directTrack?._id || directTrack?.id));
    const allTracks = [...tracks, ...localTracksRef.current];
    const matchedTrack = allTracks.find((item) => (item._id || item.id) === targetId);
    let track = matchedTrack || (typeof directTrack === 'object' ? directTrack : null);
    if (!track && targetId) {
      track = {
        _id: targetId,
        id: targetId,
        title: 'Jam Track',
        artist: 'Riveria Haven',
        type: 'Cloud',
        audioSrc: `/tracks/${targetId}/stream`
      };
    }
    if (!track) return;

    // Normalize track IDs
    track._id = track._id || targetId;
    track.id = track.id || targetId;

    const audio = audioRef.current;
    const isTargetPlaying = Boolean(remoteIsPlaying);
    const nowServerEst = clientNow + clockSkewRef.current;

    // 2. Compute target position with clock-skew corrected elapsed offset
    let targetPos = Math.max(0, Number(remotePosition) || 0);
    if (isTargetPlaying) {
      const originTime = serverTime || (timestamp ? new Date(timestamp).getTime() : nowServerEst);
      const elapsed = Math.max(0, Math.min(3600, (nowServerEst - originTime) / 1000));
      targetPos += elapsed;
    }

    const currentId = currentTrack?._id || currentTrack?.id;
    const isDifferentTrack = currentId !== targetId;

    // A. Track is different -> ALWAYS load and synchronize the room's track immediately!
    if (isDifferentTrack) {
      if (incVersion > 0) roomVersionsRef.current.set(roomKey, incVersion);
      if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);

      await playTrack(track, allTracks, false /* do not autoplay yet; schedule synchronously */, true /* fromSync */);

      // Scheduled Start Time Alignment (Acoustic Phase-Lock)
      const targetTime = Number(scheduledStartTime) || (nowServerEst + 100);
      const delayMs = targetTime - nowServerEst;

      if (isTargetPlaying) {
        if (delayMs > 5 && delayMs < 1200) {
          // Schedule both devices to fire play() on the exact same millisecond!
          scheduledTimerRef.current = setTimeout(() => {
            try {
              audioCoordinator.claimExclusivePlayback(audio, 'player-context');
              audio.currentTime = targetPos;
              setPosition(targetPos);
              audio.play().catch(() => {});
              setIsPlaying(true);
            } catch {}
          }, delayMs);
        } else {
          // Play immediately with elapsed offset
          try {
            audioCoordinator.claimExclusivePlayback(audio, 'player-context');
            const catchupPos = targetPos + (delayMs < 0 ? Math.abs(delayMs) / 1000 : 0);
            audio.currentTime = catchupPos;
            setPosition(catchupPos);
            await audio.play();
            setIsPlaying(true);
          } catch {}
        }
      } else {
        audio.currentTime = targetPos;
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
        const targetTime = Number(scheduledStartTime) || (nowServerEst + 80);
        const delayMs = targetTime - nowServerEst;
        if (delayMs > 5 && delayMs < 1200) {
          scheduledTimerRef.current = setTimeout(() => {
            try {
              audioCoordinator.claimExclusivePlayback(audio, 'player-context');
              audio.currentTime = targetPos;
              setPosition(targetPos);
              audio.play().catch(() => {});
              setIsPlaying(true);
            } catch {}
          }, delayMs);
        } else {
          try {
            audioCoordinator.claimExclusivePlayback(audio, 'player-context');
            audio.currentTime = targetPos;
            setPosition(targetPos);
            await audio.play();
            setIsPlaying(true);
          } catch {}
        }
      } else {
        // Continuous Phase-Locked Loop (PLL) Single-Speaker Engine:
        // Continuously runs on every heartbeat and poll to guarantee <5ms single-speaker lock!
        const drift = targetPos - audio.currentTime;

        if (action === 'seek' || Math.abs(drift) > 0.35) {
          // Hard snap if seek or drift exceeds 350ms
          audio.currentTime = targetPos;
          setPosition(targetPos);
          if (rateNudgeTimerRef.current) clearTimeout(rateNudgeTimerRef.current);
          audio.playbackRate = 1.0;
        } else if (Math.abs(drift) > 0.005) {
          // High-precision acoustic phase micro-nudge (5ms - 350ms):
          // Inaudible rate adjustment gently pulls devices into exact phase alignment
          if (rateNudgeTimerRef.current) clearTimeout(rateNudgeTimerRef.current);
          const rateAdjustment = Math.max(-0.04, Math.min(0.04, drift * 0.15));
          audio.playbackRate = 1.0 + rateAdjustment;
          rateNudgeTimerRef.current = setTimeout(() => {
            if (audioRef.current) audioRef.current.playbackRate = 1.0;
          }, 600);
        } else {
          // Locked within 5ms Single-Speaker Haas threshold
          if (audio.playbackRate !== 1.0) {
            audio.playbackRate = 1.0;
          }
        }
      }
    }
  }, [currentTrack, playTrack]);

  const value = useMemo(() => ({
    currentTrack,
    isPlaying,
    position,
    duration,
    error,
    localTracks,
    queue,
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
    removeLocalTrack,
    syncPlayback,
    resetRoomVersion,
    clockSkew: clockSkewRef.current
  }), [
    currentTrack,
    isPlaying,
    position,
    duration,
    error,
    localTracks,
    queue,
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
    removeLocalTrack,
    syncPlayback,
    resetRoomVersion
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
