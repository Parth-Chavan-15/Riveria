import { usePlayer } from "../hooks/usePlayer";
import { useAuth } from "../hooks/useAuth";

function TrackCard({ trackData, queue, onDelete }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const { _id, title, artist, duration, type, imageColor, imageSrc, localUrl } = trackData;
  const isAdmin = user?.role === 'admin';
  const isServerTrack = !localUrl && _id;

  const isThisTrackPlaying = currentTrack?._id === _id && isPlaying;

  const handlePlayClick = () => {
    if (currentTrack?._id === _id) {
      togglePlay();
    } else {
      playTrack(trackData, queue);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Remove "${title}" from the library?`)) {
      onDelete(_id);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-pointer"
    >
      
      {/* Conditionally render the image. If missing, the imageColor gradient background shows natively! */}
      <div className={`aspect-square w-full rounded-lg ${imageColor || 'bg-gradient-to-br from-purple-600 to-indigo-900'} mb-4 relative overflow-hidden shadow-inner flex items-center justify-center`}>
        <span className="material-symbols-outlined text-4xl text-white/20 absolute">music_note</span>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : null}

        {/* Admin Delete Action */}
        {isAdmin && isServerTrack && (
          <button
            onClick={handleDeleteClick}
            title="Delete track (Admin)"
            className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
          >
            <span className="material-symbols-outlined text-sm block">delete</span>
          </button>
        )}

        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isThisTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button aria-label={`${isThisTrackPlaying ? 'Pause' : 'Play'} ${title}`}
            onClick={handlePlayClick}
            className="w-12 h-12 rounded-full bg-violet-500/80 backdrop-blur-md flex items-center justify-center text-white transform scale-90 group-hover:scale-100 transition-all shadow-[0_0_20px_rgba(139,92,246,0.6)]"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isThisTrackPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-wider text-white uppercase">
          {type}
        </div>
      </div>

      <h3 className={`text-lg font-bold truncate ${isThisTrackPlaying ? 'text-primary' : 'text-white'}`}>{title}</h3>
      <div className="flex justify-between items-center mt-1">
        <p className="text-sm text-slate-400 truncate">{artist}</p>
        <p className="text-xs text-slate-500 font-medium">{duration}</p>
      </div>
      
      {isThisTrackPlaying && (
        <div className="mt-3 text-xs font-semibold text-violet-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
          Now Playing
        </div>
      )}
    </div>
  );
}

export default TrackCard;
