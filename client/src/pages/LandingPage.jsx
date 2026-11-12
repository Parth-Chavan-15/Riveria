import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Radio,
  HardDrive,
  Waves,
  ShieldCheck,
  Bell,
  Volume2,
  ArrowRight,
  ChevronRight,
  Disc,
  Zap,
  Sparkles,
  Lock,
  CheckCircle2,
  Activity,
  Headphones,
  Terminal,
  ExternalLink,
  Database,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { token } = useAuth();
  const destination = token ? '/' : '/auth';

  // Interactive Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [progress, setProgress] = useState(34);
  const [activeTab, setActiveTab] = useState('telemetry');
  const [bellPulse, setBellPulse] = useState(false);

  const tracks = [
    {
      title: 'Solaris (Reverie Master)',
      artist: 'Kroma & The Drift',
      duration: '04:18',
      format: 'FLAC 24-bit / 96kHz',
      size: '58.4 MB',
      source: 'Node Byte-Stream',
      gradient: 'from-cyan-500/30 via-indigo-500/20 to-black',
    },
    {
      title: 'Sub-Zero Resonance',
      artist: 'Aethelgard',
      duration: '03:45',
      format: 'WAV Lossless 32-bit',
      size: '76.1 MB',
      source: 'Air-Gapped Local Mount',
      gradient: 'from-violet-500/30 via-fuchsia-500/20 to-black',
    },
    {
      title: 'Echoes in the Mesh',
      artist: 'Neural Session 09',
      duration: '05:12',
      format: 'Opus 510kbps P2P',
      size: '22.8 MB',
      source: 'WebRTC P2P Room',
      gradient: 'from-emerald-500/30 via-cyan-500/20 to-black',
    },
  ];

  const currentTrack = tracks[activeTrackIndex];

  // Simulated player scrubber loop
  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 99 ? 0 : prev + 0.45));
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Periodic notification pulse simulation
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setBellPulse(true);
      setTimeout(() => setBellPulse(false), 2000);
    }, 8000);
    return () => clearInterval(pulseInterval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-zinc-100 font-['Montserrat',sans-serif] selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      {/* Dynamic Ambient Mesh Glow Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[25%] -left-[15%] w-[65vw] h-[65vw] rounded-full bg-radial from-violet-600/15 via-cyan-500/10 to-transparent blur-[140px] animate-pulse duration-[8000ms]" />
        <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-radial from-cyan-500/15 via-blue-600/10 to-transparent blur-[160px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-radial from-indigo-600/10 via-purple-600/10 to-transparent blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Floating Glassmorphic Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-cyan-600 to-violet-600 p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]">
              <div className="w-full h-full bg-[#0d1117] rounded-[11px] flex items-center justify-center">
                <Disc className="w-5 h-5 text-cyan-400 transition-transform duration-700 group-hover:rotate-180" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-xl tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  RIVERIA
                </span>
                <span className="text-[10px] tracking-widest font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  ENGINE v2.4
                </span>
              </div>
              <p className="text-[10px] font-medium text-zinc-400 tracking-wider uppercase">
                Audiophile Reverie System
              </p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a href="#arsenal" className="hover:text-cyan-400 transition-colors">The Arsenal</a>
            <a href="#engine" className="hover:text-cyan-400 transition-colors">Engine Cockpit</a>
            <a href="#philosophy" className="hover:text-cyan-400 transition-colors">The Daydream</a>
            <a href="#comparison" className="hover:text-cyan-400 transition-colors">Architecture</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              P2P Mesh: Ready
            </div>

            {token ? (
              <Link
                to="/"
                className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Launch Studio
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/auth"
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Initialize Engine
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-36 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>BEYOND SPREADSHEETS OF ALBUM ART</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300">REVERIE ENGINE ONLINE</span>
            </motion.div>

            {/* Massive Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-['Plus_Jakarta_Sans',sans-serif] text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]"
            >
              The Edge of Audio.{' '}
              <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(6,182,212,0.4)]">
                Synced to the Millisecond.
              </span>
            </motion.h1>

            {/* Sub-headline embracing the Reverie concept */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-7 text-lg sm:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed font-light"
            >
              Derived from <span className="text-cyan-300 font-medium italic">reverie</span> — a state of being pleasantly lost in one’s daydream. Riveria reclaims music from the sanitized corporate feeds, uniting{' '}
              <span className="text-white font-medium">zero-latency WebRTC peer jams</span>,{' '}
              <span className="text-white font-medium">air-gapped local storage</span>, and{' '}
              <span className="text-white font-medium">RFC 9110 byte-range streams</span> into one uncompromising, audiophile-grade engine.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to={destination}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-black bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400 bg-[length:200%_auto] hover:bg-[position:right_center] shadow-[0_0_35px_rgba(6,182,212,0.5)] hover:shadow-[0_0_50px_rgba(6,182,212,0.8)] transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
              >
                <span>{token ? 'Enter Dashboard Studio' : 'Initialize Engine Free'}</span>
                <ArrowRight className="w-5 h-5 text-black" />
              </Link>
              <a
                href="#arsenal"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 backdrop-blur-xl transition-all duration-300 hover:text-white"
              >
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>Explore The Arsenal</span>
              </a>
            </motion.div>

            {/* Micro Audiophile Telemetry Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left"
            >
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[11px] font-mono text-zinc-400 uppercase">Clock Jitter</p>
                <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">±0.2 ms</p>
                <p className="text-[10px] text-zinc-500">P2P DataChannel mesh</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[11px] font-mono text-zinc-400 uppercase">Stream Pipeline</p>
                <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">RFC 9110</p>
                <p className="text-[10px] text-zinc-500">Node byte-range chunks</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[11px] font-mono text-zinc-400 uppercase">Local Storage</p>
                <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">Zero Cloud</p>
                <p className="text-[10px] text-zinc-500">Air-gapped memory buffers</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[11px] font-mono text-zinc-400 uppercase">Audio Guard</p>
                <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">Magic Byte</p>
                <p className="text-[10px] text-zinc-500">Binary signature validator</p>
              </div>
            </motion.div>
          </div>

          {/* Floating Glassmorphic Player Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="relative group">
              {/* Outer Glow Halo */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt" />

              {/* Glass Cockpit Container */}
              <div className="relative rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden">
                {/* Header Bar */}
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
                    </div>
                    <span className="text-xs font-mono text-zinc-400 tracking-wider pl-2 border-l border-white/10">
                      RIVERIA_CORE // AUDIO_DAW_SURFACE
                    </span>
                  </div>

                  {/* Active Peer Avatars */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 bg-cyan-950/50 px-2.5 py-1 rounded-full border border-cyan-800/40">
                      <Radio className="w-3 h-3 animate-pulse" />
                      JAM ROOM: #8842 (3 PEERS SYNCED)
                    </span>
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-zinc-900 bg-cyan-600 text-[10px] font-bold text-center leading-6 text-black">
                        YO
                      </div>
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-zinc-900 bg-violet-600 text-[10px] font-bold text-center leading-6 text-white">
                        TY
                      </div>
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-zinc-900 bg-emerald-600 text-[10px] font-bold text-center leading-6 text-black">
                        BL
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player Main Surface */}
                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Vinyl Art & Dynamic Visualizer */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl p-3 bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
                      <div className={`w-full h-full rounded-xl bg-gradient-to-tr ${currentTrack.gradient} flex flex-col items-center justify-center relative overflow-hidden`}>
                        {/* Vinyl Center Hole Motif */}
                        <motion.div
                          animate={{ rotate: isPlaying ? 360 : 0 }}
                          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                          className="w-28 h-28 rounded-full border-4 border-white/10 bg-black/60 flex items-center justify-center shadow-inner"
                        >
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                            <Disc className="w-5 h-5 text-cyan-400" />
                          </div>
                        </motion.div>

                        {/* Floating Sound Waves Overlay */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-center gap-1 h-10 bg-black/40 backdrop-blur-md rounded-lg p-1.5 border border-white/5">
                          {[35, 75, 45, 90, 60, 30, 85, 95, 40, 70, 50, 80, 65, 40].map((h, i) => (
                            <motion.span
                              key={i}
                              animate={
                                isPlaying
                                  ? {
                                      height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`],
                                    }
                                  : { height: '15%' }
                              }
                              transition={{
                                duration: 0.6 + (i % 5) * 0.15,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                              className="w-1.5 bg-gradient-to-t from-cyan-500 to-violet-400 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Source pill */}
                    <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400 font-mono">
                      <Database className="w-3 h-3 text-cyan-400" />
                      <span>{currentTrack.source}</span>
                    </div>
                  </div>

                  {/* Right Column: Track Telemetry & Controls */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Track Titles & Format */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            STREAMING LIVE
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">{currentTrack.format}</span>
                        </div>
                        <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl font-extrabold text-white mt-1">
                          {currentTrack.title}
                        </h3>
                        <p className="text-zinc-400 text-sm font-medium">{currentTrack.artist}</p>
                      </div>

                      {/* Format Badge */}
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-mono text-zinc-400 block">{currentTrack.size}</span>
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3 h-3" />
                          Zero Clock Drift
                        </span>
                      </div>
                    </div>

                    {/* Scrubber Progress Bar */}
                    <div className="space-y-2">
                      <div className="relative w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5 cursor-pointer">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-violet-500 relative"
                          style={{ width: `${progress}%` }}
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_#fff]" />
                        </motion.div>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span>01:28</span>
                        <span className="text-cyan-400/80 font-mono">Byte Chunk: 1,048,576 - 2,097,151</span>
                        <span>{currentTrack.duration}</span>
                      </div>
                    </div>

                    {/* Master Transport Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-14 h-14 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all transform active:scale-95"
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6 fill-current" />
                          ) : (
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setActiveTrackIndex((prev) => (prev + 1) % tracks.length)
                          }
                          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all text-xs font-mono flex items-center gap-2"
                        >
                          <span>Next Source</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* WebRTC Master Sync Status Indicator */}
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col text-right">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">WebRTC Sync Delay</span>
                          <span className="text-xs font-mono text-emerald-400 font-semibold">0.00 ms (Frame Lock)</span>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                          <Volume2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Source Selector Pills */}
                    <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                      {tracks.map((t, idx) => (
                        <button
                          key={t.title}
                          onClick={() => {
                            setActiveTrackIndex(idx);
                            setProgress(15);
                            setIsPlaying(true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                            activeTrackIndex === idx
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                              : 'bg-white/5 text-zinc-400 border border-white/5 hover:border-white/20 hover:text-zinc-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {t.title.split(' ')[0]} ({t.source.split(' ')[0]})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Arsenal (Feature Grid) */}
      <section id="arsenal" className="py-24 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-4">
              <Zap className="w-3.5 h-3.5" />
              THE ARSENAL
            </div>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Engineered for Audiophiles.
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Synchronized without Compromise.
              </span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light">
              Mainstream streaming platforms trap your library inside walled gardens and lossy codecs. Riveria replaces that paradigm with direct peer mesh protocols, air-gapped device mounts, and pure byte streams.
            </p>
          </div>

          {/* 3 Flagship Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Zero-Latency Jams */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-2xl bg-zinc-950/50 border border-white/10 hover:border-cyan-500/40 p-8 backdrop-blur-xl group shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                <Radio className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest block mb-2">
                P2P DATACHANNEL MESH
              </span>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-white mb-3">
                Zero-Latency Jams
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                When you hit pause, your friends stop at the exact same millisecond. Using direct WebRTC peer data channels, playback state and seek head coordinates travel over an encrypted peer mesh—bypassing cloud servers for instantaneous synchronization.
              </p>

              {/* Technical Spec Box */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 font-mono text-xs space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Signaling:</span>
                  <span className="text-cyan-400">Socket.IO Rooms</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Transport:</span>
                  <span className="text-zinc-200">RTCDataChannel (UDP)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Sync Delta:</span>
                  <span className="text-emerald-400">&lt; 1.5ms drift</span>
                </div>
              </div>
            </motion.div>

            {/* Pillar 2: The Hybrid Hub */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-2xl bg-zinc-950/50 border border-white/10 hover:border-violet-500/40 p-8 backdrop-blur-xl group shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-950/70 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all">
                <HardDrive className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-violet-400 uppercase tracking-widest block mb-2">
                AIR-GAPPED LOCAL MOUNT
              </span>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-white mb-3">
                The Hybrid Hub
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Never upload your multi-gigabyte lossless library to third-party databases. Riveria mounts audio files directly in the browser via zero-copy object URLs, seamlessly blending air-gapped local folders with your cloud database into one unified queue.
              </p>

              {/* Technical Spec Box */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 font-mono text-xs space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Storage:</span>
                  <span className="text-violet-400">In-Memory Object URLs</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Data Ingestion:</span>
                  <span className="text-zinc-200">0 bytes uploaded</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Catalog Fusion:</span>
                  <span className="text-emerald-400">Instant Unified Queue</span>
                </div>
              </div>
            </motion.div>

            {/* Pillar 3: Audiophile Fidelity */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-2xl bg-zinc-950/50 border border-white/10 hover:border-cyan-500/40 p-8 backdrop-blur-xl group shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                <Waves className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest block mb-2">
                RFC 9110 BYTE-RANGE STREAMING
              </span>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-bold text-white mb-3">
                Audiophile Fidelity
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                No lossy transcoding artifacts or dynamic range compression. Our Node.js streaming core fulfills RFC 9110 HTTP Range requests with 206 Partial Content slicing, piping pristine audio buffers with zero playback stalls and instantaneous seeking.
              </p>

              {/* Technical Spec Box */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 font-mono text-xs space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Chunking:</span>
                  <span className="text-cyan-400">HTTP 206 Partial Content</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Supported:</span>
                  <span className="text-zinc-200">FLAC, WAV, OGG, WebM</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Sanitization:</span>
                  <span className="text-emerald-400">Magic Byte Verified</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The "Engine" Showcase (Visual Breakout) */}
      <section id="engine" className="py-24 border-t border-white/5 relative bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-cyan-300 text-xs font-mono mb-4">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              FULL-SPECTRUM ARCHITECTURE
            </div>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              The Engine in Action.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light">
              Behind Riveria’s minimalist glass facade lies a multi-threaded reactive engine managing live Socket.IO notification cascades, strict cryptographic RBAC, and binary audio guards.
            </p>
          </div>

          {/* Interactive Breakout Console */}
          <div className="rounded-3xl bg-zinc-950/90 border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden">
            {/* Console Tabs */}
            <div className="border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('telemetry')}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                    activeTab === 'telemetry'
                      ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Live Socket.IO Stream
                </button>
                <button
                  onClick={() => setActiveTab('rbac')}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                    activeTab === 'rbac'
                      ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin RBAC Controls
                </button>
                <button
                  onClick={() => setActiveTab('signature')}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                    activeTab === 'signature'
                      ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Magic Byte Binary Guard
                </button>
              </div>

              {/* Notification Bell Simulator */}
              <div className="flex items-center gap-3">
                <div
                  className={`relative p-2 rounded-lg border transition-all ${
                    bellPulse
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      : 'bg-white/5 border-white/10 text-zinc-400'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400" />
                </div>
                <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                  Real-Time Notification Pipeline
                </span>
              </div>
            </div>

            {/* Console Screen */}
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'telemetry' && (
                  <motion.div
                    key="telemetry"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                  >
                    <div className="lg:col-span-2 space-y-4 font-mono text-xs">
                      <div className="p-4 rounded-xl bg-black/60 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-zinc-500 pb-2 border-b border-white/5">
                          <span>SOCKET_EVENT_LOG</span>
                          <span className="text-emerald-400">CHANNEL: authenticated</span>
                        </div>
                        <div className="text-cyan-400 flex items-start gap-2">
                          <span className="text-zinc-600">07:11:02.418</span>
                          <span>[track:created] "Solaris (Reverie Master)" broadcasted to 28 active listeners</span>
                        </div>
                        <div className="text-zinc-300 flex items-start gap-2">
                          <span className="text-zinc-600">07:11:03.102</span>
                          <span>[jam:signal] WebRTC offer-answer handshake negotiated via ICE trickle</span>
                        </div>
                        <div className="text-emerald-300 flex items-start gap-2">
                          <span className="text-zinc-600">07:11:04.882</span>
                          <span>[notification] Admin broadcast: "Lossless FLAC library synced to global cluster"</span>
                        </div>
                        <div className="text-violet-400 flex items-start gap-2">
                          <span className="text-zinc-600">07:11:05.120</span>
                          <span>[jam:sync] Playhead synchronized at sample position 4,819,200</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                          <span className="text-zinc-500 block text-[10px]">Active Room Sockets</span>
                          <span className="text-cyan-400 text-lg font-bold">142 Connected</span>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                          <span className="text-zinc-500 block text-[10px]">Buffer Health</span>
                          <span className="text-emerald-400 text-lg font-bold">100.0% Lossless</span>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 col-span-2 sm:col-span-1">
                          <span className="text-zinc-500 block text-[10px]">Average Stream Latency</span>
                          <span className="text-cyan-400 text-lg font-bold">&lt; 3.8ms</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                      <div>
                        <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-white text-base mb-2">
                          Socket.IO Heartbeat
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Clients establish authenticated WebSockets using JWT handshake verification. Instant broadcasts ensure every album mutation, admin track drop, and room sync reflects across all screens without browser refreshes.
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/5">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                          Cluster Node Location
                        </span>
                        <span className="text-xs font-mono text-zinc-200">
                          us-east-1 // MongoDB Atlas Tier 1
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'rbac' && (
                  <motion.div
                    key="rbac"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs"
                  >
                    <div className="lg:col-span-2 p-5 rounded-xl bg-black/60 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <span className="text-cyan-400 font-bold">ROLE_BASED_ACCESS_MATRIX</span>
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/40 text-[10px]">
                          STRICT ENFORCEMENT
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2.5 rounded bg-white/[0.02] border border-white/5">
                          <span className="text-zinc-300">Public User (`role: user`)</span>
                          <span className="text-zinc-400">Stream tracks, join P2P Jams, mount local storage</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded bg-cyan-950/30 border border-cyan-800/40">
                          <span className="text-cyan-300 font-bold">Administrator (`role: admin`)</span>
                          <span className="text-cyan-400">Upload multipart audio, edit cloud metadata, delete tracks</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded bg-white/[0.02] border border-white/5">
                          <span className="text-zinc-300">Registration Escalation Guard</span>
                          <span className="text-emerald-400">Zod rejected on caller-supplied roles (422)</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                      <div>
                        <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-white text-base mb-2 font-sans">
                          Cryptographic Integrity
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                          Admin privileges cannot be self-assigned. All mutations require strict JSON Web Tokens with verified issuer claims, safeguarding cloud library ownership.
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/5">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                          Hashing Algorithm
                        </span>
                        <span className="text-xs font-mono text-zinc-200">
                          bcrypt with 10 salt rounds + JWT Bearer
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'signature' && (
                  <motion.div
                    key="signature"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs"
                  >
                    <div className="lg:col-span-2 p-5 rounded-xl bg-black/60 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <span className="text-cyan-400 font-bold">MAGIC_BYTE_INSPECTION_PIPELINE</span>
                        <span className="text-emerald-400">SPOOF DETECTION ACTIVE</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 flex justify-between">
                          <span className="text-zinc-400">FLAC Header</span>
                          <span className="text-cyan-400">0x66 0x4C 0x61 0x43 ("fLaC")</span>
                        </div>
                        <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 flex justify-between">
                          <span className="text-zinc-400">RIFF WAV Header</span>
                          <span className="text-cyan-400">0x52 0x49 0x46 0x46 ... 0x57 0x41 0x56 0x45 ("WAVE")</span>
                        </div>
                        <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 flex justify-between">
                          <span className="text-zinc-400">MPEG Layer 3 (MP3)</span>
                          <span className="text-cyan-400">0x49 0x44 0x33 ("ID3") or sync byte 0xFF 0xFB</span>
                        </div>
                        <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 flex justify-between">
                          <span className="text-zinc-400">OGG Vorbis / Opus</span>
                          <span className="text-cyan-400">0x4F 0x67 0x67 0x53 ("OggS")</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                      <div>
                        <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-white text-base mb-2 font-sans">
                          Zero-Trust Audio Ingestion
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                          Unlike primitive file extensions that can be spoofed by malware or corrupt payloads, Riveria inspects raw binary magic bytes at the file descriptor level before storage.
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/5">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                          Validation Action
                        </span>
                        <span className="text-xs font-mono text-red-400">
                          Automatic fs.unlink() on invalid signatures
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* The Reverie Philosophy Breakout */}
      <section id="philosophy" className="py-28 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 mb-6 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
              <Headphones className="w-7 h-7" />
            </div>

            <p className="text-xs font-mono tracking-widest text-cyan-400 uppercase mb-3">
              THE PHILOSOPHY
            </p>

            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              "Reverie: <span className="font-serif italic font-normal text-cyan-300">A state of being pleasantly lost in one's daydream.</span>"
            </h2>

            <p className="mt-6 text-base sm:text-lg text-zinc-300 font-light leading-relaxed max-w-3xl mx-auto">
              Mainstream streaming transformed music into endless algorithmic dopamine loops—cluttered spreadsheets of thumbnail art, invasive ads, and heavily compressed audio bitrates.
            </p>

            <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light leading-relaxed max-w-3xl mx-auto">
              Riveria was founded as a digital sanctuary. An unhurried, dark-mode listening room where you can mount your rarest lossless records, listen in flawless sub-millisecond sync with people you love, and disappear inside the sound.
            </p>

            <div className="mt-10 flex items-center justify-center gap-6 text-sm font-mono text-zinc-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                No Ad Injections
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                No Bitrate Downgrades
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                No Cloud Lock-in
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comparison Matrix: Riveria vs Old Industry */}
      <section id="comparison" className="py-24 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered Beyond Legacy Services.
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base font-light">
              See how Riveria's hybrid architecture fundamentally diverges from mainstream audio players.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-mono">
                  <th className="py-4 px-4 font-normal">CAPABILITY</th>
                  <th className="py-4 px-4 font-bold text-cyan-400 bg-cyan-950/20 rounded-t-xl">RIVERIA ENGINE</th>
                  <th className="py-4 px-4 font-normal">SPOTIFY</th>
                  <th className="py-4 px-4 font-normal">YOUTUBE MUSIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                <tr>
                  <td className="py-4 px-4 text-zinc-200 font-sans font-medium">Listening Room Sync</td>
                  <td className="py-4 px-4 text-cyan-300 font-bold bg-cyan-950/10">Sub-ms WebRTC Mesh (Zero Drift)</td>
                  <td className="py-4 px-4 text-zinc-400">Server relay (1-3s jitter)</td>
                  <td className="py-4 px-4 text-zinc-400">Third-party add-ons required</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-zinc-200 font-sans font-medium">Local Unreleased Files</td>
                  <td className="py-4 px-4 text-cyan-300 font-bold bg-cyan-950/10">Air-Gapped Zero-Copy Object URLs</td>
                  <td className="py-4 px-4 text-zinc-400">Fragile local network sync</td>
                  <td className="py-4 px-4 text-zinc-400">Must upload whole library</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-zinc-200 font-sans font-medium">Streaming Protocol</td>
                  <td className="py-4 px-4 text-cyan-300 font-bold bg-cyan-950/10">RFC 9110 Byte-Range Slicing</td>
                  <td className="py-4 px-4 text-zinc-400">Proprietary OGG chunks</td>
                  <td className="py-4 px-4 text-zinc-400">Opus/AAC adaptive streams</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-zinc-200 font-sans font-medium">Interface Density</td>
                  <td className="py-4 px-4 text-cyan-300 font-bold bg-cyan-950/10">Audiophile Glassmorphic Cockpit</td>
                  <td className="py-4 px-4 text-zinc-400">Cluttered commercial grid</td>
                  <td className="py-4 px-4 text-zinc-400">Video player spreadsheet</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-zinc-200 font-sans font-medium">Data Sovereignty</td>
                  <td className="py-4 px-4 text-cyan-300 font-bold bg-cyan-950/10">100% Self-Hostable / Docker Ready</td>
                  <td className="py-4 px-4 text-zinc-400">Closed ecosystem</td>
                  <td className="py-4 px-4 text-zinc-400">Closed ecosystem</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final High-Conversion CTA */}
      <section className="py-24 relative overflow-hidden border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="relative rounded-3xl p-10 sm:p-16 bg-gradient-to-br from-cyan-950/50 via-zinc-950/90 to-violet-950/40 border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.25)] backdrop-blur-2xl">
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Step Beyond the Algorithmic Grid.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">
                Enter Riveria.
              </span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-300 font-light max-w-2xl mx-auto">
              Initialize the engine, invite your inner circle, and experience listening as it was intended. Pure sound, zero latency, absolute sovereignty.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={destination}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.6)] hover:shadow-[0_0_50px_rgba(6,182,212,0.9)] transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
              >
                <span>{token ? 'Enter Studio Now' : 'Initialize Engine Free'}</span>
                <ArrowRight className="w-5 h-5 text-black" />
              </Link>
            </div>

            <p className="mt-6 text-xs font-mono text-zinc-500">
              No credit card required • Instant browser execution • Open-source engine
            </p>
          </div>
        </div>
      </section>

      {/* Minimal Audiophile Footer */}
      <footer className="border-t border-white/5 bg-[#070707] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center">
              <Disc className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-white">
                RIVERIA MUSIC ENGINE
              </span>
              <p className="text-[11px] text-zinc-500">
                Built for Audiophiles, Daydreamers & Pure Sound.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <span className="font-mono text-zinc-600">RFC 9110 • WebRTC • Socket.IO • Docker</span>
            <a
              href="https://github.com/Parth-Chavan-15/Riveria"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
