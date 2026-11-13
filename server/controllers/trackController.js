const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Track = require('../models/Track');
const env = require('../config/env');
const { validateAudioSignature, validateAudioBufferSignature } = require('../utils/audioValidator');

const uploadsDirectory = path.resolve(__dirname, '..', env.UPLOAD_DIR);

// In-memory audio buffer cache for 0ms instant response on range requests
const audioCache = new Map(); // trackId -> { buffer: Buffer, contentType: string }

function emitTrackEvent(req, action, track) {
  const payload = { action, track, occurredAt: new Date().toISOString() };
  req.app.get('io').to('authenticated').emit(`track:${action}`, payload);
  req.app.get('io').to('authenticated').emit('notification', {
    id: `${track._id}-${action}-${Date.now()}`,
    message: `${action[0].toUpperCase()}${action.slice(1)} track: ${track.title}`,
    time: new Date().toLocaleTimeString()
  });
}

exports.getAllTracks = async (req, res, next) => {
  try {
    // Sort by smallest file size first so lightweight tracks (Sunflower, Believer) load instantaneously
    const tracks = await Track.find().sort({ 'audioFile.size': 1, createdAt: -1 }).lean();
    res.status(200).json(tracks);
  } catch (error) { next(error); }
};

exports.getTrackById = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id).lean();
    if (!track) return res.status(404).json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found' } });
    res.status(200).json(track);
  } catch (error) { next(error); }
};

exports.createTrack = async (req, res, next) => {
  try {
    const newTrack = await Track.create(req.body);
    emitTrackEvent(req, 'created', newTrack);
    res.status(201).json({ track: newTrack });
  } catch (error) { next(error); }
};

exports.updateTrack = async (req, res, next) => {
  try {
    const updatedTrack = await Track.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedTrack) return res.status(404).json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found' } });
    emitTrackEvent(req, 'updated', updatedTrack);
    res.status(200).json({ track: updatedTrack });
  } catch (error) { next(error); }
};

exports.deleteTrack = async (req, res, next) => {
  try {
    const deletedTrack = await Track.findByIdAndDelete(req.params.id);
    if (!deletedTrack) return res.status(404).json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found' } });
    if (deletedTrack.gridFsId && mongoose.connection.db) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'audio_library' });
      await bucket.delete(deletedTrack.gridFsId).catch(() => {});
    }
    if (deletedTrack.coverGridFsId && mongoose.connection.db) {
      const imgBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'image_library' });
      await imgBucket.delete(deletedTrack.coverGridFsId).catch(() => {});
    }
    if (deletedTrack.audioFile?.filename) await fs.promises.unlink(path.join(uploadsDirectory, deletedTrack.audioFile.filename)).catch(() => {});
    emitTrackEvent(req, 'deleted', deletedTrack);
    res.status(204).end();
  } catch (error) { next(error); }
};

exports.uploadAudio = async (req, res, next) => {
  const audioFile = req.files?.audio?.[0] || req.file;
  const coverFile = req.files?.cover?.[0];

  try {
    if (!audioFile) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'An audio file is required' } });

    // Validate true audio file signature to prevent MIME spoofing
    const signatureCheck = await validateAudioSignature(audioFile.path);
    if (!signatureCheck.valid) {
      await fs.promises.unlink(audioFile.path).catch(() => {});
      if (coverFile) await fs.promises.unlink(coverFile.path).catch(() => {});
      return res.status(422).json({
        error: {
          code: 'INVALID_AUDIO_SIGNATURE',
          message: 'The uploaded file does not match a verified audio format signature'
        }
      });
    }

    let gridFsId = null;
    let coverGridFsId = null;

    if (mongoose.connection.db) {
      // 1. Upload audio stream to MongoDB GridFS
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'audio_library' });
      const uploadStream = bucket.openUploadStream(audioFile.filename, {
        contentType: audioFile.mimetype,
        metadata: { title: req.body.title, artist: req.body.artist }
      });
      await new Promise((resolve, reject) => {
        fs.createReadStream(audioFile.path)
          .pipe(uploadStream)
          .on('finish', resolve)
          .on('error', reject);
      });
      gridFsId = uploadStream.id;

      // 2. Upload cover art if provided
      if (coverFile) {
        const imageBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'image_library' });
        const imgStream = imageBucket.openUploadStream(coverFile.filename, {
          contentType: coverFile.mimetype
        });
        await new Promise((resolve, reject) => {
          fs.createReadStream(coverFile.path)
            .pipe(imgStream)
            .on('finish', resolve)
            .on('error', reject);
        });
        coverGridFsId = imgStream.id;
      }
    }

    const trackId = new mongoose.Types.ObjectId();
    const finalImageSrc = coverGridFsId
      ? `/api/tracks/${trackId}/cover`
      : (req.body.imageSrc || '/covers/sunflower.png');

    const track = await Track.create({
      _id: trackId,
      ...req.body,
      imageSrc: finalImageSrc,
      type: 'Upload',
      gridFsId,
      coverGridFsId,
      coverMimeType: coverFile ? coverFile.mimetype : 'image/jpeg',
      audioFile: { filename: audioFile.filename, mimeType: audioFile.mimetype, size: audioFile.size }
    });
    emitTrackEvent(req, 'created', track);
    res.status(201).json({ track });
  } catch (error) {
    if (audioFile) await fs.promises.unlink(audioFile.path).catch(() => {});
    if (coverFile) await fs.promises.unlink(coverFile.path).catch(() => {});
    next(error);
  }
};

