import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Waves,
  HardDrive,
  Radio,
  ArrowRight,
  Volume2,
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  ExternalLink,
  Sparkles,
  Compass,
  Feather,
  EyeOff,
  Music,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiRequest, apiUrl } from '../services/api';

export default function LandingPage() {
  const { token } = useAuth();
  const destination = token ? '/' : '/auth';

  // Dynamic Cloud Audio & Playback State
  const [cloudTracks, setCloudTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('00:00');
  const [totalDurationFormatted, setTotalDurationFormatted] = useState('00:00');
  const audioRef = useRef(null);
  const [waveAmplitudes, setWaveAmplitudes] = useState([
    24, 42, 68, 55, 88, 70, 95, 82, 60, 75, 48, 30, 65, 80, 52, 34,
  ]);

  // Fetch real cloud tracks dynamically from database
  useEffect(() => {
    let active = true;
    apiRequest('/tracks')
      .then((data) => {
        if (!active) return;
        const tracksList = Array.isArray(data) ? data : [];
        const playable = tracksList.filter((t) => t.audioFile?.filename || t.audioSrc);
        setCloudTracks(playable.length > 0 ? playable : tracksList);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Active track object
  const activePiece = cloudTracks[currentTrackIndex] || {
    title: 'Connecting to Cloud Library...',
    artist: 'Riveria Cloud Network',
    duration: '03:20',
    type: 'Cloud',
    imageColor: 'bg-gradient-to-br from-[#201735] via-[#161226] to-[#0e0e0f]',
  };

  const getAudioUrl = (track) => {
    if (!track) return '';
    if (track.audioFile?.filename) return apiUrl(`/tracks/${track._id}/stream`);
    if (track.audioSrc) return track.audioSrc;
    return '';
  };

  // Synchronize audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Synchronize audio element lifecycle
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = 0.8;

    const onTime = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
        const curMins = Math.floor(audio.currentTime / 60);
        const curSecs = Math.floor(audio.currentTime % 60);
        setCurrentTimeFormatted(`${String(curMins).padStart(2, '0')}:${String(curSecs).padStart(2, '0')}`);
        const durMins = Math.floor(audio.duration / 60);
        const durSecs = Math.floor(audio.duration % 60);
        setTotalDurationFormatted(`${String(durMins).padStart(2, '0')}:${String(durSecs).padStart(2, '0')}`);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTrackIndex((prev) => (prev + 1) % (cloudTracks.length || 1));
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [cloudTracks]);

  // Handle Play/Pause
  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const streamUrl = getAudioUrl(activePiece);
    if (!streamUrl) return;

    if (isPlaying && !audio.paused) {
      audio.pause();
    } else {
      if (audio.src !== streamUrl) {
        audio.src = streamUrl;
        audio.load();
      }
      try {
        await audio.play();
      } catch (err) {
        console.warn('Audio play request interrupted:', err);
      }
    }
  };

  // Handle Scrubber Seeking
  const handleSeek = (e) => {
    const audio = audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
    setProgress(pct);
    if (audio && audio.duration && isFinite(audio.duration)) {
      audio.currentTime = (pct / 100) * audio.duration;
    }
  };

  // Handle Volume Change
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol / 100;
    }
  };

  // Switch Track
  const handleSelectTrack = (idx) => {
    setCurrentTrackIndex(idx);
    const selected = cloudTracks[idx];
    if (audioRef.current && selected) {
      const url = getAudioUrl(selected);
      if (url) {
        audioRef.current.src = url;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const handlePrevTrack = () => {
    if (cloudTracks.length === 0) return;
    const newIdx = currentTrackIndex === 0 ? cloudTracks.length - 1 : currentTrackIndex - 1;
    handleSelectTrack(newIdx);
  };

  const handleNextTrack = () => {
    if (cloudTracks.length === 0) return;
    const newIdx = (currentTrackIndex + 1) % cloudTracks.length;
    handleSelectTrack(newIdx);
  };

  const handleRestartTrack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      setCurrentTimeFormatted('00:00');
    }
  };

  const handleShuffleTrack = () => {
    if (cloudTracks.length <= 1) return;
    let randomIdx = Math.floor(Math.random() * cloudTracks.length);
    if (randomIdx === currentTrackIndex) {
      randomIdx = (currentTrackIndex + 1) % cloudTracks.length;
    }
    handleSelectTrack(randomIdx);
  };

  // Subtle breathing equalizer wave
  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = setInterval(() => {
      setWaveAmplitudes((prev) =>
        prev.map(() => Math.floor(Math.random() * 65) + 25)
      );
    }, 450);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-[#e5e2e3] font-['Inter',sans-serif] selection:bg-[#a078ff] selection:text-white relative overflow-x-hidden">
      {/* Luminous Atmospheric Veils */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1000px] h-[650px] bg-gradient-to-b from-[#d0bcff]/10 via-[#a078ff]/5 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-[35%] -right-32 w-[600px] h-[600px] bg-[#8fcdff]/5 rounded-full blur-[160px]" />
        <div className="absolute top-[65%] -left-32 w-[650px] h-[650px] bg-[#fbabff]/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[500px] bg-[#d0bcff]/6 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0e0e0f]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo using product identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full border border-white/10 bg-gradient-to-br from-[#d0bcff] to-[#89ceff] flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-transform duration-300 group-hover:scale-105">
              <span className="material-symbols-outlined text-black font-semibold text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                graphic_eq
              </span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[#d0bcff] tracking-tight">
                Riveria Music
              </h1>
              <p className="text-[11px] text-slate-400">High-Fidelity Audio</p>
            </div>
          </Link>

          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-widest uppercase text-zinc-400">
            <a href="#prologue" className="hover:text-[#d0bcff] transition-colors duration-200">
              Prologue
            </a>
            <a href="#chamber" className="hover:text-[#d0bcff] transition-colors duration-200">
              The Chamber
            </a>
            <a href="#tenets" className="hover:text-[#d0bcff] transition-colors duration-200">
              Principles
            </a>
            <a href="#sanctuary" className="hover:text-[#d0bcff] transition-colors duration-200">
              Sanctuary
            </a>
          </nav>

          {/* Action Call */}
          <div className="flex items-center gap-4">
            <Link
              to={destination}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-[#d0bcff]/30 hover:border-[#d0bcff]/60 text-[#d0bcff] text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(160,120,255,0.15)] hover:shadow-[0_0_25px_rgba(160,120,255,0.3)]"
            >
              <span>{token ? 'Open Studio' : 'Enter Riveria'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Experience */}
      <main className="w-full pt-20">
        {/* PROLOGUE: Hero Section */}
        <section
          id="prologue"
          className="relative max-w-5xl mx-auto px-6 sm:px-8 pt-20 pb-28 text-center flex flex-col items-center"
        >
          {/* Poetic Inscription Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#201f20]/60 border border-white/10 backdrop-blur-xl text-xs font-mono text-[#d0bcff] mb-8"
          >
            <Sparkles className="w-3 h-3 text-[#fbabff]" />
            <span>rev·er·ie</span>
            <span className="text-zinc-600">—</span>
            <span className="text-zinc-300 italic font-serif">
              a state of being pleasantly lost in one's thoughts
            </span>
          </motion.div>

          {/* Monolithic Literary Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white max-w-4xl leading-[1.12]"
          >
            Where sound dissolves into memory.{' '}
            <br className="hidden sm:inline" />
            <span className="font-serif italic text-[#d0bcff] font-normal">
              A listening sanctuary for the daydreamer.
            </span>
          </motion.h1>

          {/* Thoughtful Narrative Intro */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="mt-8 text-base sm:text-lg text-zinc-300 max-w-2xl font-light leading-relaxed"
          >
            In a modern landscape crowded with algorithmic clamor, commercial feeds, and ephemeral trends, Riveria is built as an unhurried harbor. Mount your personal archives, share quiet sessions with companions across distances, and let your thoughts drift.
          </motion.p>

          {/* Elegant Invitations */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md"
          >
            <Link
              to={destination}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-[#a078ff] text-white text-xs uppercase tracking-widest font-semibold hover:brightness-110 transition-all duration-300 shadow-[0_0_30px_rgba(160,120,255,0.35)] hover:scale-[1.01]"
            >
              <span>{token ? 'Continue Listening' : 'Enter the Sanctuary'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="#chamber"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white text-xs uppercase tracking-widest font-medium transition-all duration-300"
            >
              <Music className="w-3.5 h-3.5 text-[#d0bcff]" />
              <span>Listen to the Tone</span>
            </a>
          </motion.div>

          {/* Quiet Trust Notes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 font-mono tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d0bcff]" /> Local Files Stay Sovereign
            </span>
            <span>•</span>
            <span>Zero Tracking Telemetry</span>
            <span>•</span>
            <span>Direct WebRTC Mesh</span>
          </motion.div>
        </section>

        {/* ACT I: THE QUIET HARBOR (Narrative Philosophy) */}
        <section className="py-24 border-y border-white/5 bg-[#131314]/50 relative">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-2xl mb-16">
              <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono">
                The Philosophy
              </span>
              <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight mt-2">
                Reclaiming music from the noise.
              </h2>
              <p className="mt-4 text-sm text-zinc-400 font-light leading-relaxed">
                Music was never meant to feel like an endless administrative queue of recommendations or an ad-saturated marketplace. We shaped Riveria around three timeless convictions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Conviction 1 */}
              <div className="p-8 rounded-2xl bg-[#201f20]/40 border border-white/5 flex flex-col justify-between group hover:border-[#d0bcff]/30 transition-all duration-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#d0bcff] mb-6">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    Sovereign Belonging
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    The unreleased acoustic sketch, the vinyl rip discovered on a cold November evening—these belong to you, not a corporate database. Riveria mounts audio files straight from your device into your browser session without uploading a single byte to an external server.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-mono text-[#d0bcff]">
                  In-Memory Browser Mounting
                </div>
              </div>

              {/* Conviction 2 */}
              <div className="p-8 rounded-2xl bg-[#201f20]/40 border border-white/5 flex flex-col justify-between group hover:border-[#d0bcff]/30 transition-all duration-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#d0bcff] mb-6">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    Shared Resonance
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    Listening with a friend separated by oceans should feel as intimate as sitting on the same living room carpet. With direct WebRTC data channels, when you pause, their track pauses in exact synchrony—free from cloud relay delays.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-mono text-[#d0bcff]">
                  Peer-to-Peer DataChannels
                </div>
              </div>

              {/* Conviction 3 */}
              <div className="p-8 rounded-2xl bg-[#201f20]/40 border border-white/5 flex flex-col justify-between group hover:border-[#d0bcff]/30 transition-all duration-300">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#d0bcff] mb-6">
                    <Waves className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    Unbroken Stillness
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    Audio streams in delicate byte-range chunks that honor the natural dynamics of the recording. No banner promotions, no algorithmic interruptions—just the quiet cadence of the sound moving at your chosen pace.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-mono text-[#d0bcff]">
                  RFC 9110 Byte-Range Slicing
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ACT II: THE CHAMBER (Interactive Audio Sanctuary) */}
        <section id="chamber" className="py-28 relative">
          <div className="max-w-5xl mx-auto px-6 sm:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono">
                The Living Instrument
              </span>
              <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight mt-2">
                Step inside the listening chamber.
              </h2>
              <p className="mt-3 text-sm text-zinc-400 font-light">
                An intimate demonstration of Riveria's fluid playback deck, ambient wave visualizer, and multi-source playback.
              </p>
            </div>

            {/* Glassmorphic Player Deck */}
            <div className="rounded-3xl bg-[#1c1b1c]/70 backdrop-blur-3xl border border-white/10 p-6 sm:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
              {/* Dynamic subtle ambient glow behind deck */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#201735]/40 via-[#161226]/40 to-[#0e0e0f] opacity-40 transition-colors duration-1000 -z-10"
              />

              {/* Deck Topline */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-[#d0bcff] animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#d0bcff]">
                    Chamber Monitor • {isPlaying ? 'Streaming Cloud Audio' : 'Ready'}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400 bg-white/[0.03] px-3 py-1 rounded-full border border-white/5">
                  {activePiece.type ? `${activePiece.type} Audio` : 'Cloud Stream'}
                </span>
              </div>

              {/* Main Deck Interior */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-center">
                {/* Artwork & Rotating Vinyl Core */}
                <div className="lg:col-span-5 flex flex-col items-center sm:items-start">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-[#0e0e0f] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group">
                    {activePiece.imageSrc ? (
                      <div className="absolute inset-0">
                        <img
                          src={activePiece.imageSrc}
                          alt={activePiece.title}
                          className="w-full h-full object-cover opacity-35 scale-105 blur-[1px] group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
                      </div>
                    ) : null}
                    <motion.div
                      animate={{ rotate: isPlaying ? 360 : 0 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-white/10 bg-gradient-to-tr from-[#1b1528] to-[#0e0e0f] flex items-center justify-center shadow-inner relative z-10 backdrop-blur-xs"
                    >
                      <div className="w-12 h-12 rounded-full border border-[#d0bcff]/40 bg-gradient-to-br from-[#d0bcff] to-[#89ceff] flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)]">
                        <span className="material-symbols-outlined text-black text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          graphic_eq
                        </span>
                      </div>
                    </motion.div>
                    <div className="absolute bottom-3 left-3 text-[10px] font-mono text-[#d0bcff]/80 uppercase tracking-widest relative z-10">
                      Sanctuary Deck
                    </div>
                  </div>
                </div>

                {/* Track Details & Visualizer */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-xs font-serif italic text-[#d0bcff]">
                      {activePiece.genre || 'Master Audio Stream'}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight mt-1 truncate">
                      {activePiece.title}
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-1">
                      {activePiece.artist || 'Riveria Cloud Archives'}
                    </p>
                    <p className="text-xs text-zinc-500 italic mt-2">
                      “{activePiece.album ? `Album: ${activePiece.album}` : 'Direct RFC 9110 byte-range cloud audio streaming'}”
                    </p>
                  </div>

                  {/* Gentle Waveform Visualizer */}
                  <div className="h-16 w-full flex items-end gap-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                    {waveAmplitudes.map((amp, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: isPlaying ? `${amp}%` : '15%' }}
                        transition={{ duration: 0.35 }}
                        className="flex-1 bg-gradient-to-t from-[#a078ff]/30 to-[#d0bcff] rounded-full"
                      />
                    ))}
                  </div>

                  {/* Scrubber Line */}
                  <div className="space-y-1.5">
                    <div
                      onClick={handleSeek}
                      className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[#d0bcff] to-[#a078ff] relative"
                        style={{ width: `${progress}%` }}
                      >
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#d0bcff]" />
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                      <span>{currentTimeFormatted}</span>
                      <span className="text-[#d0bcff]">{totalDurationFormatted !== '00:00' ? totalDurationFormatted : (activePiece.duration || '03:20')}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleShuffleTrack}
                        className="p-2 text-zinc-400 hover:text-[#d0bcff] transition-colors"
                        title="Shuffle Movement"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handlePrevTrack}
                        className="p-2 text-zinc-400 hover:text-[#d0bcff] transition-colors"
                        title="Previous Track"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleTogglePlay}
                        className="w-11 h-11 rounded-full bg-[#d0bcff] hover:bg-[#e9ddff] text-black flex items-center justify-center transition-all transform active:scale-95 shadow-[0_0_20px_rgba(208,188,255,0.4)]"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={handleNextTrack}
                        className="p-2 text-zinc-400 hover:text-[#d0bcff] transition-colors"
                        title="Next Track"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleRestartTrack}
                        className="p-2 text-zinc-400 hover:text-[#d0bcff] transition-colors"
                        title="Restart Track"
                      >
                        <Repeat className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Master Gain Slider */}
                    <div className="flex items-center gap-2.5">
                      <Volume2 className="w-4 h-4 text-[#d0bcff]" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-20 sm:w-24 accent-[#d0bcff] h-1 rounded-full cursor-pointer bg-white/10"
                      />
                      <span className="text-[10px] font-mono text-zinc-400">{volume}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cloud Tracks Selector Switcher */}
              <div className="pt-6 border-t border-white/5 flex flex-wrap gap-2">
                {cloudTracks.length === 0 ? (
                  <span className="text-xs font-mono text-zinc-500 italic">Syncing cloud library tracks...</span>
                ) : (
                  cloudTracks.map((track, idx) => (
                    <button
                      key={track._id || track.title || idx}
                      onClick={() => handleSelectTrack(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                        currentTrackIndex === idx
                          ? 'bg-[#d0bcff]/15 text-[#d0bcff] border border-[#d0bcff]/40 shadow-[0_0_15px_rgba(208,188,255,0.2)]'
                          : 'bg-white/[0.02] text-zinc-400 border border-white/5 hover:border-white/20 hover:text-zinc-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span className="max-w-[180px] truncate">{track.title}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ACT III: PRINCIPLES OF RESTRAINT (Thoughtful Architecture) */}
        <section id="tenets" className="py-24 border-t border-white/5 bg-[#0e0e0f]">
          <div className="max-w-5xl mx-auto px-6 sm:px-8">
            <div className="max-w-2xl mb-16">
              <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono">
                The Architecture of Restraint
              </span>
              <h2 className="text-3xl sm:text-4xl font-light text-white tracking-tight mt-2">
                Honesty in every byte.
              </h2>
              <p className="mt-3 text-sm text-zinc-400 font-light">
                No corporate sleight of hand. Just sound technology woven around your autonomy.
              </p>
            </div>

            <div className="space-y-6">
              {/* Principle 1 */}
              <div className="p-8 rounded-2xl bg-[#1c1b1c]/40 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#d0bcff]/30 transition-all duration-300">
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#d0bcff] flex-shrink-0 mt-1">
                    <Feather className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Zero-Copy Memory Audio Mounts
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1.5 leading-relaxed">
                      Select any local folder on your disk. Riveria creates instantaneous, in-memory browser Object URLs. Your audio plays with pure fidelity right off your drive—no server upload, no storage quotas, and zero data leakage.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#d0bcff] px-3 py-1.5 rounded-full bg-[#2a2a2b] border border-white/5 flex-shrink-0">
                  Client-Side Sovereignty
                </span>
              </div>

              {/* Principle 2 */}
              <div className="p-8 rounded-2xl bg-[#1c1b1c]/40 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#d0bcff]/30 transition-all duration-300">
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#d0bcff] flex-shrink-0 mt-1">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Sub-Frame WebRTC Mesh Signaling
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1.5 leading-relaxed">
                      Room participants establish peer-to-peer data channels. Playhead indices, seek timestamps, and playback events travel directly between browsers without pausing for central server serialization.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#d0bcff] px-3 py-1.5 rounded-full bg-[#2a2a2b] border border-white/5 flex-shrink-0">
                  Direct Peer DataChannels
                </span>
              </div>

              {/* Principle 3 */}
              <div className="p-8 rounded-2xl bg-[#1c1b1c]/40 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#d0bcff]/30 transition-all duration-300">
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#d0bcff] flex-shrink-0 mt-1">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Sanctuary Without Surveillance
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1.5 leading-relaxed">
                      No cross-site pixels. No third-party behavioral trackers. No hidden cookies profiling your emotional states through song choices. Riveria exists simply to play your music.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#d0bcff] px-3 py-1.5 rounded-full bg-[#2a2a2b] border border-white/5 flex-shrink-0">
                  Zero Telemetry
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ACT IV: THE INVITATION */}
        <section id="sanctuary" className="py-28 relative overflow-hidden border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
            <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-[#201f20]/80 via-[#1c1b1c]/90 to-[#0e0e0f] border border-[#d0bcff]/20 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.7)]">
              <span className="text-xs uppercase tracking-[0.22em] text-[#d0bcff] font-mono">
                An Invitation
              </span>
              <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight mt-3">
                Lose yourself in the daydream.
              </h2>
              <p className="mt-6 text-sm sm:text-base text-zinc-300 font-light max-w-xl mx-auto leading-relaxed">
                There are no algorithmic feeds to scroll, no commercial interruptions to endure, and no walls separating your files from your queue. Just you, your sound, and the quiet space between thoughts.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={destination}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-[#a078ff] text-white text-xs uppercase tracking-widest font-semibold hover:brightness-110 transition-all duration-300 shadow-[0_0_30px_rgba(160,120,255,0.4)] hover:scale-[1.01]"
                >
                  <span>{token ? 'Enter Riveria Studio' : 'Step Into Riveria'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a
                  href="https://github.com/Parth-Chavan-15/Riveria"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white text-xs uppercase tracking-widest font-medium transition-all duration-300"
                >
                  <span>Explore the Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="mt-8 text-[11px] font-mono text-zinc-500">
                Crafted for listeners who cherish stillness and personal sovereignty.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Epilogue: Literary Footer */}
      <footer className="w-full bg-[#0a0a0a] py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col gap-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-white/10 bg-gradient-to-br from-[#d0bcff] to-[#89ceff] flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)]">
                <span className="material-symbols-outlined text-black text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  graphic_eq
                </span>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-[#d0bcff]">
                  Riveria Music
                </span>
                <p className="text-xs text-slate-400">
                  High-Fidelity Audio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-zinc-400 font-mono">
              <a
                href="https://github.com/Parth-Chavan-15/Riveria"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#d0bcff] transition-colors flex items-center gap-1.5"
              >
                <span>GitHub Repository</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-mono">
            <p>© 2026 Riveria Music Engine. All rights sovereign.</p>
            <div className="flex items-center gap-4">
              <span>WebRTC Mesh</span>
              <span>•</span>
              <span>RFC 9110 Byte-Streams</span>
              <span>•</span>
              <span>In-Memory Object URLs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
