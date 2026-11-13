import { apiRequest } from './api';

function fileToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Resilient audio track uploader supporting both direct multipart upload
 * for compact files and 2MB chunked streaming upload to MongoDB GridFS
 * for studio-master audio files (WAV, FLAC, high-bitrate MP3) of arbitrary size.
 *
 * @param {Object} options
 * @param {File|Blob} options.audioFile - The master audio file
 * @param {string} options.title - Track title
 * @param {string} options.artist - Track artist
 * @param {string} [options.duration] - Track duration string (e.g. "03:42")
 * @param {string} [options.imageSrc] - Fallback cover image URL
 * @param {File|Blob} [options.coverBlobOrFile] - Embedded or custom cover image
 * @param {Function} [options.onProgress] - Callback ({ current, total, percent, stage })
 * @returns {Promise<Object>} Created track record
 */
export async function uploadMasterTrack({
  audioFile,
  title,
  artist,
  duration = '03:30',
  imageSrc = '/covers/sunflower.png',
  coverBlobOrFile = null,
  onProgress = null
}) {
  if (!audioFile) {
    throw new Error('An audio file is required for upload');
  }

  const DIRECT_THRESHOLD = 3.5 * 1024 * 1024; // 3.5 MB Vercel Serverless safe ceiling

  if (audioFile.size <= DIRECT_THRESHOLD) {
    if (onProgress) onProgress({ current: 1, total: 1, percent: 50, stage: 'Uploading master file...' });
    const formData = new FormData();
    formData.append('audio', audioFile, audioFile.name || 'track.mp3');
    formData.append('title', title.trim());
    formData.append('artist', artist.trim());
    formData.append('duration', duration.trim() || '03:30');

    if (coverBlobOrFile) {
      formData.append('cover', coverBlobOrFile, 'cover.jpg');
    } else {
      formData.append('imageSrc', imageSrc.trim() || '/covers/sunflower.png');
    }

    const res = await apiRequest('/tracks/upload', {
      method: 'POST',
      body: formData
    });

    if (onProgress) onProgress({ current: 1, total: 1, percent: 100, stage: 'Deployed to Cloud' });
    return res.track || res;
  }

  // --- CHUNKED STREAMING PIPELINE FOR LARGE / LOSSLESS STUDIO AUDIO ---
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per slice
  const totalChunks = Math.ceil(audioFile.size / CHUNK_SIZE);

  let coverBase64 = null;
  if (coverBlobOrFile) {
    try {
      coverBase64 = await fileToDataUrl(coverBlobOrFile);
    } catch {
      coverBase64 = null;
    }
  }

  if (onProgress) onProgress({ current: 0, total: totalChunks, percent: 5, stage: 'Initializing cloud session...' });

  // 1. Initialize session
  const initRes = await apiRequest('/tracks/upload/chunk-init', {
    method: 'POST',
    body: JSON.stringify({
      title: title.trim(),
      artist: artist.trim(),
      duration: duration.trim() || '03:30',
      fileName: audioFile.name || 'track.mp3',
      fileSize: audioFile.size,
      mimeType: audioFile.type || 'audio/mpeg',
      totalChunks,
      imageSrc: imageSrc.trim() || '/covers/sunflower.png',
      coverBase64
    })
  });

  const uploadId = initRes.uploadId;

  // 2. Transmit each chunk
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(audioFile.size, start + CHUNK_SIZE);
    const chunkBlob = audioFile.slice(start, end);

    const chunkFormData = new FormData();
    chunkFormData.append('uploadId', uploadId);
    chunkFormData.append('chunkIndex', String(i));
    chunkFormData.append('chunk', chunkBlob, `chunk-${i}.bin`);

    await apiRequest('/tracks/upload/chunk', {
      method: 'POST',
      body: chunkFormData
    });

    const progressPct = Math.round(((i + 1) / totalChunks) * 85) + 5;
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: totalChunks,
        percent: progressPct,
        stage: `Ingesting chunk ${i + 1} of ${totalChunks} (${progressPct}%)...`
      });
    }
  }

  // 3. Finalize & assemble stream into MongoDB GridFS
  if (onProgress) onProgress({ current: totalChunks, total: totalChunks, percent: 95, stage: 'Assembling audio stream in MongoDB GridFS...' });

  const finalRes = await apiRequest('/tracks/upload/chunk-finalize', {
    method: 'POST',
    body: JSON.stringify({ uploadId })
  });

  if (onProgress) onProgress({ current: totalChunks, total: totalChunks, percent: 100, stage: 'Cloud Ingest Complete!' });

  return finalRes.track || finalRes;
}
