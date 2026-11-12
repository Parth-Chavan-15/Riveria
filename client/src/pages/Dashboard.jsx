import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import TrackCard from '../components/TrackCard';
import { apiRequest, getAccessToken } from '../services/api';
import { usePlayer } from '../hooks/usePlayer';

export default function Dashboard() {
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { localTracks } = usePlayer();

  useEffect(() => {
    let active = true;
    apiRequest('/tracks').then((data) => active && setTracks(data)).catch((requestError) => active && setError(requestError.message)).finally(() => active && setLoading(false));
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { path: '/socket.io', auth: { token: getAccessToken() } });
    socket.on('track:created', ({ track }) => setTracks((items) => [track, ...items.filter((item) => item._id !== track._id)]));
    socket.on('track:updated', ({ track }) => setTracks((items) => items.map((item) => item._id === track._id ? track : item)));
    socket.on('track:deleted', ({ track }) => setTracks((items) => items.filter((item) => item._id !== track._id)));
    return () => { active = false; socket.disconnect(); };
  }, []);

  const filteredTracks = useMemo(() => [...localTracks, ...tracks].filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(searchTerm.toLowerCase())), [tracks, localTracks, searchTerm]);
  return <main className="flex-1 overflow-y-auto px-5 pb-32 pt-24 md:ml-64 md:px-10 md:pt-28">
    <section><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Your library</p><h2 className="text-3xl font-bold text-white">Quick Play</h2></div><label className="relative"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span><input aria-label="Filter tracks" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Filter tracks..." className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-white outline-none focus:border-primary sm:w-64" /></label></div>
      {error && <p className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {loading ? <p className="text-slate-400">Loading tracks…</p> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{filteredTracks.map((track) => <TrackCard key={track._id} trackData={track} />)}{!filteredTracks.length && <p className="col-span-full text-slate-400">No tracks found.</p>}</div>}
    </section>
  </main>;
}
