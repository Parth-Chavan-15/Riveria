import { useRef, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useNavigate } from 'react-router-dom';

const formatBytes = (size) => {
  if (!size) return '0 MB';
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export default function LocalSyncHub() {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [feedback, setFeedback] = useState('');
  const { localTracks, mountLocalFiles, removeLocalTrack, playTrack, currentTrack, isPlaying } = usePlayer();
  const navigate = useNavigate();

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const count = mountLocalFiles(files);
    if (count > 0) {
      setFeedback(`Successfully mounted ${count} local track${count === 1 ? '' : 's'} in device memory.`);
    } else {
      setFeedback('No valid audio files detected. Please select MP3, WAV, FLAC, AAC, or OGG.');
    }
    setTimeout(() => setFeedback(''), 4500);
  };

  const handleUnmount = (trackId, trackTitle) => {
    removeLocalTrack(trackId);
    setFeedback(`"${trackTitle}" unmounted from this device session.`);
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleUnmountAll = () => {
    localTracks.forEach((t) => removeLocalTrack(t._id));
    setFeedback('All local tracks unmounted from device memory.');
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <main className="flex-1 md:ml-80 p-5 pb-36 pt-24 md:p-10 md:pt-28 text-white max-w-5xl">
      {/* 1. MOUNT BOX */}
      <section
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`glass-panel rounded-2xl p-6 md:p-10 border transition-all duration-300 relative overflow-hidden ${
          dragActive
            ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(208,188,255,0.25)]'
            : 'border-white/10'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">lock</span>
            Private In-Memory Library
          </p>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-emerald-400">
            Zero Server Upload
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Local Sync Hub</h2>
        <p className="mt-2 max-w-2xl text-slate-300 text-sm leading-relaxed">
          Mount audio files directly from this phone or computer into Riveria’s memory sandbox.
          Playback uses local memory blobs—your files are <strong>never uploaded, never saved, and never logged</strong> to any server.
        </p>

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac,.webm"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-3 font-bold text-black shadow-[0_0_20px_rgba(208,188,255,0.35)] transition-all hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">upload_file</span>
            <span>Mount audio files</span>
          </button>

          {localTracks.length > 0 && (
            <button
              onClick={handleUnmountAll}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-base">delete_sweep</span>
              <span>Unmount All ({localTracks.length})</span>
            </button>
          )}

          <span className="text-xs text-slate-400">
            or drag & drop audio files here
          </span>
        </div>

        {/* Dynamic Status / Feedback */}
        <div className="mt-4 min-h-[24px]">
          {feedback ? (
            <p className="text-xs font-semibold text-secondary animate-fade-in flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {feedback}
            </p>
          ) : (
            <p className="text-xs text-slate-400 font-mono">
              {localTracks.length === 0
                ? 'No local tracks mounted in this browser session.'
                : `${localTracks.length} local track${localTracks.length === 1 ? '' : 's'} mounted and ready for instant playback or P2P WebRTC sharing.`}
            </p>
          )}
        </div>
      </section>

      {/* 2. MOUNTED TRACKS LIST */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">Mounted Tracks</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono text-primary font-bold">
              {localTracks.length}
            </span>
          </div>

          {localTracks.length > 0 && (
            <button
              onClick={() => navigate('/session')}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">settings_input_antenna</span>
              <span>Open in WebRTC Jam Session &rarr;</span>
            </button>
          )}
        </div>

        <div className="grid gap-3">
          {localTracks.map((track) => {
            const isThisPlaying = currentTrack?._id === track._id && isPlaying;

            return (
              <article
                key={track._id}
                className="glass-panel flex items-center gap-3.5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all bg-[#09090c]/70 hover:bg-white/[0.04]"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-950 flex items-center justify-center flex-shrink-0 border border-white/10">
                  <span className="material-symbols-outlined text-primary text-xl">folder_music</span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-sm text-white flex items-center gap-2">
                    <span className="truncate">{track.title}</span>
                    {isThisPlaying && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-primary/20 text-primary border border-primary/30">
                        Playing
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {formatBytes(track.fileSize)} &bull; Device Memory Blob
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playTrack(track, localTracks)}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isThisPlaying
                        ? 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(208,188,255,0.4)]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {isThisPlaying ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{isThisPlaying ? 'Playing' : 'Play'}</span>
                  </button>

                  <button
                    onClick={() => handleUnmount(track._id, track.title)}
                    aria-label={`Unmount ${track.title}`}
                    title="Unmount from device"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg block">close</span>
                  </button>
                </div>
              </article>
            );
          })}

          {localTracks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">audio_file</span>
              <p className="text-sm font-medium text-slate-300">No local tracks mounted in this browser session.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Mount your high-res FLAC, MP3, or WAV audio files to stream them in your private session or sync with friends over WebRTC.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
