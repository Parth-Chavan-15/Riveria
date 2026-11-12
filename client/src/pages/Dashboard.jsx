import { useEffect, useMemo, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import TrackCard from '../components/TrackCard';
import { apiRequest, getAccessToken } from '../services/api';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';

const GRADIENT_PRESETS = [
  { name: 'Violet Reverie', value: 'bg-gradient-to-br from-purple-600 via-violet-700 to-indigo-950' },
  { name: 'Cyan Echo', value: 'bg-gradient-to-br from-cyan-600 via-blue-700 to-slate-950' },
  { name: 'Rose Drift', value: 'bg-gradient-to-br from-rose-600 via-pink-700 to-purple-950' },
  { name: 'Emerald Wave', value: 'bg-gradient-to-br from-emerald-600 via-teal-700 to-zinc-950' },
  { name: 'Amber Solitude', value: 'bg-gradient-to-br from-amber-600 via-orange-700 to-zinc-950' },
];

export default function Dashboard() {
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const { localTracks } = usePlayer();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admin Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadDuration, setUploadDuration] = useState('');
  const [uploadColor, setUploadColor] = useState(GRADIENT_PRESETS[0].value);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiRequest('/tracks')
      .then((data) => active && setTracks(data))
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));

    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const targetUrl = socketUrl || (isLocal ? window.location.origin : null);

    let socket = null;
    if (targetUrl) {
      socket = io(targetUrl, {
        path: '/socket.io',
        auth: { token: getAccessToken() },
        reconnectionAttempts: 2,
        timeout: 3000
      });

      socket.on('track:created', ({ track }) => {
        setTracks((items) => [track, ...items.filter((item) => item._id !== track._id)]);
      });

      socket.on('track:updated', ({ track }) => {
        setTracks((items) => items.map((item) => (item._id === track._id ? track : item)));
      });

      socket.on('track:deleted', ({ track }) => {
        setTracks((items) => items.filter((item) => item._id !== (track?._id || track)));
      });
    }

    return () => {
      active = false;
      if (socket) socket.disconnect();
    };
  }, []);

  // Format seconds to MM:SS
  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '03:30';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle audio file selection and inspect duration
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError('');

    // Pre-populate title from clean filename
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!uploadTitle) {
      setUploadTitle(cleanName);
    }
    if (!uploadArtist && user?.email) {
      setUploadArtist(user.email.split('@')[0]);
    }

    // Try reading duration from audio element
    try {
      const tempAudio = new Audio(URL.createObjectURL(file));
      tempAudio.addEventListener('loadedmetadata', () => {
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          setUploadDuration(formatSeconds(tempAudio.duration));
        }
      });
    } catch {}
  };

  // Submit Cloud Track Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select an audio file to upload.');
      return;
    }
    if (!uploadTitle.trim() || !uploadArtist.trim()) {
      setUploadError('Please provide both a track title and artist name.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('audio', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('artist', uploadArtist.trim());
      if (uploadDuration.trim()) {
        formData.append('duration', uploadDuration.trim());
      }
      if (uploadColor) {
        formData.append('imageColor', uploadColor);
      }

      const response = await apiRequest('/tracks/upload', {
        method: 'POST',
        body: formData,
      });

      if (response?.track) {
        setTracks((prev) => [response.track, ...prev.filter((t) => t._id !== response.track._id)]);
      }

      setSuccessMsg(`"${uploadTitle}" uploaded successfully to the cloud.`);
      setTimeout(() => setSuccessMsg(''), 5000);

      // Reset form & close modal
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadArtist('');
      setUploadDuration('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.message || 'Failed to upload audio track.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Track Handler (Admin)
  const handleDeleteTrack = async (trackId) => {
    try {
      await apiRequest(`/tracks/${trackId}`, { method: 'DELETE' });
      setTracks((prev) => prev.filter((t) => t._id !== trackId));
      setSuccessMsg('Track deleted from cloud library.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete track.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const filteredTracks = useMemo(
    () =>
      [...localTracks, ...tracks].filter((track) =>
        `${track.title} ${track.artist}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [tracks, localTracks, searchTerm]
  );

  return (
    <main className="flex-1 overflow-y-auto px-5 pb-32 pt-24 md:ml-80 md:px-10 md:pt-28">
      <section>
        {/* Top Header & Actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Your library
              </p>
              {isAdmin && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/40">
                  Admin Active
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Quick Play</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Filter */}
            <label className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                aria-label="Filter tracks"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Filter tracks..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-primary sm:w-60"
              />
            </label>

            {/* Admin Upload Trigger */}
            {isAdmin && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">cloud_upload</span>
                <span>Upload Track</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <p className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {successMsg && (
          <p className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {successMsg}
          </p>
        )}

        {/* Tracks Grid */}
        {loading ? (
          <p className="text-slate-400">Loading tracks…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {filteredTracks.map((track) => (
              <TrackCard
                key={track._id || track.localUrl}
                trackData={track}
                queue={filteredTracks}
                onDelete={handleDeleteTrack}
              />
            ))}
            {!filteredTracks.length && (
              <div className="col-span-full py-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-600 block mb-2">
                  music_off
                </span>
                <p>No tracks found.</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 text-xs text-primary underline hover:text-white"
                  >
                    Upload your first cloud audio track
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ADMIN CLOUD AUDIO UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 p-6 md:p-8 shadow-2xl relative animate-fade-in-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-black shadow-[0_0_15px_rgba(208,188,255,0.4)]">
                  <span className="material-symbols-outlined text-xl">cloud_upload</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Upload Cloud Track</h3>
                  <p className="text-xs text-slate-400">RFC 9110 Byte-Stream Pipeline • Admin RBAC</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
                {uploadError}
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Selector Dropzone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Audio File (.mp3, .wav, .flac, .ogg, .aac, .webm)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg,.aac,.m4a,.webm"
                  onChange={handleFileChange}
                  required
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary file:text-black hover:file:bg-primary/90 cursor-pointer bg-white/5 border border-white/10 rounded-xl p-2"
                />
                {uploadFile && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-mono">
                    Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Title & Artist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Track Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solaris Echoes"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Artist / Producer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kroma & The Field"
                    value={uploadArtist}
                    onChange={(e) => setUploadArtist(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Duration & Visual Gradient Preset */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Duration (MM:SS)
                </label>
                <input
                  type="text"
                  placeholder="03:45"
                  value={uploadDuration}
                  onChange={(e) => setUploadDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none font-mono"
                />
              </div>

              {/* Cover Gradient Presets */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Cover Artwork Theme
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setUploadColor(preset.value)}
                      title={preset.name}
                      className={`h-9 rounded-lg ${preset.value} border transition-all ${
                        uploadColor === preset.value
                          ? 'border-white scale-105 shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                          : 'border-white/20 hover:border-white/50 opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                      <span>Streaming to Cloud…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">cloud_done</span>
                      <span>Publish to Cloud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
