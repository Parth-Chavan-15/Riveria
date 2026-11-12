import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Headphones,
  Disc3,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiRequest, apiUrl } from '../services/api';

const ACT_METADATA = [
  {
    id: 'prologue',
    actNumber: 'ACT I',
    actName: 'The Awakening',
    accentColor: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-400/30',
    glowColor: 'rgba(245, 158, 11, 0.25)',
  },
  {
    id: 'philosophy',
    actNumber: 'ACT II',
    actName: 'The Sovereign Haven',
    accentColor: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    borderColor: 'border-cyan-400/30',
    glowColor: 'rgba(6, 182, 212, 0.25)',
  },
  {
    id: 'chamber',
    actNumber: 'ACT III',
    actName: 'The Living Chamber',
    accentColor: 'from-purple-500/20 via-indigo-500/10 to-transparent',
    borderColor: 'border-[#d0bcff]/40',
    glowColor: 'rgba(208, 188, 255, 0.3)',
  },
  {
    id: 'tenets',
    actNumber: 'ACT IV',
    actName: 'Architecture of Restraint',
    accentColor: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-400/30',
    glowColor: 'rgba(16, 185, 129, 0.25)',
  },
  {
    id: 'horizon',
    actNumber: 'ACT V',
    actName: 'The Daydream Horizon',
    accentColor: 'from-violet-500/20 via-fuchsia-500/10 to-transparent',
    borderColor: 'border-fuchsia-400/30',
    glowColor: 'rgba(217, 70, 239, 0.25)',
  },
];

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
  const [activeSection, setActiveSection] = useState(0);
  const [followScroll, setFollowScroll] = useState(true);
  const [showFloatingDock, setShowFloatingDock] = useState(false);

  // Multi-threaded Audio Pool & References
  const activeAudioRef = useRef(null);
  const audioPoolRef = useRef(new Map());
  const preloadedBlobsRef = useRef(new Map());
  const cloudTracksRef = useRef([]);
  const isTransitioningRef = useRef(false);
  const playTrackDirectRef = useRef(null);

  const [waveAmplitudes, setWaveAmplitudes] = useState([
    24, 42, 68, 55, 88, 70, 95, 82, 60, 75, 48, 30, 65, 80, 52, 34,
  ]);

  const getAudioUrl = useCallback((track) => {
    if (!track) return '';
    if (track.audioFile?.filename) return apiUrl(`/tracks/${track._id}/stream`);
    if (track.audioSrc) return track.audioSrc;
    return '';
  }, []);

  // 1. Parallel Multi-Threaded Audio Pre-Fetching & In-Memory Preload
  useEffect(() => {
    let active = true;
    apiRequest('/tracks')
      .then((data) => {
        if (!active) return;
        const tracksList = Array.isArray(data) ? data : [];
        const playable = tracksList.filter((t) => t.audioFile?.filename || t.audioSrc);
        const resolved = playable.length > 0 ? playable : tracksList;
        setCloudTracks(resolved);
        cloudTracksRef.current = resolved;

        // Multi-stream parallel preload in background
        resolved.forEach((track, idx) => {
          const url = getAudioUrl(track);
          if (!url) return;

          // A. Instantiate primed HTML5 Audio elements in memory pool
          if (!audioPoolRef.current.has(track._id)) {
            const audioElem = new Audio();
            audioElem.preload = 'auto';
            audioElem.src = url;
            audioElem.volume = volume / 100;
            audioPoolRef.current.set(track._id, audioElem);
          }

          // B. Parallel byte-range pre-fetching (first 256KB) for guaranteed 0ms start
          if (idx < 5 && !preloadedBlobsRef.current.has(track._id)) {
            fetch(url, { headers: { Range: 'bytes=0-262143' } })
              .then((res) => (res.ok || res.status === 206 ? res.blob() : null))
              .then((blob) => {
                if (blob && active) {
                  preloadedBlobsRef.current.set(track._id, URL.createObjectURL(blob));
                }
              })
              .catch(() => {});
          }
        });
      })
      .catch(() => {});

    const blobCache = preloadedBlobsRef.current;
    return () => {
      active = false;
      // Cleanup preloaded object URLs
      blobCache.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
    };
  }, [getAudioUrl, volume]);

  // Active track object
  const activePiece = cloudTracks[currentTrackIndex] || {
    title: 'Connecting to Cloud Library...',
    artist: 'Riveria Cloud Network',
    duration: '03:20',
    type: 'Cloud',
    imageColor: 'bg-gradient-to-br from-[#201735] via-[#161226] to-[#0e0e0f]',
  };

  // 2. Playback Lifecycle Manager
  const playTrackDirect = useCallback(
    async (idx, shouldPlay = true, fadeIn = false) => {
      const targetTrack = cloudTracksRef.current[idx];
      if (!targetTrack) return;

      const url = getAudioUrl(targetTrack);
      if (!url) return;

      let audioElem = audioPoolRef.current.get(targetTrack._id);
      if (!audioElem) {
        audioElem = new Audio();
        audioElem.preload = 'auto';
        audioElem.src = url;
        audioPoolRef.current.set(targetTrack._id, audioElem);
      }

      // Detach listeners from previous audio if switching
      const prevAudio = activeAudioRef.current;
      if (prevAudio && prevAudio !== audioElem) {
        if (fadeIn && !prevAudio.paused) {
          // Smooth crossfade out over 150ms
          const startVol = prevAudio.volume;
          const fadeSteps = 8;
          for (let step = 1; step <= fadeSteps; step++) {
            setTimeout(() => {
              try {
                prevAudio.volume = Math.max(0, startVol * (1 - step / fadeSteps));
                if (step === fadeSteps) {
                  prevAudio.pause();
                  prevAudio.currentTime = 0;
                }
              } catch {
                /* noop */
              }
            }, step * 18);
          }
        } else {
          prevAudio.pause();
        }
      }

      activeAudioRef.current = audioElem;
      setCurrentTrackIndex(idx);

      // Event attachments
      audioElem.ontimeupdate = () => {
        if (audioElem.duration && isFinite(audioElem.duration)) {
          setProgress((audioElem.currentTime / audioElem.duration) * 100);
          const curMins = Math.floor(audioElem.currentTime / 60);
          const curSecs = Math.floor(audioElem.currentTime % 60);
          setCurrentTimeFormatted(`${String(curMins).padStart(2, '0')}:${String(curSecs).padStart(2, '0')}`);
          const durMins = Math.floor(audioElem.duration / 60);
          const durSecs = Math.floor(audioElem.duration % 60);
          setTotalDurationFormatted(`${String(durMins).padStart(2, '0')}:${String(durSecs).padStart(2, '0')}`);
        }
      };

      audioElem.onended = () => {
        const nextIdx = (idx + 1) % (cloudTracksRef.current.length || 1);
        playTrackDirectRef.current?.(nextIdx, true, true);
      };

      if (shouldPlay) {
        try {
          if (fadeIn) {
            audioElem.volume = 0;
            await audioElem.play();
            setIsPlaying(true);
            const targetVol = volume / 100;
            const fadeSteps = 10;
            for (let step = 1; step <= fadeSteps; step++) {
              setTimeout(() => {
                try {
                  audioElem.volume = (targetVol * step) / fadeSteps;
                } catch {
                  /* noop */
                }
              }, step * 25);
            }
          } else {
            audioElem.volume = volume / 100;
            await audioElem.play();
            setIsPlaying(true);
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.warn('Direct playback notification:', err);
          }
        }
      }
    },
    [getAudioUrl, volume]
  );

  useEffect(() => {
    playTrackDirectRef.current = playTrackDirect;
  }, [playTrackDirect]);

  // Synchronize audio volume
  useEffect(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Handle Play/Pause
  const handleTogglePlay = async () => {
    const current = activeAudioRef.current;
    if (isPlaying && current && !current.paused) {
      current.pause();
      setIsPlaying(false);
    } else {
      await playTrackDirect(currentTrackIndex, true, false);
    }
  };

  // Handle Scrubber Seeking
  const handleSeek = (e) => {
    const audio = activeAudioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
    setProgress(pct);
    if (audio && audio.duration && isFinite(audio.duration)) {
      audio.currentTime = (pct / 100) * audio.duration;
    }
  };

  // Switch Track manually
  const handleSelectTrack = (idx) => {
    playTrackDirect(idx, isPlaying, true);
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
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime = 0;
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

  // Dynamic visualizer frequencies
  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = setInterval(() => {
      setWaveAmplitudes((prev) =>
        prev.map(() => Math.floor(Math.random() * 65) + 25)
      );
    }, 450);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 3. Scroll-Driven Section Detection & Musical Transitions
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingDock(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -25% 0px',
      threshold: 0.25,
    };

    const sectionElements = ACT_METADATA.map((act) => document.getElementById(act.id)).filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const actIndex = ACT_METADATA.findIndex((act) => act.id === entry.target.id);
          if (actIndex !== -1 && actIndex !== activeSection) {
            setActiveSection(actIndex);

            // If user has enabled Follow Scroll, seamlessly crossfade to that section's track!
            if (followScroll && cloudTracksRef.current.length > 0) {
              const targetIdx = actIndex % cloudTracksRef.current.length;
              if (targetIdx !== currentTrackIndex && !isTransitioningRef.current) {
                isTransitioningRef.current = true;
                playTrackDirect(targetIdx, isPlaying, true);
                setTimeout(() => {
                  isTransitioningRef.current = false;
                }, 600);
              }
            }
          }
        }
      });
    }, observerOptions);

    sectionElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeSection, followScroll, isPlaying, currentTrackIndex, playTrackDirect]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e5e2e3] font-['Inter',sans-serif] selection:bg-[#a078ff] selection:text-white relative overflow-x-hidden">
      {/* Dynamic Atmospheric Veils that morph as the user journeys down the page */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-all duration-1000">
        <div
          className={`absolute -top-[20%] left-1/2 -translate-x-1/2 w-[85vw] max-w-[1100px] h-[700px] bg-gradient-to-b ${ACT_METADATA[activeSection]?.accentColor || 'from-[#d0bcff]/10 via-[#a078ff]/5 to-transparent'} rounded-full blur-[140px] transition-all duration-1000`}
        />
        <div className="absolute top-[35%] -right-32 w-[600px] h-[600px] bg-[#8fcdff]/5 rounded-full blur-[160px]" />
        <div className="absolute top-[65%] -left-32 w-[650px] h-[650px] bg-[#fbabff]/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[500px] bg-[#d0bcff]/6 rounded-full blur-[150px]" />
      </div>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
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

          <nav className="hidden md:flex items-center gap-7 text-xs tracking-widest uppercase text-zinc-400 font-mono">
            {ACT_METADATA.map((act, idx) => (
              <a
                key={act.id}
                href={`#${act.id}`}
                className={`transition-all duration-300 flex items-center gap-1.5 ${
                  activeSection === idx
                    ? 'text-[#d0bcff] font-semibold drop-shadow-[0_0_8px_rgba(208,188,255,0.4)]'
                    : 'hover:text-zinc-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeSection === idx ? 'bg-[#d0bcff]' : 'bg-transparent'}`} />
                <span>{act.actName}</span>
              </a>
            ))}
          </nav>

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
        {/* ACT I: PROLOGUE / THE OVERTURE */}
        <section
          id="prologue"
          className="relative min-h-[90vh] max-w-5xl mx-auto px-6 sm:px-8 pt-20 pb-28 text-center flex flex-col items-center justify-center"
        >
          {/* Section Indicator Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#1b1924]/80 border border-[#d0bcff]/20 backdrop-blur-xl text-xs font-mono text-[#d0bcff] mb-8 shadow-[0_0_20px_rgba(208,188,255,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#fbabff]" />
            <span className="tracking-widest uppercase font-semibold">ACT I • The Overture</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300">High-Fidelity Audio Engine</span>
          </motion.div>

          {/* Literary Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white max-w-4xl leading-[1.12]"
          >
            Where sound dissolves into memory.{' '}
            <br className="hidden sm:inline" />
            <span className="font-serif italic text-[#d0bcff] font-normal">
              An unhurried haven for the daydreamer.
            </span>
          </motion.h1>

          {/* Thoughtful Narrative Intro */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="mt-8 text-base sm:text-lg text-zinc-300 max-w-2xl font-light leading-relaxed"
          >
            In a digital world crowded with algorithmic clamor, intrusive recommendations, and ephemeral noise, Riveria is built as an unhurried harbor. Mount your personal archives, share quiet sessions with companions across distances, and let your thoughts drift.
          </motion.p>

          {/* Interactive Hero Action Deck */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg"
          >
            {/* Quick-play Sound Tour CTA */}
            <button
              onClick={handleTogglePlay}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-[#a078ff] text-white text-xs uppercase tracking-widest font-semibold hover:brightness-110 transition-all duration-300 shadow-[0_0_35px_rgba(160,120,255,0.4)] hover:scale-[1.02] active:scale-95"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current text-white" />
                  <span>Pause Overture</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5 text-white" />
                  <span>Experience Sound Tour</span>
                </>
              )}
            </button>

            <Link
              to={destination}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#d0bcff]/40 text-zinc-200 hover:text-white text-xs uppercase tracking-widest font-medium transition-all duration-300 shadow-md"
            >
              <span>{token ? 'Enter Studio' : 'Open Riveria'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#d0bcff]" />
            </Link>
          </motion.div>

          {/* Real-time Audio Visualizer Pulse in Hero */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-12 flex items-center justify-center gap-1.5 h-8 px-6 py-2 rounded-full bg-black/40 border border-white/10"
          >
            <Headphones className="w-3.5 h-3.5 text-[#d0bcff] mr-2" />
            <span className="text-[11px] font-mono text-zinc-400 mr-3">
              {isPlaying ? 'Now Playing: Sunflower' : 'Scroll down to travel across soundscapes'}
            </span>
            {waveAmplitudes.slice(0, 10).map((amp, idx) => (
              <motion.span
                key={idx}
                animate={{ height: isPlaying ? `${Math.max(15, amp * 0.28)}px` : '4px' }}
                transition={{ duration: 0.25 }}
                className="w-1 bg-[#d0bcff] rounded-full inline-block"
              />
            ))}
          </motion.div>
        </section>

        {/* ACT II: THE PHILOSOPHY OF REVERIE */}
        <section
          id="philosophy"
          className="py-28 border-y border-white/5 bg-[#0e0e14]/60 relative transition-colors duration-1000"
        >
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl mb-16"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-mono font-semibold">
                  ACT II • The Sovereign Haven
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
                Reclaiming sound from algorithmic noise.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-zinc-400 font-light leading-relaxed">
                Music was never meant to feel like an endless administrative queue of recommendations or an ad-saturated marketplace. We shaped Riveria around three timeless convictions.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="p-8 rounded-2xl bg-[#14141d]/70 border border-white/5 flex flex-col justify-between group hover:border-cyan-400/40 hover:bg-[#161624] transition-all duration-500 shadow-lg"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300 mb-6 group-hover:scale-110 transition-transform">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    Sovereign Belonging
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    The unreleased acoustic sketch, the vinyl rip discovered on a cold November evening—these belong to you, not a corporate database. Riveria mounts audio files straight from your device into your browser session without uploading a single byte to an external server.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
                  <span>Zero Server Uploads</span>
                  <span>In-Memory RAM</span>
                </div>
              </motion.div>

              {/* Pillar 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="p-8 rounded-2xl bg-[#14141d]/70 border border-white/5 flex flex-col justify-between group hover:border-[#d0bcff]/40 hover:bg-[#161624] transition-all duration-500 shadow-lg"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center text-[#d0bcff] mb-6 group-hover:scale-110 transition-transform">
                    <Radio className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    Shared Resonance
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    Listening with a companion across oceans should feel as natural as sitting side by side in the same room. With direct WebRTC peer data channels, when you pause or scrub, their player responds at the exact same millisecond—free from cloud relay delays.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-mono text-[#d0bcff] flex items-center justify-between">
                  <span>Sub-50ms Latency</span>
                  <span>Direct WebRTC</span>
                </div>
              </motion.div>

              {/* Pillar 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="p-8 rounded-2xl bg-[#14141d]/70 border border-white/5 flex flex-col justify-between group hover:border-emerald-400/40 hover:bg-[#161624] transition-all duration-500 shadow-lg"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300 mb-6 group-hover:scale-110 transition-transform">
                    <Waves className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    Unbroken Stillness
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    Audio streams in delicate byte-range chunks that honor the natural dynamics of the recording. No banner promotions, no algorithmic interruptions—just the quiet cadence of the sound moving at your chosen pace.
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                  <span>RFC 9110 Chunks</span>
                  <span>Pure Fidelity</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ACT III: THE LIVING CHAMBER (Fluid Master Deck) */}
        <section id="chamber" className="py-28 relative">
          <div className="max-w-5xl mx-auto px-6 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-2xl mx-auto mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b1928] border border-[#d0bcff]/30 text-xs font-mono text-[#d0bcff] mb-3">
                <Disc3 className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                <span>ACT III • The Living Instrument</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
                Step inside the listening chamber.
              </h2>
              <p className="mt-3 text-sm text-zinc-400 font-light">
                A live, responsive console showcasing Riveria&apos;s fluid audio deck, ambient wave visualizer, and instant multi-source streaming.
              </p>
            </motion.div>

            {/* Glassmorphic Player Deck */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="rounded-3xl bg-[#14131c]/80 backdrop-blur-3xl border border-[#d0bcff]/20 p-6 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] relative overflow-hidden"
            >
              {/* Dynamic ambient background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#201735]/40 via-[#161226]/40 to-[#0e0e0f] opacity-50 -z-10" />

              {/* Deck Topline */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-[#d0bcff] animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#d0bcff]">
                    Chamber Monitor • {isPlaying ? 'Live Cloud Streaming' : 'Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/5">
                    {activePiece.type ? `${activePiece.type} Audio` : 'Cloud Stream'}
                  </span>
                </div>
              </div>

              {/* Main Deck Interior */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-center">
                {/* Artwork & Rotating Vinyl Core */}
                <div className="lg:col-span-5 flex flex-col items-center sm:items-start">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-[#0e0e14] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group">
                    {activePiece.imageSrc ? (
                      <div className="absolute inset-0">
                        <img
                          src={activePiece.imageSrc}
                          alt={activePiece.title}
                          className="w-full h-full object-cover opacity-40 scale-105 blur-[1px] group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
                      </div>
                    ) : null}
                    <motion.div
                      animate={{ rotate: isPlaying ? 360 : 0 }}
                      transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                      className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-white/10 bg-gradient-to-tr from-[#1b1528] to-[#0e0e14] flex items-center justify-center shadow-inner relative z-10 backdrop-blur-xs"
                    >
                      <div className="w-12 h-12 rounded-full border border-[#d0bcff]/40 bg-gradient-to-br from-[#d0bcff] to-[#89ceff] flex items-center justify-center shadow-[0_0_20px_rgba(208,188,255,0.4)]">
                        <span className="material-symbols-outlined text-black text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          graphic_eq
                        </span>
                      </div>
                    </motion.div>
                    <div className="absolute bottom-3 left-3 text-[10px] font-mono text-[#d0bcff]/90 uppercase tracking-widest relative z-10 bg-black/50 px-2 py-0.5 rounded">
                      Chamber Deck
                    </div>
                  </div>
                </div>

                {/* Track Details & Visualizer */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-xs font-serif italic text-[#d0bcff]">
                      Master Track #{currentTrackIndex + 1}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight mt-1 truncate">
                      {activePiece.title}
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-1">
                      {activePiece.artist || 'Riveria Cloud Archives'}
                    </p>
                    <p className="text-xs text-zinc-500 italic mt-2">
                      “Direct RFC 9110 byte-range chunk streaming with zero-buffer latency”
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
                      <span className="text-[#d0bcff]">
                        {totalDurationFormatted !== '00:00' ? totalDurationFormatted : (activePiece.duration || '03:20')}
                      </span>
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
                        className="w-12 h-12 rounded-full bg-[#d0bcff] hover:bg-[#e9ddff] text-black flex items-center justify-center transition-all transform active:scale-95 shadow-[0_0_25px_rgba(208,188,255,0.45)]"
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
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-20 sm:w-24 accent-[#d0bcff] h-1 rounded-full cursor-pointer bg-white/10"
                      />
                      <span className="text-[10px] font-mono text-zinc-400">{volume}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Cloud Tracks Selector Pills */}
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
                          ? 'bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/50 shadow-[0_0_15px_rgba(208,188,255,0.25)]'
                          : 'bg-white/[0.02] text-zinc-400 border border-white/5 hover:border-white/20 hover:text-zinc-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${currentTrackIndex === idx ? 'bg-[#d0bcff]' : 'bg-zinc-600'}`} />
                      <span className="max-w-[180px] truncate">{track.title}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ACT IV: THE ARCHITECTURE OF RESTRAINT */}
        <section id="tenets" className="py-28 border-t border-white/5 bg-[#0a0a0f]">
          <div className="max-w-5xl mx-auto px-6 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl mb-16"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-mono font-semibold">
                  ACT IV • Architecture of Restraint
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
                Honesty in every byte.
              </h2>
              <p className="mt-3 text-sm text-zinc-400 font-light">
                No corporate sleight of hand. Just pure sound technology woven around listener autonomy.
              </p>
            </motion.div>

            <div className="space-y-6">
              {/* Architecture 1 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="p-8 rounded-2xl bg-[#14131c]/50 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-emerald-400/40 transition-all duration-300"
              >
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-1">
                    <Feather className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Zero-Copy In-Memory Audio Mounts
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1.5 leading-relaxed">
                      Select any local folder on your computer. Riveria creates instantaneous, in-memory browser Object URLs. Your audio plays with pure fidelity right off your drive—no server upload, no storage fees, and zero data leakage.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 px-3 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-400/20 flex-shrink-0">
                  Client-Side Sovereignty
                </span>
              </motion.div>

              {/* Architecture 2 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="p-8 rounded-2xl bg-[#14131c]/50 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#d0bcff]/40 transition-all duration-300"
              >
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center text-[#d0bcff] flex-shrink-0 mt-1">
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
                <span className="text-xs font-mono text-[#d0bcff] px-3 py-1.5 rounded-full bg-purple-950/30 border border-[#d0bcff]/20 flex-shrink-0">
                  Direct Peer DataChannels
                </span>
              </motion.div>

              {/* Architecture 3 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="p-8 rounded-2xl bg-[#14131c]/50 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-cyan-400/40 transition-all duration-300"
              >
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-1">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Stillness Without Surveillance
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1.5 leading-relaxed">
                      No cross-site pixels. No third-party behavioral trackers. No hidden cookies profiling your emotional states through song choices. Riveria exists simply to play your music.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-cyan-400 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-400/20 flex-shrink-0">
                  Zero Telemetry
                </span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ACT V: THE DAYDREAM HORIZON */}
        <section id="horizon" className="py-28 relative overflow-hidden border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-[#1c1a26]/90 via-[#15141f]/95 to-[#0a0a0f] border border-[#d0bcff]/20 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.85)]"
            >
              <span className="text-xs uppercase tracking-[0.25em] text-[#d0bcff] font-mono font-semibold">
                ACT V • The Daydream Horizon
              </span>
              <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight mt-3">
                Lose yourself in the reverie.
              </h2>
              <p className="mt-6 text-sm sm:text-base text-zinc-300 font-light max-w-xl mx-auto leading-relaxed">
                There are no algorithmic feeds to scroll, no commercial interruptions to endure, and no barriers between your files and your queue. Just you, your music, and the quiet clarity of reverie.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={destination}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-[#a078ff] text-white text-xs uppercase tracking-widest font-semibold hover:brightness-110 transition-all duration-300 shadow-[0_0_35px_rgba(160,120,255,0.4)] hover:scale-[1.01]"
                >
                  <span>{token ? 'Enter Riveria Studio' : 'Step Into Riveria'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a
                  href="https://github.com/Parth-Chavan-15/Riveria"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-xs uppercase tracking-widest font-medium transition-all duration-300"
                >
                  <span>Explore the Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="mt-8 text-[11px] font-mono text-zinc-500">
                Crafted for listeners who cherish stillness and personal sovereignty.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Floating Cinematic Audio Journey Dock (Appears as user scrolls through sections) */}
      <AnimatePresence>
        {showFloatingDock && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-2xl bg-[#12111a]/85 backdrop-blur-2xl border border-[#d0bcff]/30 rounded-2xl p-3 sm:px-5 sm:py-3 shadow-[0_15px_50px_rgba(0,0,0,0.85)] flex items-center justify-between gap-4"
          >
            {/* Left: Act + Track Metadata */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d0bcff] to-[#89ceff] flex items-center justify-center text-black flex-shrink-0 shadow-[0_0_12px_rgba(208,188,255,0.3)]">
                <span className="material-symbols-outlined text-lg font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                  graphic_eq
                </span>
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#d0bcff] font-semibold">
                    {ACT_METADATA[activeSection]?.actNumber}: {ACT_METADATA[activeSection]?.actName}
                  </span>
                </div>
                <p className="text-xs font-medium text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {activePiece.title}
                </p>
              </div>
            </div>

            {/* Center: Live Waveform in mini dock */}
            <div className="hidden sm:flex items-end gap-1 h-6 w-20 px-2 py-1 rounded bg-black/40 border border-white/5">
              {waveAmplitudes.slice(0, 8).map((amp, idx) => (
                <motion.span
                  key={idx}
                  animate={{ height: isPlaying ? `${Math.max(15, amp * 0.25)}px` : '3px' }}
                  transition={{ duration: 0.2 }}
                  className="w-1 bg-[#d0bcff] rounded-full inline-block"
                />
              ))}
            </div>

            {/* Right: Controls & Follow Scroll Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setFollowScroll(!followScroll)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                  followScroll
                    ? 'bg-[#d0bcff]/20 text-[#d0bcff] border-[#d0bcff]/40 shadow-[0_0_10px_rgba(208,188,255,0.2)]'
                    : 'bg-white/[0.03] text-zinc-400 border-white/10 hover:text-zinc-200'
                }`}
                title="When active, music automatically changes as you scroll across sections"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="hidden md:inline">Sync Scroll</span>
              </button>

              <button
                onClick={handlePrevTrack}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                title="Previous Movement"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full bg-[#d0bcff] hover:bg-[#e9ddff] text-black flex items-center justify-center transition-transform active:scale-90 shadow-[0_0_15px_rgba(208,188,255,0.4)]"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNextTrack}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                title="Next Movement"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Epilogue: Literary Footer */}
      <footer className="w-full bg-[#07070a] py-16 border-t border-white/5">
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
