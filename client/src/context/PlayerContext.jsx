import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../services/api';
import { PlayerContext } from './playerContextDef';

function sourceFor(track) {
  if (track.localUrl || track.audioSrc) return track.localUrl || track.audioSrc;
  if (track.audioFile?.filename) return apiUrl(`/tracks/${track._id}/stream`);
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

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => setPosition(audio.currentTime || 0);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setError('This audio source could not be played by your browser.');
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      localTracksRef.current.forEach((track) => track.localUrl && URL.revokeObjectURL(track.localUrl));
    };
  }, []);

  const playTrack = useCallback(async (track) => {
    const source = sourceFor(track);
    if (!source) {
      setError('This cloud track does not have a playable audio source yet.');
      setCurrentTrack(track);
      return;
    }
    const audio = audioRef.current;
    setError('');
    if (currentTrack?._id !== track._id) {
      audio.src = source;
      audio.load();
      setCurrentTrack(track);
      setPosition(0);
    }
    try { await audio.play(); } catch { setError('Playback was blocked. Tap play again to allow audio.'); }
  }, [currentTrack]);

  const togglePlay = useCallback(async () => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (audio.paused) {
      try { await audio.play(); } catch { setError('Playback was blocked by the browser.'); }
    } else audio.pause();
  }, [currentTrack]);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    audio.currentTime = Math.max(0, Math.min(seconds, Number.isFinite(audio.duration) ? audio.duration : seconds));
    setPosition(audio.currentTime);
  }, []);

  const mountLocalFiles = useCallback((files) => {
    const mounted = [...files].filter((file) => file.type.startsWith('audio/')).map((file) => ({
      _id: `local-${crypto.randomUUID()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'This device',
      duration: 'Local',
      type: 'Local',
      imageColor: 'bg-gradient-to-br from-cyan-700 to-violet-950',
      localUrl: URL.createObjectURL(file),
      fileSize: file.size
    }));
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
      const next = tracks.filter((item) => item._id !== id);
      localTracksRef.current = next;
      return next;
    });
    if (currentTrack?._id === id) audioRef.current.pause();
  }, [currentTrack]);

  const syncPlayback = useCallback(async ({ trackId, position: remotePosition, isPlaying: remoteIsPlaying }, tracks = []) => {
    const track = [...tracks, ...localTracks].find((item) => item._id === trackId);
    if (!track) return;
    await playTrack(track);
    seek(remotePosition);
    if (!remoteIsPlaying) audioRef.current.pause();
  }, [localTracks, playTrack, seek]);

  const value = useMemo(() => ({ currentTrack, isPlaying, position, duration, error, localTracks, playTrack, togglePlay, seek, mountLocalFiles, removeLocalTrack, syncPlayback }), [currentTrack, isPlaying, position, duration, error, localTracks, playTrack, togglePlay, seek, mountLocalFiles, removeLocalTrack, syncPlayback]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
