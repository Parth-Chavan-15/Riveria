import { usePlayer } from "../hooks/usePlayer";

function BottomPlayer() {
  const { currentTrack, isPlaying, togglePlay, position, duration, seek, error } = usePlayer();

  if (!currentTrack) return null;

  return (
    <footer className="hidden md:flex fixed bottom-4 left-4 right-4 h-24 glass-panel rounded-xl shadow-2xl items-center justify-between px-8 z-50">
      <div className="flex items-center gap-4 w-1/3">
        <div className={`w-14 h-14 rounded-lg overflow-hidden border border-glass-border ${currentTrack.imageColor}`}>
           {currentTrack.imageSrc && <img src={currentTrack.imageSrc} alt="" className="w-full h-full object-cover" />}
        </div>
        <div>
          <div className="text-white font-bold">{currentTrack.title}</div>
          <div className="text-slate-400 text-sm mt-0.5">{currentTrack.artist}</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 w-1/3 text-slate-400">
        <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(208,188,255,0.3)]">
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>
        <input aria-label="Playback position" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(position, duration || 0)} onChange={(event) => seek(Number(event.target.value))} className="w-24 accent-violet-300" />
      </div>

      <div className="flex items-center justify-end gap-4 w-1/3 text-slate-400">
        <button className="hover:text-primary transition-colors"><span className="material-symbols-outlined text-xl">volume_up</span></button>
        <span className="text-xs">{Math.floor(position / 60)}:{String(Math.floor(position % 60)).padStart(2, '0')}</span>
      </div>
      {error && <p className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-red-500/80 px-3 py-1 text-xs text-white">{error}</p>}
    </footer>
  );
}

export default BottomPlayer;
