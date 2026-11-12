import { usePlayer } from "../hooks/usePlayer";

function BottomPlayer() {
  const { currentTrack, isPlaying, togglePlay, position, duration, seek, error } = usePlayer();

  if (!currentTrack) return null;

  return (
    <footer className="flex fixed bottom-4 left-4 right-4 h-20 md:h-24 glass-panel rounded-xl shadow-2xl items-center justify-between px-4 md:px-8 z-50 border border-white/10 backdrop-blur-xl bg-black/80">
      <div className="flex items-center gap-3 md:gap-4 w-1/2 md:w-1/3 min-w-0">
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden border border-glass-border ${currentTrack.imageColor || 'bg-gradient-to-br from-purple-600 to-indigo-900'} relative flex items-center justify-center flex-shrink-0`}>
           {currentTrack.imageSrc ? (
             <img
               src={currentTrack.imageSrc}
               alt={currentTrack.title}
               className="w-full h-full object-cover"
               onError={(e) => { e.currentTarget.style.display = 'none'; }}
             />
           ) : null}
           <span className="material-symbols-outlined text-xl text-white/30 absolute">music_note</span>
        </div>
        <div className="min-w-0">
          <div className="text-white font-bold truncate text-sm md:text-base">{currentTrack.title}</div>
          <div className="text-slate-400 text-xs md:text-sm mt-0.5 truncate">{currentTrack.artist}</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 md:gap-4 w-auto md:w-1/3 text-slate-400">
        <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(208,188,255,0.3)]">
          <span className="material-symbols-outlined text-2xl md:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>
        <input aria-label="Playback position" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(position, duration || 0)} onChange={(event) => seek(Number(event.target.value))} className="hidden sm:block w-20 md:w-32 accent-violet-300 cursor-pointer" />
      </div>

      <div className="hidden sm:flex items-center justify-end gap-4 w-1/3 text-slate-400">
        <button className="hover:text-primary transition-colors"><span className="material-symbols-outlined text-xl">volume_up</span></button>
        <span className="text-xs font-mono">{Math.floor(position / 60)}:{String(Math.floor(position % 60)).padStart(2, '0')}</span>
      </div>
      {error && <p className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-red-500/80 px-3 py-1 text-xs text-white">{error}</p>}
    </footer>
  );
}

export default BottomPlayer;
