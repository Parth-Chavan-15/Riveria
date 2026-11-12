import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../services/api';
import { audioCoordinator } from '../services/audioCoordinator';
import { PlayerContext } from './playerContextDef';
import { extractAudioMetadata } from '../utils/audioMetadata';

function sourceFor(track) {
  if (!track) return '';
  if (track.localUrl) return track.localUrl;
  if (track._id && track.type !== 'Local') return apiUrl(`/tracks/${track._id}/stream`);
  if (track.audioFile?.filename) return apiUrl(`/tracks/${track._id}/stream`);
  if (track.audioSrc && !track.audioSrc.startsWith('/audio/')) return track.audioSrc;
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

  const playTrack = useCallback(async (track, newQueue = null) => {
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

    if (currentTrack?._id !== track._id) {
      audio.src = source;
      audio.preload = 'auto';
      audio.volume = isMuted ? 0 : volume / 100;
      audio.load();
      setCurrentTrack(track);
      setPosition(0);
    }

    try {
      audioCoordinator.claimExclusivePlayback(audio, 'player-context');
      await audio.play();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Playback was blocked. Tap play again to allow audio.');
      }
    }
  }, [currentTrack, isMuted, volume]);

  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (audio.paused) {
      try {
        audioCoordinator.claimExclusivePlayback(audio, 'player-context');
        await audio.play();
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Playback was blocked by the browser.');
        }
      }
    } else {
      audio.pause();
    }
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

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    const target = Math.max(0, Math.min(seconds, Number.isFinite(audio.duration) ? audio.duration : seconds));
    audio.currentTime = target;
    setPosition(target);
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
    const { trackId, position: remotePosition, isPlaying: remoteIsPlaying, track: directTrack, timestamp } = payload;
    const allTracks = [...tracks, ...localTracksRef.current];
    const track = allTracks.find((item) => item._id === trackId) || directTrack;
    if (!track) return;

    const latencyOffset = timestamp ? Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 1000) : 0;
    const targetPos = Math.max(0, (remotePosition || 0) + (remoteIsPlaying ? latencyOffset : 0));

    const audio = audioRef.current;
    if (currentTrack?._id !== track._id) {
      await playTrack(track, allTracks);
    }

    if (Math.abs(audio.currentTime - targetPos) > 0.25) {
      seek(targetPos);
    }

    if (remoteIsPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!remoteIsPlaying && !audio.paused) {
      audio.pause();
    }
  }, [currentTrack, playTrack, seek]);

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
    syncPlayback
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
    syncPlayback
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
