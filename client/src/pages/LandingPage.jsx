import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Disc,
  HardDrive,
  Radio,
  Waves,
  ArrowRight,
  Lock,
  Volume2,
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Terminal,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { token } = useAuth();
  const destination = token ? '/' : '/auth';

  // Interactive Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [progress, setProgress] = useState(44);
  const [volume, setVolume] = useState(84);
  const [eqHeights, setEqHeights] = useState([
    45, 75, 90, 60, 80, 95, 70, 85, 65, 50, 35, 20, 55, 70,
  ]);

  const demoTracks = [
    {
      title: 'Ethereal Oceanography — Movement IV',
      artist: 'Riveria Chamber Orchestra',
      mastering: "Côte d'Azur Sound Lab • Studio Master",
      format: '24-bit / 96kHz FLAC',
      duration: '06:42',
      source: 'Node.js Byte-Stream (RFC 9110)',
    },
    {
      title: 'Nocturne in Abyssal Violet',
      artist: 'Kroma & The Field',
      mastering: 'Air-Gapped Local Mount (RAM URL)',
      format: 'Lossless WAV 32-bit',
      duration: '04:18',
      source: 'Local Device File Mount',
    },
    {
      title: 'Sub-Zero Resonance',
      artist: 'Aethelgard Session 03',
      mastering: 'Direct WebRTC Peer Mesh',
      format: 'Opus 510kbps P2P',
      duration: '05:04',
      source: 'WebRTC P2P DataChannel',
    },
  ];

  const currentTrack = demoTracks[activeTrackIndex];

  // Equalizer visualizer animation loop
  useEffect(() => {
    if (!isPlaying) return undefined;
    const interval = setInterval(() => {
      setEqHeights((prev) =>
        prev.map(() => Math.floor(Math.random() * 75) + 20)
      );
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Scrubber loop
  useEffect(() => {
    if (!isPlaying) return undefined;
    const scrubberInterval = setInterval(() => {
      setProgress((prev) => (prev >= 99 ? 0 : prev + 0.35));
    }, 150);
    return () => clearInterval(scrubberInterval);
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-[#e5e2e3] font-['Inter',sans-serif] selection:bg-[#a078ff] selection:text-white relative overflow-x-hidden">
      {/* Ambient Ethereal Violet Glow Spheres */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[550px] bg-[#d0bcff]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[900px] -right-32 w-[600px] h-[600px] bg-[#fbabff]/8 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-[2100px] -left-32 w-[550px] h-[550px] bg-[#a078ff]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[3200px] right-1/4 w-[650px] h-[650px] bg-[#d0bcff]/8 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0e0e0f]/85 backdrop-blur-2xl border-b border-white/5 shadow-[0_1px_16px_rgba(0,0,0,0.6)]">
        <div className="h-20 w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d0bcff] to-[#8fcdff] flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)]">
              <Disc className="w-5 h-5 text-black transition-transform duration-700 group-hover:rotate-180" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-widest text-[#d0bcff] uppercase select-none">
                Riveria
              </span>
              <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#201f20] text-[#d0bcff] border border-[#d0bcff]/20 font-mono hidden sm:inline-block">
                Open Engine
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold uppercase tracking-[0.14em]">
            <a
              href="#experience"
              className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors duration-200"
            >
              Experience
            </a>
            <a
              href="#architecture"
              className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors duration-200"
            >
              Architecture
            </a>
            <a
              href="#hybrid-hub"
              className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors duration-200"
            >
              Local Sync Hub
            </a>
            <a
              href="#open-source"
              className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors duration-200"
            >
              Open Source
            </a>
          </nav>

          {/* Header Action CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="#experience"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#2a2a2b]/60 backdrop-blur-xl border border-[#d0bcff]/20 text-[#e5e2e3] text-xs uppercase tracking-widest font-semibold hover:border-[#d0bcff]/40 hover:text-[#d0bcff] transition-all duration-300 shadow-[0_0_15px_rgba(160,120,255,0.12)]"
            >
              Explore Stream
            </a>

            <Link
              to={destination}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-[#a078ff] text-white text-xs uppercase tracking-widest font-semibold hover:brightness-110 transition-all duration-300 shadow-[0_0_24px_rgba(160,120,255,0.45)]"
            >
              <span>{token ? 'Open Studio' : 'Launch Free App'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-20">
        {/* 1. HERO SECTION */}
        <section className="relative w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 pt-16 pb-24 flex flex-col items-center text-center">
          {/* Status Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2a2a2b]/70 backdrop-blur-2xl border border-[#d0bcff]/30 shadow-[0_0_20px_rgba(160,120,255,0.15)] mb-8 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#d0bcff] shadow-[0_0_8px_#d0bcff]" />
            <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-medium font-mono">
              100% Free &amp; Open Architecture • No Subscription • Zero Ads • Local-First
            </span>
          </div>

          {/* Headline - Genuine, grounded, unpretentious */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mb-6 leading-tight">
            Pure Sound. Open Architecture.{' '}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#d0bcff] via-[#fbabff] to-[#8fcdff] bg-clip-text text-transparent">
              Completely Free for Everyone.
            </span>
          </h1>

          {/* Genuine Subtitle */}
          <p className="text-base sm:text-lg text-[#cbc3d7] max-w-2xl font-light mb-10 leading-relaxed">
            A personal music space that unifies cloud track discovery, real-time WebRTC collaborative listening rooms, and sovereign local audio mounting. No paywalls, no tracking—engineered simply for people who love music.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-4 mb-16 z-10 w-full max-w-xl">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Link
                to={destination}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-[#a078ff] text-white text-sm font-semibold uppercase tracking-wider hover:brightness-110 transition-all duration-300 shadow-[0_0_35px_rgba(160,120,255,0.45)] hover:scale-[1.02]"
              >
                <span>{token ? 'Enter Riveria Studio' : 'Launch Riveria Web (Free)'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#experience"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#2a2a2b]/70 backdrop-blur-xl border border-[#d0bcff]/30 text-[#e5e2e3] text-sm uppercase tracking-wider hover:border-[#d0bcff] hover:text-[#d0bcff] transition-all duration-300 hover:bg-[#353436]/40"
              >
                <Play className="w-4 h-4 text-[#d0bcff]" />
                <span>Explore Interactive Demo</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-xs font-mono text-[#cbc3d7]">
              <span className="flex items-center gap-1.5 text-[#d0bcff]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Forever Free &amp; Open Source
              </span>
              <span className="text-[#494454]">•</span>
              <span>No Credit Card Required</span>
              <span className="text-[#494454]">•</span>
              <span>Instant In-Browser Audio Engine</span>
            </div>
          </div>

          {/* Hero Showcase Deck with violet/obsidian theme */}
          <div className="relative w-full max-w-5xl rounded-2xl p-2 bg-gradient-to-b from-[#d0bcff]/20 via-white/5 to-transparent backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] group border border-[#d0bcff]/20">
            <div className="relative w-full min-h-[400px] md:h-[500px] rounded-xl overflow-hidden bg-[#0e0e0f] flex flex-col justify-between p-6 sm:p-8">
              {/* Background Ambient Radial Gradient */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(208,188,255,0.15),transparent_60%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(160,120,255,0.12),transparent_60%)] pointer-events-none" />

              {/* Telemetry HUD Badges Floating On Display */}
              <div className="flex flex-wrap items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0e0e0f]/85 backdrop-blur-md border border-[#d0bcff]/30 text-[#d0bcff]">
                  <span className="w-2 h-2 rounded-full bg-[#d0bcff] animate-ping" />
                  <span className="text-xs font-mono tracking-widest uppercase">
                    FLAC / WAV / MP3 Direct Stream
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0e0e0f]/85 backdrop-blur-md border border-white/10 text-[#cbc3d7]">
                  <Radio className="w-3.5 h-3.5 text-[#d0bcff]" />
                  <span className="text-xs font-mono tracking-wider uppercase">
                    WebRTC Peer-to-Peer Sync
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0e0e0f]/85 backdrop-blur-md border border-[#d0bcff]/20 text-[#d0bcff]">
                  <HardDrive className="w-3.5 h-3.5 text-[#d0bcff]" />
                  <span className="text-xs font-mono tracking-wider uppercase">
                    Air-Gapped Local Storage
                  </span>
                </div>
              </div>

              {/* Hero Mid Visual: Sound Art with Rotating Motif */}
              <div className="my-auto py-8 flex flex-col sm:flex-row items-center justify-center gap-8 z-10">
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-[#d0bcff]/30 bg-gradient-to-tr from-violet-950 via-[#201f20] to-[#0e0e0f] flex items-center justify-center shadow-[0_0_30px_rgba(208,188,255,0.2)]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#d0bcff]/20 border border-[#d0bcff]/40 flex items-center justify-center">
                    <Disc className="w-6 h-6 text-[#d0bcff]" />
                  </div>
                </motion.div>

                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono text-[#d0bcff] uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Riveria Reverie Acoustic Engine</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {currentTrack.title}
                  </h2>
                  <p className="text-sm text-[#cbc3d7] mt-1">{currentTrack.artist}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#201f20] border border-white/10 text-xs font-mono text-[#d0bcff]">
                      {currentTrack.format}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#201f20] border border-white/10 text-xs font-mono text-[#cbc3d7]">
                      {currentTrack.source}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating HUD Equalizer Bottom Anchor */}
              <div className="p-4 md:p-6 rounded-xl bg-[#0e0e0f]/90 backdrop-blur-2xl border border-[#d0bcff]/20 flex flex-col md:flex-row items-center justify-between gap-4 z-10 shadow-2xl">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-[#a078ff] text-white flex items-center justify-center shadow-[0_0_20px_rgba(160,120,255,0.5)] hover:scale-105 transition-transform flex-shrink-0"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-white tracking-wide">
                      {currentTrack.title}
                    </span>
                    <span className="text-xs text-[#d0bcff] font-mono tracking-wider">
                      {currentTrack.mastering}
                    </span>
                  </div>
                </div>

                {/* Waveform Visualizer Simulation */}
                <div className="w-full md:w-72 flex items-end gap-1.5 h-8">
                  {eqHeights.map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: isPlaying ? `${h}%` : '20%' }}
                      transition={{ duration: 0.3 }}
                      className="flex-1 bg-gradient-to-t from-[#d0bcff]/40 to-[#a078ff] rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ARCHITECTURE METRICS STRIP */}
        <section className="w-full bg-[#1c1b1c]/80 backdrop-blur-xl border-y border-white/5 py-12">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono font-medium">
                  Cost &amp; Access
                </span>
                <span className="text-3xl lg:text-4xl text-[#d0bcff] font-bold">
                  $0 Free
                </span>
                <p className="text-xs text-[#cbc3d7] leading-relaxed">
                  100% free and open-source for personal listening. No paywalls, premium tiers, or commercial ad interruptions.
                </p>
              </div>

              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono font-medium">
                  Local Device Mount
                </span>
                <span className="text-3xl lg:text-4xl text-white font-bold">
                  0 Uploads
                </span>
                <p className="text-xs text-[#cbc3d7] leading-relaxed">
                  Mount gigabytes of local lossless audio directly in your browser using zero-copy in-memory Object URLs.
                </p>
              </div>

              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono font-medium">
                  Room Syncing
                </span>
                <span className="text-3xl lg:text-4xl text-white font-bold">
                  WebRTC
                </span>
                <p className="text-xs text-[#cbc3d7] leading-relaxed">
                  Direct peer-to-peer data channels keep playback state and playheads aligned without cloud relay lag.
                </p>
              </div>

              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono font-medium">
                  Streaming Engine
                </span>
                <span className="text-3xl lg:text-4xl text-[#a078ff] font-bold">
                  RFC 9110
                </span>
                <p className="text-xs text-[#cbc3d7] leading-relaxed">
                  Node.js HTTP Range requests with 206 Partial Content slicing for instant seeks and efficient buffer streaming.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CORE PILLARS / BENTO GRID */}
        <section
          className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 py-24 w-full"
          id="architecture"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div className="flex flex-col gap-1 max-w-xl">
              <span className="text-xs uppercase tracking-[0.22em] text-[#d0bcff] font-medium font-mono">
                Acoustic Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Honest Engineering. Zero Silos.
              </h2>
            </div>
            <p className="text-sm text-[#cbc3d7] max-w-md font-light leading-relaxed">
              We built Riveria to solve everyday problems with modern music apps: locked-down local files, laggy group listening, and ad-saturated feeds.
            </p>
          </div>

          {/* Bento Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Card 1: Lossless Hybrid Vault (Spans 7) */}
            <div
              id="hybrid-hub"
              className="md:col-span-7 rounded-2xl bg-[#201f20]/60 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#d0bcff]/40 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#d0bcff]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#d0bcff]/20 transition-all" />
              <div className="flex flex-col gap-3 mb-8 z-10">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2b] flex items-center justify-center text-[#d0bcff] border border-[#d0bcff]/20">
                  <HardDrive className="w-5 h-5" />
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d0bcff] font-mono">
                  Air-Gapped Local Audio Mount
                </span>
                <h3 className="text-2xl font-bold text-white">
                  The Lossless Hybrid Vault
                </h3>
                <p className="text-sm text-[#cbc3d7] font-light leading-relaxed max-w-lg">
                  Never upload your unreleased tracks or gigabytes of FLAC files to third-party databases. Riveria mounts your device's audio files directly in the browser via zero-copy object URLs, seamlessly blending your air-gapped disks and cloud collection into one fluid queue.
                </p>
              </div>

              <div className="w-full bg-[#0e0e0f]/80 rounded-xl p-4 border border-white/5 z-10 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[#cbc3d7] pb-1 border-b border-white/5">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d0bcff] shadow-[0_0_8px_#d0bcff]" />
                    Local Sync Hub: In-Memory Audio Mount
                  </span>
                  <span className="text-[#d0bcff] font-semibold">Active • 0 Bytes Sent</span>
                </div>
                <div className="flex items-center justify-between text-[#cbc3d7]">
                  <span>Catalog Fusion: Local Object URLs + Cloud Catalog</span>
                  <span className="text-[11px] text-[#fbabff] uppercase tracking-wider">
                    Instant Playback
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: WebRTC Spatial Mesh (Spans 5) */}
            <div className="md:col-span-5 rounded-2xl bg-[#201f20]/60 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#d0bcff]/40 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#d0bcff]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#d0bcff]/20 transition-all" />
              <div className="flex flex-col gap-3 mb-6 z-10">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2b] flex items-center justify-center text-[#d0bcff] border border-[#d0bcff]/20">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d0bcff] font-mono">
                  Real-Time Collective Listening
                </span>
                <h3 className="text-2xl font-bold text-white">
                  WebRTC Jam Mesh
                </h3>
                <p className="text-sm text-[#cbc3d7] font-light leading-relaxed">
                  Join a lightweight jam room with a 6-character room code. When you play, pause, or seek, the playhead coordinates travel directly over an encrypted WebRTC data channel mesh so everyone stays in sync.
                </p>
              </div>

              <div className="flex items-center justify-between z-10 pt-4 border-t border-white/5">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-violet-600 border-2 border-[#131314] flex items-center justify-center text-xs font-semibold text-white">
                    P1
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#353436] border-2 border-[#131314] flex items-center justify-center text-xs font-semibold text-[#fbabff]">
                    P2
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#a078ff] border-2 border-[#131314] flex items-center justify-center text-xs font-semibold text-white">
                    P3
                  </div>
                </div>
                <span className="text-xs font-mono text-[#d0bcff] uppercase tracking-wider">
                  Direct Peer DataChannels Open
                </span>
              </div>
            </div>

            {/* Card 3: Node.js Byte-Stream Pipeline (Spans 5) */}
            <div className="md:col-span-5 rounded-2xl bg-[#201f20]/60 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#d0bcff]/40 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col gap-3 mb-6 z-10">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2b] flex items-center justify-center text-[#d0bcff] border border-[#d0bcff]/20">
                  <Waves className="w-5 h-5" />
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d0bcff] font-mono">
                  RFC 9110 Byte-Range Slicing
                </span>
                <h3 className="text-2xl font-bold text-white">
                  Node Audio Pipeline
                </h3>
                <p className="text-sm text-[#cbc3d7] font-light leading-relaxed">
                  Fast, responsive seeking backed by standard HTTP 206 Partial Content range requests. Audio files stream in clean byte chunks directly from the disk pipeline with genuine binary signature checks.
                </p>
              </div>

              <div className="w-full z-10 flex items-center justify-between p-3 rounded-lg bg-[#0e0e0f]/60 border border-white/5 font-mono text-xs">
                <span className="text-[#cbc3d7]">Range: bytes=1048576-2097151</span>
                <span className="text-[#d0bcff] font-semibold">206 Partial Content</span>
              </div>
            </div>

            {/* Card 4: Obsidian Canvas UI (Spans 7) */}
            <div className="md:col-span-7 rounded-2xl bg-[#201f20]/60 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#d0bcff]/40 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col gap-3 mb-6 z-10">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2b] flex items-center justify-center text-[#d0bcff] border border-[#d0bcff]/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-[#d0bcff] font-mono">
                  Distraction-Free Experience
                </span>
                <h3 className="text-2xl font-bold text-white">
                  Obsidian Canvas Interface
                </h3>
                <p className="text-sm text-[#cbc3d7] font-light leading-relaxed max-w-lg">
                  Designed from the ground up for focused listening. Sleek obsidian dark mode with subtle lavender and ice blue accents, translucent glass panels, and zero sponsored banners or intrusive popups.
                </p>
              </div>

              {/* Inline SVG Acoustic Waveform */}
              <div className="w-full h-20 rounded-lg bg-[#0e0e0f]/80 border border-white/5 p-4 flex items-center justify-center">
                <svg
                  className="w-full h-full text-[#d0bcff]"
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 600 60"
                >
                  <path
                    d="M0,30 Q30,5 60,30 T120,30 T180,10 T240,45 T300,15 T360,50 T420,20 T480,40 T540,25 T600,30"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M0,30 Q45,50 90,30 T180,30 T270,10 T360,40 T450,20 T540,35 T600,30"
                    fill="none"
                    opacity="0.6"
                    stroke="#fbabff"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* 4. INTERACTIVE PLAYER PREVIEW SHOWCASE */}
        <section
          className="w-full py-24 bg-[#0e0e0f] relative border-y border-white/5"
          id="experience"
        >
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">
            <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col gap-2 items-center">
              <span className="text-xs uppercase tracking-[0.2em] text-[#d0bcff] font-mono font-medium">
                Interactive Telemetry Deck
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                The Obsidian Player Architecture
              </h2>
              <p className="text-sm text-[#cbc3d7] font-light max-w-xl">
                Experience Riveria's playback controls and real-time spectrum visualizer directly in your browser.
              </p>
            </div>

            {/* Player Deck Mockup */}
            <div className="max-w-4xl mx-auto rounded-3xl bg-[#201f20]/70 backdrop-blur-3xl border border-[#d0bcff]/20 p-6 md:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col gap-8">
              {/* Top Status Bar of Player */}
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#d0bcff] shadow-[0_0_10px_#d0bcff]" />
                  <span className="text-xs tracking-widest text-[#d0bcff] uppercase font-mono">
                    Stream Active • Monitored
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-[#d0bcff] px-2.5 py-1 rounded bg-[#353436]/40 border border-[#d0bcff]/20">
                    {currentTrack.format}
                  </span>
                  <span className="font-mono text-xs text-[#cbc3d7]">BUF: 0.12s</span>
                </div>
              </div>

              {/* Center Track & Dynamic Visualizer Display */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Album/Track Emblem & Metadata */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="w-48 h-48 mx-auto md:mx-0 rounded-2xl bg-[#2a2a2b] relative overflow-hidden border border-[#d0bcff]/20 group shadow-2xl flex items-center justify-center">
                    <div className="w-full h-full bg-gradient-to-tr from-violet-950 via-[#201f20] to-[#0e0e0f] flex items-center justify-center">
                      <Disc className="w-16 h-16 text-[#d0bcff]/80" />
                    </div>
                    <div className="absolute bottom-3 left-3 text-xs font-mono text-[#d0bcff] tracking-wider">
                      CHAMBER 01
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {currentTrack.title}
                    </h3>
                    <p className="text-sm text-[#d0bcff] font-medium">
                      {currentTrack.artist}
                    </p>
                    <p className="text-xs text-[#cbc3d7] uppercase tracking-widest mt-1 font-mono">
                      {currentTrack.mastering}
                    </p>
                  </div>
                </div>

                {/* Live Parametric Equalizer Spectrum Simulation */}
                <div className="md:col-span-7 flex flex-col gap-6">
                  <div className="flex justify-between items-center text-xs font-mono text-[#cbc3d7]">
                    <span>20 Hz</span>
                    <span>1 kHz</span>
                    <span>8 kHz</span>
                    <span>48 kHz</span>
                  </div>

                  {/* Dynamic Equalizer Bar Grid */}
                  <div className="h-32 w-full flex items-end gap-1.5 p-3 bg-[#0e0e0f] rounded-xl border border-white/5">
                    {eqHeights.map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: isPlaying ? `${h}%` : '20%' }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 bg-gradient-to-t from-[#a078ff]/30 to-[#d0bcff] rounded-t"
                      />
                    ))}
                  </div>

                  {/* Scrubber Track */}
                  <div className="flex flex-col gap-2">
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const newPct = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
                        setProgress(newPct);
                      }}
                      className="w-full bg-[#2a2a2b] h-1.5 rounded-full overflow-hidden cursor-pointer relative group"
                    >
                      <div
                        className="bg-gradient-to-r from-violet-600 to-[#a078ff] h-full relative"
                        style={{ width: `${progress}%` }}
                      >
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_#d0bcff] scale-0 group-hover:scale-100 transition-transform" />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-[#cbc3d7]">
                      <span>02:14</span>
                      <span className="text-[#d0bcff]">{currentTrack.duration}</span>
                    </div>
                  </div>

                  {/* Transport Control Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() =>
                          setActiveTrackIndex((prev) => (prev + 1) % demoTracks.length)
                        }
                        className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"
                        title="Shuffle source"
                      >
                        <Shuffle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setActiveTrackIndex((prev) =>
                            prev === 0 ? demoTracks.length - 1 : prev - 1
                          )
                        }
                        className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"
                        title="Previous"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-[#a078ff] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(160,120,255,0.45)]"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 fill-current" />
                        ) : (
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setActiveTrackIndex((prev) => (prev + 1) % demoTracks.length)
                        }
                        className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"
                        title="Next"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setProgress(0)}
                        className="text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"
                        title="Repeat"
                      >
                        <Repeat className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Gain Level Slider Mockup */}
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-[#d0bcff]" />
                      <input
                        className="w-24 accent-[#d0bcff] h-1 rounded-full cursor-pointer bg-[#353436]"
                        max="100"
                        min="0"
                        type="range"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                      />
                      <span className="font-mono text-xs text-[#d0bcff]">
                        {volume}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. GENUINE PERSPECTIVES / WHAT RIVERIA SOLVES */}
        <section className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 py-24 w-full">
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-xs uppercase tracking-[0.22em] text-[#d0bcff] font-mono mb-2">
              The Reverie Vision
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              A Personal Sanctuary for Your Sound
            </h2>
            <p className="text-sm text-[#cbc3d7] max-w-xl mt-3 font-light">
              We aren't trying to displace multi-billion dollar giants. We built Riveria because we wanted a clean, honest player that values ownership and real-time community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#201f20]/40 backdrop-blur-xl border border-white/5 flex flex-col justify-between hover:border-[#d0bcff]/30 transition-all duration-300">
              <div className="flex flex-col gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2b] flex items-center justify-center text-[#d0bcff]">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Local Files Belong to You
                </h3>
                <p className="text-xs text-[#cbc3d7] font-light leading-relaxed">
                  "Most streaming apps make playing local files feel like an afterthought or force you to upload everything to their servers. Riveria mounts my lossless FLAC folders instantly without uploading a single byte."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5 text-xs text-[#d0bcff] font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero-Upload Local Sync</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#201f20]/40 backdrop-blur-xl border border-white/5 flex flex-col justify-between hover:border-[#d0bcff]/30 transition-all duration-300">
              <div className="flex flex-col gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2b] flex items-center justify-center text-[#d0bcff]">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Shared Jams Without Lag
                </h3>
                <p className="text-xs text-[#cbc3d7] font-light leading-relaxed">
                  "Listening together across Discord or third-party bots always came with jitter and crushed bitrates. WebRTC peer data channels keep our playback state locked without relay lag."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5 text-xs text-[#d0bcff] font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Sub-frame WebRTC Jams</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#201f20]/40 backdrop-blur-xl border border-white/5 flex flex-col justify-between hover:border-[#d0bcff]/30 transition-all duration-300">
              <div className="flex flex-col gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2b] flex items-center justify-center text-[#d0bcff]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  No Ads, No Algorithm Clutter
                </h3>
                <p className="text-xs text-[#cbc3d7] font-light leading-relaxed">
                  "Mainstream platforms feel like spreadsheets of sponsored album art. Riveria returns to the meaning of reverie: a quiet, beautiful space to get lost in music you actually care about."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5 text-xs text-[#d0bcff] font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Open Source Sanctuary</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. CONVERSION / OPEN SOURCE VAULT */}
        <section
          id="open-source"
          className="w-full relative py-24 bg-gradient-to-b from-[#0e0e0f] via-[#1c1b1c] to-[#0e0e0f] border-t border-white/5"
        >
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 flex flex-col items-center">
            <div className="w-full max-w-3xl rounded-3xl bg-[#201f20]/60 backdrop-blur-3xl border border-[#d0bcff]/30 p-8 md:p-14 text-center relative overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#a078ff]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a2a2b]/80 border border-[#d0bcff]/30 text-[#d0bcff] mb-6 font-mono text-xs uppercase tracking-widest">
                <Lock className="w-3.5 h-3.5" />
                <span>100% Free Forever • Sovereign Acoustic Web</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Free For Everyone. Forever.
              </h2>
              <p className="text-sm text-[#cbc3d7] max-w-xl mx-auto font-light mb-8 leading-relaxed">
                Music is meant to be enjoyed, shared, and collected without paywalls or invasive tracking. Launch Riveria in your browser or inspect the entire stack on GitHub.
              </p>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 max-w-2xl mx-auto">
                <div className="p-3 rounded-xl bg-[#0e0e0f]/80 border border-white/5 flex flex-col items-center text-center gap-1">
                  <Sparkles className="w-5 h-5 text-[#d0bcff]" />
                  <span className="text-xs text-white font-semibold uppercase tracking-wider font-mono">
                    Always Free
                  </span>
                  <span className="text-[11px] text-[#cbc3d7]">No subscription fees</span>
                </div>

                <div className="p-3 rounded-xl bg-[#0e0e0f]/80 border border-white/5 flex flex-col items-center text-center gap-1">
                  <ShieldCheck className="w-5 h-5 text-[#d0bcff]" />
                  <span className="text-xs text-white font-semibold uppercase tracking-wider font-mono">
                    Zero Ads
                  </span>
                  <span className="text-[11px] text-[#cbc3d7]">No interruptions</span>
                </div>

                <div className="p-3 rounded-xl bg-[#0e0e0f]/80 border border-white/5 flex flex-col items-center text-center gap-1">
                  <Terminal className="w-5 h-5 text-[#d0bcff]" />
                  <span className="text-xs text-white font-semibold uppercase tracking-wider font-mono">
                    Open Source
                  </span>
                  <span className="text-[11px] text-[#cbc3d7]">Audit on GitHub</span>
                </div>

                <div className="p-3 rounded-xl bg-[#0e0e0f]/80 border border-white/5 flex flex-col items-center text-center gap-1">
                  <HardDrive className="w-5 h-5 text-[#d0bcff]" />
                  <span className="text-xs text-white font-semibold uppercase tracking-wider font-mono">
                    Local First
                  </span>
                  <span className="text-[11px] text-[#cbc3d7]">Your disk, your data</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto mb-8">
                <Link
                  to={destination}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-[#a078ff] text-white text-xs font-semibold uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_24px_rgba(160,120,255,0.4)]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{token ? 'Enter Studio Studio' : 'Launch In Browser (Free)'}</span>
                </Link>
                <a
                  href="https://github.com/Parth-Chavan-15/Riveria"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#0e0e0f]/90 border border-[#d0bcff]/30 text-[#e5e2e3] text-xs uppercase tracking-wider hover:border-[#d0bcff] hover:text-[#d0bcff] transition-all duration-300"
                >
                  <Terminal className="w-4 h-4 text-[#d0bcff]" />
                  <span>GitHub Repository</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#cbc3d7] font-mono">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d0bcff]" /> Node.js Range Stream
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d0bcff]" /> WebRTC DataChannel Mesh
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d0bcff]" /> In-Memory Object URLs
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#0e0e0f] py-16 border-t border-white/5">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d0bcff] to-[#8fcdff] flex items-center justify-center">
                  <Disc className="w-4 h-4 text-black" />
                </div>
                <span className="text-lg font-bold tracking-widest text-[#d0bcff] uppercase">
                  Riveria
                </span>
              </div>
              <p className="text-xs text-[#cbc3d7] max-w-sm leading-relaxed">
                A hybrid music library and real-time playback prototype built for personal listening and synchronized jam rooms.
              </p>
            </div>

            <div className="md:col-span-5 flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#d0bcff] font-mono font-medium">
                Technical Specifications
              </span>
              <div className="flex flex-col gap-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-[#cbc3d7]">Streaming Protocol</span>
                  <span className="text-[#d0bcff]">RFC 9110 HTTP Range (206)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-[#cbc3d7]">Jam Signaling</span>
                  <span className="text-[#d0bcff]">WebRTC DataChannel + Socket.IO</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#cbc3d7]">Local Storage Mount</span>
                  <span className="text-[#d0bcff]">Zero-Copy In-Memory Object URLs</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col gap-2 md:items-end">
              <span className="text-xs uppercase tracking-[0.18em] text-[#d0bcff] font-mono font-medium">
                Repository
              </span>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/Parth-Chavan-15/Riveria"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#cbc3d7] hover:text-[#d0bcff] transition-colors flex items-center gap-1.5 font-mono"
                >
                  <span>Parth-Chavan-15/Riveria</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#cbc3d7]">
            <p>© 2026 Riveria Music Engine. Built with open-source love for music enthusiasts.</p>
            <div className="flex items-center gap-6 font-mono text-[11px]">
              <span className="text-[#d0bcff]">Docker Ready</span>
              <span>•</span>
              <span className="text-[#d0bcff]">Vite 8 + React 19</span>
              <span>•</span>
              <span className="text-[#d0bcff]">Tailwind CSS 4</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
