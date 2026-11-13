import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { usePlayer } from '../hooks/usePlayer';
import { extractAudioMetadata } from '../utils/audioMetadata';

export default function AdminCatalog() {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadDuration, setUploadDuration] = useState('03:30');
  const [uploadCover, setUploadCover] = useState('/covers/sunflower.png');
  const [audioFile, setAudioFile] = useState(null);
  const [embeddedCoverUrl, setEmbeddedCoverUrl] = useState(null);
  const [useEmbeddedCover, setUseEmbeddedCover] = useState(true);
  const [customCoverFile, setCustomCoverFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit Modal State
  const [editingTrack, setEditingTrack] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTracks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/tracks');
      setTracks(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load catalog tracks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handleAudioFileSelection = async (file) => {
    if (!file) {
      setAudioFile(null);
      return;
    }
    setAudioFile(file);

    try {
      // 1. Extract ID3 metadata (Title, Artist, Embedded Cover)
      const meta = await extractAudioMetadata(file);
      if (meta.title && (!uploadTitle || uploadTitle === '')) {
        setUploadTitle(meta.title);
      }
      if (meta.artist && (!uploadArtist || uploadArtist === '')) {
        setUploadArtist(meta.artist);
      }
      if (meta.thumbnailUrl) {
        setEmbeddedCoverUrl(meta.thumbnailUrl);
        setUseEmbeddedCover(true);
      } else {
        setEmbeddedCoverUrl(null);
        setUseEmbeddedCover(false);
      }

      // 2. Extract Duration from audio
      const tempAudio = new Audio(URL.createObjectURL(file));
      tempAudio.addEventListener('loadedmetadata', () => {
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          const mins = Math.floor(tempAudio.duration / 60);
          const secs = Math.floor(tempAudio.duration % 60);
          setUploadDuration(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        }
      });
    } catch (e) {
      console.warn('Metadata inspection deferred:', e);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadArtist.trim()) {
      alert('Please provide track title and artist.');
      return;
    }

    try {
      setIsUploading(true);
      if (audioFile) {
        // Multipart GridFS upload
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('title', uploadTitle.trim());
        formData.append('artist', uploadArtist.trim());
        formData.append('duration', uploadDuration.trim() || '03:30');

        if (useEmbeddedCover && embeddedCoverUrl) {
          try {
            const resp = await fetch(embeddedCoverUrl);
            const blob = await resp.blob();
            const coverFile = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' });
            formData.append('cover', coverFile);
          } catch {
            formData.append('imageSrc', uploadCover.trim() || '/covers/sunflower.png');
          }
        } else if (customCoverFile) {
          formData.append('cover', customCoverFile);
        } else {
          formData.append('imageSrc', uploadCover.trim() || '/covers/sunflower.png');
        }

        await apiRequest('/tracks/upload', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Direct JSON track registration
        await apiRequest('/tracks', {
          method: 'POST',
          body: JSON.stringify({
            title: uploadTitle.trim(),
            artist: uploadArtist.trim(),
            duration: uploadDuration.trim() || '03:30',
            imageSrc: uploadCover.trim() || '/covers/sunflower.png',
            type: 'Cloud',
            audioSrc: '/audio/post-malone-sunflower.mp3'
          })
        });
      }

      setNotice(`Track "${uploadTitle}" successfully deployed to MongoDB GridFS Cloud!`);
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadArtist('');
      setAudioFile(null);
      setEmbeddedCoverUrl(null);
      setUseEmbeddedCover(true);
      setCustomCoverFile(null);
      fetchTracks();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingTrack) return;

    try {
      setIsUpdating(true);
      await apiRequest(`/tracks/${editingTrack._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle.trim(),
          artist: editArtist.trim(),
          duration: editDuration.trim()
        })
      });

      setNotice(`Track "${editTitle}" updated successfully.`);
      setEditingTrack(null);
      fetchTracks();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (track) => {
    if (!window.confirm(`Permanently remove track "${track.title}" from catalog and audio storage?`)) return;

    try {
      await apiRequest(`/tracks/${track._id}`, { method: 'DELETE' });
      setNotice(`Track "${track.title}" deleted.`);
      fetchTracks();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredTracks = tracks.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q);
  });

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-36 pt-24 md:ml-80 md:px-8 md:pt-28 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></span>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Audio Architecture</p>
            </div>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">Catalog & Track Master Management</h2>
            <p className="mt-1 text-sm text-slate-400">
              Upload master audio streams, maintain GridFS binary storage, and edit global acoustic library metadata.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-[#a078ff] text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(160,120,255,0.4)] active:scale-95"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span>Upload Master Track</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Search & Overview Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-white/10 bg-[#0e0c15]/80">
          <div className="relative w-full sm:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, artist, or tag..."
              className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>Total Catalog: <strong className="text-white">{tracks.length}</strong></span>
            <span>•</span>
            <span>Showing: <strong className="text-primary">{filteredTracks.length}</strong></span>
          </div>
        </div>

        {/* Tracks Table */}
        <section className="glass-panel rounded-2xl border border-white/10 bg-[#0e0c15]/80 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400 animate-pulse">
              <span className="material-symbols-outlined text-4xl mb-2">sync</span>
              <p className="text-sm">Retrieving master catalog from database...</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">music_off</span>
              <p className="text-sm">No tracks matched your query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-white/5 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Track & Artist</th>
                    <th className="px-4 py-3.5 font-semibold">Format & Bitrate</th>
                    <th className="px-4 py-3.5 font-semibold">Duration</th>
                    <th className="px-4 py-3.5 font-semibold">File Size</th>
                    <th className="px-4 py-3.5 font-semibold">GridFS Binary</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Master Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredTracks.map((track) => {
                    const isCurrentPlaying = (currentTrack?._id === track._id || currentTrack?.id === track._id) && isPlaying;
                    return (
                      <tr key={track._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={track.imageSrc || '/covers/sunflower.png'}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-white/10 bg-zinc-900"
                              onError={(e) => { e.currentTarget.src = '/covers/sunflower.png'; }}
                            />
                            <div>
                              <p className="font-bold text-white text-sm">{track.title}</p>
                              <p className="text-slate-400 text-xs">{track.artist}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px]">
                            {track.audioFile?.mimeType || 'audio/mpeg'} • Lossless Master
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-400">
                          {track.duration || '03:20'}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-400">
                          {track.audioFile?.size
                            ? `${(track.audioFile.size / 1024 / 1024).toFixed(2)} MB`
                            : 'Static Edge'}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-400">
                          {track.gridFsId ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                              <span>Mounted</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">CDN Cached</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Preview playback button */}
                            <button
                              onClick={() => playTrack(track)}
                              className={`p-2 rounded-lg border transition-all ${
                                isCurrentPlaying
                                  ? 'bg-primary text-black border-primary'
                                  : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                              }`}
                              title={isCurrentPlaying ? 'Currently Playing' : 'Preview Track'}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {isCurrentPlaying ? 'pause' : 'play_arrow'}
                              </span>
                            </button>

                            {/* Edit button */}
                            <button
                              onClick={() => {
                                setEditingTrack(track);
                                setEditTitle(track.title);
                                setEditArtist(track.artist);
                                setEditDuration(track.duration || '03:20');
                              }}
                              className="p-2 rounded-lg bg-white/5 text-slate-300 border border-white/10 hover:text-white hover:bg-white/10 transition-all"
                              title="Edit Metadata"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDelete(track)}
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                              title="Delete from Catalog"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e0c15] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">cloud_upload</span>
                  <span>Deploy New Master Track</span>
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Track Title</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Midnight Horizon"
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Artist Name</label>
                  <input
                    type="text"
                    required
                    value={uploadArtist}
                    onChange={(e) => setUploadArtist(e.target.value)}
                    placeholder="e.g. Hans Zimmer & Ludwig Göransson"
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Master Audio File (MP3, FLAC, WAV, AAC, M4A)
                  </label>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
                    onChange={(e) => handleAudioFileSelection(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-black hover:file:brightness-110 cursor-pointer"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Extracts ID3 tags, title, artist, duration, and embedded APIC cover art automatically.
                  </p>
                </div>

                {/* Embedded Artwork & Cover Selector */}
                {embeddedCoverUrl ? (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-primary/30 flex items-center gap-4">
                    <img
                      src={embeddedCoverUrl}
                      alt="Extracted Artwork"
                      className="w-14 h-14 rounded-lg object-cover border border-white/20 shadow-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useEmbeddedCover}
                          onChange={(e) => setUseEmbeddedCover(e.target.checked)}
                          className="rounded border-white/20 text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-purple-400"
                        />
                        <span className="text-xs font-semibold text-white">Use cover from audio metadata</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Extracted native ID3 album art will be stored in GridFS and bound to this track.
                      </p>
                    </div>
                  </div>
                ) : null}

                {(!embeddedCoverUrl || !useEmbeddedCover) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                        Upload Custom Cover Art
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCustomCoverFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Or Cover URL</label>
                      <input
                        type="text"
                        value={uploadCover}
                        onChange={(e) => setUploadCover(e.target.value)}
                        placeholder="/covers/sunflower.png"
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Duration (MM:SS)</label>
                    <input
                      type="text"
                      value={uploadDuration}
                      onChange={(e) => setUploadDuration(e.target.value)}
                      placeholder="03:45"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Storage Mode</label>
                    <div className="px-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-xs font-mono text-emerald-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">cloud_upload</span>
                      <span>MongoDB GridFS Master</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50"
                  >
                    {isUploading ? 'Streaming to GridFS...' : 'Upload & Deploy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-panel w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0c15] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-bold text-lg text-white">Edit Master Track Metadata</h3>
                <button onClick={() => setEditingTrack(null)} className="text-slate-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Artist</label>
                  <input
                    type="text"
                    required
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingTrack(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
