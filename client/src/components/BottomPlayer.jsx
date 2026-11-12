import { usePlayer } from '../hooks/usePlayer';

function formatTime(seconds) {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function BottomPlayer() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    position,
    duration,
    seek,
    playNext,
    playPrevious,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    error
  } = usePlayer();

  if (!currentTrack) return null;

  const effectiveDuration = duration > 0 ? duration : (currentTrack.durationSeconds || 180);
  const progressPercent = effectiveDuration > 0 ? (position / effectiveDuration) * 100 : 0;

  return (
    <footer
      aria-label="Audio Playback Console"
      className="fixed bottom-3 left-3 right-3 md:bottom-4 md:left-6 md:right-6 h-22 md:h-24 glass-panel rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center justify-between px-4 md:px-8 z-50 border border-white/10 backdrop-blur-2xl bg-[#09090c]/90 transition-all duration-300"
    >
      {/* 1. LEFT SECTION: Track Metadata & Artwork */}
      <div className="flex items-center gap-3 md:gap-4 w-1/4 min-w-[140px] max-w-[280px]">
        <div
          className={`w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border border-white/10 ${
            currentTrack.imageColor || 'bg-gradient-to-br from-violet-600 to-indigo-950'
          } relative flex items-center justify-center flex-shrink-0 shadow-lg group`}
        >
          {currentTrack.imageSrc ? (
            <img
              src={currentTrack.imageSrc}
              alt={currentTrack.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <span className="material-symbols-outlined text-xl text-white/30 absolute">music_note</span>
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="flex gap-0.5 items-end h-4">
                <span className="w-0.5 bg-primary h-full animate-[pulse_0.8s_ease-in-out_infinite]"></span>
                <span className="w-0.5 bg-primary h-2/3 animate-[pulse_0.6s_ease-in-out_infinite]"></span>
                <span className="w-0.5 bg-primary h-4/5 animate-[pulse_1s_ease-in-out_infinite]"></span>
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-white font-bold truncate text-sm md:text-base tracking-tight flex items-center gap-2">
            <span className="truncate">{currentTrack.title}</span>
            <span className="hidden xl:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-white/10 text-primary border border-white/10">
              {currentTrack.type === 'Local' ? 'P2P Device' : 'RFC 9110 Stream'}
            </span>
          </div>
          <div className="text-slate-400 text-xs md:text-sm mt-0.5 truncate flex items-center gap-1.5">
            <span className="truncate">{currentTrack.artist || 'Riveria Haven'}</span>
          </div>
        </div>
      </div>

      {/* 2. CENTER SECTION: Transport Controls & Full-Width Scrubber */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-xl px-2 md:px-6">
        {/* Buttons Row */}
        <div className="flex items-center gap-3 md:gap-6 mb-1.5 text-slate-300">
          {/* Shuffle Button */}
          <button
            onClick={toggleShuffle}
            title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
            className={`p-1.5 rounded-full transition-colors ${
              isShuffle ? 'text-primary bg-primary/20 shadow-[0_0_10px_rgba(208,188,255,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-lg md:text-xl block">shuffle</span>
          </button>

          {/* Previous Track */}
          <button
            onClick={playPrevious}
            title="Previous Track (or restart)"
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/5 transition-all hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl md:text-3xl block">skip_previous</span>
          </button>

          {/* Primary Play / Pause Button */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause Track' : 'Play Track'}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-primary via-purple-300 to-secondary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(208,188,255,0.45)]"
          >
            <span className="material-symbols-outlined text-2xl md:text-3xl block" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          {/* Next Track */}
          <button
            onClick={playNext}
            title="Next Track"
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/5 transition-all hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl md:text-3xl block">skip_next</span>
          </button>

          {/* Repeat Button */}
          <button
            onClick={toggleRepeat}
            title={repeatMode === 'off' ? 'Enable Repeat All' : repeatMode === 'all' ? 'Enable Repeat One' : 'Disable Repeat'}
            className={`p-1.5 rounded-full transition-colors relative ${
              repeatMode !== 'off' ? 'text-primary bg-primary/20 shadow-[0_0_10px_rgba(208,188,255,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-lg md:text-xl block">
              {repeatMode === 'one' ? 'repeat_one' : 'repeat'}
            </span>
          </button>
        </div>

        {/* Scrubber Row */}
        <div className="w-full flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="w-9 text-right select-none">{formatTime(position)}</span>
          <div className="relative flex-1 flex items-center group cursor-pointer py-1">
            <input
              type="range"
              aria-label="Scrub track position"
              min="0"
              max={effectiveDuration}
              step="0.1"
              value={Math.min(position, effectiveDuration)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer outline-none accent-primary transition-all group-hover:h-2"
              style={{
                background: `linear-gradient(to right, rgb(208, 188, 255) ${progressPercent}%, rgba(255, 255, 255, 0.1) ${progressPercent}%)`
              }}
            />
          </div>
          <span className="w-9 text-left select-none">{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* 3. RIGHT SECTION: Volume & Fidelity Controls */}
      <div className="hidden sm:flex items-center justify-end gap-3 md:gap-4 w-1/4 min-w-[140px] max-w-[280px] text-slate-400">
        {/* Quality Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Lossless FLAC</span>
        </div>

        {/* Volume Slider & Mute Toggle */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="p-1.5 rounded-full hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              {isMuted || volume === 0 ? 'volume_off' : volume < 50 ? 'volume_down' : 'volume_up'}
            </span>
          </button>

          <div className="w-16 md:w-24 flex items-center">
            <input
              type="range"
              aria-label="Volume level"
              min="0"
              max="100"
              step="1"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary"
              style={{
                background: `linear-gradient(to right, rgb(208, 188, 255) ${isMuted ? 0 : volume}%, rgba(255, 255, 255, 0.2) ${isMuted ? 0 : volume}%)`
              }}
            />
          </div>
          <span className="w-7 text-[10px] font-mono text-slate-400 select-none text-right">
            {isMuted ? '0%' : `${Math.round(volume)}%`}
          </span>
        </div>
      </div>

      {/* Floating Error Alert */}
      {error && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-red-500/90 text-white text-xs font-semibold shadow-xl border border-red-400/40 backdrop-blur-md animate-fade-in">
          {error}
        </div>
      )}
    </footer>
  );
}