exports.initChunkedUpload = async (req, res, next) => {
  try {
    const { title, artist, duration, fileName, fileSize, mimeType, totalChunks, imageSrc, coverBase64 } = req.body;
    if (!title || !artist || !fileName || !totalChunks) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required metadata for chunked upload' } });
    }

    const uploadId = crypto.randomUUID();
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: { code: 'DB_UNAVAILABLE', message: 'Database connection unavailable' } });
    }

    const sessionCol = db.collection('upload_sessions');
    await sessionCol.insertOne({
      uploadId,
      title: title.trim(),
      artist: artist.trim(),
      duration: duration || '03:30',
      fileName: fileName.trim(),
      fileSize: Number(fileSize),
      mimeType: mimeType || 'audio/mpeg',
      totalChunks: Number(totalChunks),
      imageSrc: imageSrc || null,
      coverBase64: coverBase64 || null,
      createdAt: new Date()
    });

    res.status(200).json({ uploadId, message: 'Upload session initialized' });
  } catch (error) {
    next(error);
  }
};

exports.uploadChunk = async (req, res, next) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    if (!uploadId || chunkIndex === undefined || !req.file) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'uploadId, chunkIndex, and chunk file are required' } });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: { code: 'DB_UNAVAILABLE', message: 'Database connection unavailable' } });
    }

    const chunksCol = db.collection('upload_chunks');
    await chunksCol.updateOne(
      { uploadId, chunkIndex: Number(chunkIndex) },
      { $set: { uploadId, chunkIndex: Number(chunkIndex), data: req.file.buffer, createdAt: new Date() } },
      { upsert: true }
    );

    res.status(200).json({ success: true, chunkIndex: Number(chunkIndex) });
  } catch (error) {
    next(error);
  }
};

