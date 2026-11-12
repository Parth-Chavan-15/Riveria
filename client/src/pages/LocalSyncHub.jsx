import { useRef, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';

const formatBytes = (size) => `${(size / 1024 / 1024).toFixed(1)} MB`;

export default function LocalSyncHub() {
  const inputRef = useRef(null);
  const [message, setMessage] = useState('Choose audio files from this device. Files never leave your browser.');
  const { localTracks, mountLocalFiles, removeLocalTrack, playTrack, currentTrack } = usePlayer();
  const mount = (files) => {
    const count = mountLocalFiles(files);
    setMessage(count ? `${count} local track${count === 1 ? '' : 's'} mounted and ready to play.` : 'Select MP3, WAV, OGG, AAC, M4A, or WebM audio files.');
  };
  return <main className="flex-1 md:ml-80 p-5 pb-32 pt-24 md:p-10 md:pt-28 text-white">
    <section className="glass-panel mx-auto max-w-4xl rounded-2xl p-6 md:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Private device library</p>
      <h2 className="mt-2 text-3xl font-bold">Local Sync Hub</h2>
      <p className="mt-3 max-w-2xl text-slate-400">Mount local audio into the Riveria player. Playback uses browser object URLs, so your files stay on this device while appearing beside cloud tracks.</p>
      <input ref={inputRef} className="hidden" type="file" accept="audio/*" multiple onChange={(event) => mount(event.target.files)} />
      <button onClick={() => inputRef.current?.click()} className="mt-6 rounded-xl bg-primary px-5 py-3 font-bold text-black transition hover:scale-[1.02]">Mount audio files</button>
      <p aria-live="polite" className="mt-4 text-sm text-secondary">{message}</p>
    </section>
    <section className="mx-auto mt-8 max-w-4xl">
      <h3 className="mb-4 text-xl font-bold">Mounted tracks ({localTracks.length})</h3>
      <div className="grid gap-3">
        {localTracks.map((track) => <article key={track._id} className="glass-panel flex items-center gap-3 rounded-xl p-4">
          <span className="material-symbols-outlined text-primary">folder_music</span>
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{track.title}</p><p className="text-sm text-slate-400">{formatBytes(track.fileSize)}</p></div>
          <button onClick={() => playTrack(track)} className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">{currentTrack?._id === track._id ? 'Playing' : 'Play'}</button>
          <button onClick={() => removeLocalTrack(track._id)} aria-label={`Unmount ${track.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-300"><span className="material-symbols-outlined">close</span></button>
        </article>)}
        {!localTracks.length && <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-slate-500">No local audio mounted yet.</p>}
      </div>
    </section>
  </main>;
}