exports.finalizeChunkedUpload = async (req, res, next) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'uploadId is required' } });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: { code: 'DB_UNAVAILABLE', message: 'Database connection unavailable' } });
    }

    const sessionCol = db.collection('upload_sessions');
    const chunksCol = db.collection('upload_chunks');

    const session = await sessionCol.findOne({ uploadId });
    if (!session) {
      return res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Upload session expired or not found' } });
    }

    const chunks = await chunksCol.find({ uploadId }).sort({ chunkIndex: 1 }).toArray();
    if (chunks.length < session.totalChunks) {
      return res.status(400).json({
        error: {
          code: 'INCOMPLETE_CHUNKS',
          message: `Expected ${session.totalChunks} chunks but received ${chunks.length}`
        }
      });
    }

    // Assemble complete audio buffer
    const bufferList = chunks.map(c => Buffer.isBuffer(c.data) ? c.data : (c.data?.buffer ? Buffer.from(c.data.buffer) : Buffer.from(c.data)));
    const fullAudioBuffer = Buffer.concat(bufferList);

    // Validate signature
    const signatureCheck = validateAudioBufferSignature(fullAudioBuffer);
    if (!signatureCheck.valid) {
      await chunksCol.deleteMany({ uploadId }).catch(() => {});
      await sessionCol.deleteOne({ uploadId }).catch(() => {});
      return res.status(422).json({
        error: {
          code: 'INVALID_AUDIO_SIGNATURE',
          message: 'The uploaded file does not match a verified audio format signature'
        }
      });
    }

    // Write to GridFS audio_library
    const audioBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'audio_library' });
    const cleanFilename = `${Date.now()}-${session.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadStream = audioBucket.openUploadStream(cleanFilename, {
      contentType: session.mimeType || 'audio/mpeg',
      metadata: { title: session.title, artist: session.artist }
    });

    await new Promise((resolve, reject) => {
      uploadStream.end(fullAudioBuffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const gridFsId = uploadStream.id;

    // Handle cover art if provided
    let coverGridFsId = null;
    let coverMimeType = 'image/jpeg';
    if (session.coverBase64) {
      const match = session.coverBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        coverMimeType = match[1];
        const coverBuf = Buffer.from(match[2], 'base64');
        const imgBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'image_library' });
        const imgStream = imgBucket.openUploadStream(`${Date.now()}-cover.jpg`, { contentType: coverMimeType });
        await new Promise((resolve, reject) => {
          imgStream.end(coverBuf, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        coverGridFsId = imgStream.id;
      }
    }

    const trackId = new mongoose.Types.ObjectId();
    const finalImageSrc = coverGridFsId
      ? `/api/tracks/${trackId}/cover`
      : (session.imageSrc || '/covers/sunflower.png');

    const track = await Track.create({
      _id: trackId,
      title: session.title,
      artist: session.artist,
      duration: session.duration || '03:30',
      imageSrc: finalImageSrc,
      type: 'Upload',
      gridFsId,
      coverGridFsId,
      coverMimeType,
      audioFile: {
        filename: cleanFilename,
        mimeType: session.mimeType || 'audio/mpeg',
        size: fullAudioBuffer.length
      }
    });

    // Seed ultra-fast in-memory cache
    audioCache.set(String(trackId), {
      buffer: fullAudioBuffer,
      contentType: session.mimeType || 'audio/mpeg'
    });

    // Cleanup session and chunks
    await chunksCol.deleteMany({ uploadId }).catch(() => {});
    await sessionCol.deleteOne({ uploadId }).catch(() => {});

    emitTrackEvent(req, 'created', track);
    res.status(201).json({ track });
  } catch (error) {
    next(error);
  }
};

exports.getTrackCover = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).end();

    if (track.coverGridFsId && mongoose.connection.db) {
      const imageBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'image_library' });
      res.setHeader('Content-Type', track.coverMimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return imageBucket.openDownloadStream(track.coverGridFsId).on('error', () => res.status(404).end()).pipe(res);
    }

    if (track.imageSrc) {
      return res.redirect(track.imageSrc);
    }
    return res.status(404).end();
  } catch (error) {
    next(error);
  }
};

exports.streamAudio = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id).lean();
    if (!track) {
      return res.status(404).json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found' } });
    }

    const trackIdStr = String(track._id);
    const range = req.headers.range;

    // Fast-path 1: Serve directly from In-Memory RAM Cache (0.0001ms instantaneous response)
    if (audioCache.has(trackIdStr)) {
      const cached = audioCache.get(trackIdStr);
      const fileSize = cached.buffer.length;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      if (!range) {
        res.setHeader('Content-Length', fileSize);
        if (req.method === 'HEAD') return res.status(200).end();
        return res.status(200).end(cached.buffer);
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
      }

      let start = 0;
      let end = fileSize - 1;

      if (!match[1]) {
        const suffix = Number(match[2]);
        if (suffix === 0) return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        start = Math.max(0, fileSize - suffix);
      } else {
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), fileSize - 1) : fileSize - 1;
      }

      if (start >= fileSize || start > end) {
        return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);
      if (req.method === 'HEAD') return res.end();
      return res.end(cached.buffer.subarray(start, end + 1));
    }

    // Fast-path 2: Check local disk file if present, populate cache and serve
    const filename = path.basename(track.audioFile?.filename || '');
    let filePath = filename ? path.join(uploadsDirectory, filename) : null;
    if (filePath && !fs.existsSync(filePath)) {
      const publicAudioPath = path.resolve(__dirname, '../../client/public/audio', filename);
      if (fs.existsSync(publicAudioPath)) {
        filePath = publicAudioPath;
      } else {
        filePath = null;
      }
    }

    if (filePath && fs.existsSync(filePath)) {
      const buf = await fs.promises.readFile(filePath);
      const contentType = track.audioFile?.mimeType || 'audio/mpeg';
      audioCache.set(trackIdStr, { buffer: buf, contentType });

      const fileSize = buf.length;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      if (!range) {
        res.setHeader('Content-Length', fileSize);
        if (req.method === 'HEAD') return res.status(200).end();
        return res.status(200).end(buf);
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = 0;
      let end = fileSize - 1;
      if (match && match[1]) {
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), fileSize - 1) : fileSize - 1;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);
      if (req.method === 'HEAD') return res.end();
      return res.end(buf.subarray(start, end + 1));
    }

    // 3. Fallback: Streaming from MongoDB Atlas GridFS and cache in background
    const db = mongoose.connection.db;
    if (db && track.gridFsId) {
      const fileSize = track.audioFile?.size || 0;
      const contentType = track.audioFile?.mimeType || 'audio/mpeg';

      if (fileSize > 0) {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'audio_library' });
        const gridFsObjectId = mongoose.Types.ObjectId.isValid(track.gridFsId)
          ? new mongoose.Types.ObjectId(track.gridFsId)
          : track.gridFsId;

        // Background caching of full GridFS stream so next seek/play is instant
        const downloadChunks = [];
        bucket.openDownloadStream(gridFsObjectId)
          .on('data', (chunk) => downloadChunks.push(chunk))
          .on('end', () => {
            const fullBuf = Buffer.concat(downloadChunks);
            audioCache.set(trackIdStr, { buffer: fullBuf, contentType });
          })
          .on('error', () => {});

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        if (!range) {
          res.setHeader('Content-Length', fileSize);
          if (req.method === 'HEAD') return res.status(200).end();
          return bucket.openDownloadStream(gridFsObjectId).on('error', next).pipe(res);
        }

        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
          return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        }

        let start = 0;
        let end = fileSize - 1;

        if (!match[1]) {
          const suffix = Number(match[2]);
          if (suffix === 0) return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          start = Math.max(0, fileSize - suffix);
        } else {
          start = Number(match[1]);
          if (match[2]) {
            end = Math.min(Number(match[2]), fileSize - 1);
          } else {
            end = fileSize - 1;
          }
        }

        if (start >= fileSize || start > end) {
          return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        }

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', end - start + 1);
        if (req.method === 'HEAD') return res.end();
        return bucket.openDownloadStream(gridFsObjectId, { start, end: end + 1 }).on('error', next).pipe(res);
      }
    }

    if (track.audioSrc && !track.audioSrc.startsWith('/audio/')) {
      return res.redirect(track.audioSrc);
    }

    return res.status(404).json({ error: { code: 'AUDIO_NOT_FOUND', message: 'Audio stream is currently unavailable' } });
  } catch (error) {
    next(error);
  }
};

// Asynchronously warm up the in-memory cache for instant zero-latency playback
function warmupAudioCache() {
  Track.find().lean().then((tracks) => {
    tracks.forEach(async (track) => {
      try {
        const trackIdStr = String(track._id);
        if (audioCache.has(trackIdStr)) return;
        const filename = path.basename(track.audioFile?.filename || '');
        const uploadsFile = filename ? path.join(uploadsDirectory, filename) : null;
        const publicFile = filename ? path.resolve(__dirname, '../../client/public/audio', filename) : null;
        let buf = null;
        if (uploadsFile && fs.existsSync(uploadsFile)) {
          buf = await fs.promises.readFile(uploadsFile);
        } else if (publicFile && fs.existsSync(publicFile)) {
          buf = await fs.promises.readFile(publicFile);
        }
        if (buf) {
          audioCache.set(trackIdStr, {
            buffer: buf,
            contentType: track.audioFile?.mimeType || 'audio/mpeg'
          });
        }
      } catch {}
    });
  }).catch(() => {});
}
setTimeout(warmupAudioCache, 800);
