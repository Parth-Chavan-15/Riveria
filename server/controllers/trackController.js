const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Track = require('../models/Track');
const env = require('../config/env');
const { validateAudioSignature } = require('../utils/audioValidator');

const uploadsDirectory = path.resolve(__dirname, '..', env.UPLOAD_DIR);

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
    const tracks = await Track.find().sort({ createdAt: -1 }).lean();
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
    if (deletedTrack.audioFile?.filename) await fs.promises.unlink(path.join(uploadsDirectory, deletedTrack.audioFile.filename)).catch(() => {});
    emitTrackEvent(req, 'deleted', deletedTrack);
    res.status(204).end();
  } catch (error) { next(error); }
};

exports.uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'An audio file is required' } });

    // Validate true audio file signature to prevent MIME spoofing
    const signatureCheck = await validateAudioSignature(req.file.path);
    if (!signatureCheck.valid) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(422).json({
        error: {
          code: 'INVALID_AUDIO_SIGNATURE',
          message: 'The uploaded file does not match a verified audio format signature'
        }
      });
    }

    let gridFsId = null;
    if (mongoose.connection.db) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'audio_library' });
      const uploadStream = bucket.openUploadStream(req.file.filename, {
        contentType: req.file.mimetype,
        metadata: { title: req.body.title, artist: req.body.artist }
      });
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(uploadStream)
          .on('finish', resolve)
          .on('error', reject);
      });
      gridFsId = uploadStream.id;
    }

    const track = await Track.create({
      ...req.body,
      type: 'Upload',
      gridFsId,
      audioFile: { filename: req.file.filename, mimeType: req.file.mimetype, size: req.file.size }
    });
    emitTrackEvent(req, 'created', track);
    res.status(201).json({ track });
  } catch (error) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(error);
  }
};

exports.streamAudio = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id).lean();
    if (!track) {
      return res.status(404).json({ error: { code: 'TRACK_NOT_FOUND', message: 'Track not found' } });
    }

    const range = req.headers.range;

    // 1. Check if track is stored in MongoDB Atlas GridFS
    const db = mongoose.connection.db;
    if (db) {
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'audio_library' });
      let gridFile = null;
      if (track.gridFsId) {
        gridFile = await bucket.find({ _id: track.gridFsId }).next();
      }
      if (!gridFile && track.audioFile?.filename) {
        gridFile = await bucket.find({ filename: track.audioFile.filename }).next();
      }

      if (gridFile) {
        const fileSize = gridFile.length;
        const contentType = gridFile.contentType || track.audioFile?.mimeType || 'audio/mpeg';

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        if (!range) {
          res.setHeader('Content-Length', fileSize);
          if (req.method === 'HEAD') return res.status(200).end();
          return bucket.openDownloadStream(gridFile._id).on('error', next).pipe(res);
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
          }
        }

        if (start >= fileSize || start > end) {
          return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        }

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', end - start + 1);
        if (req.method === 'HEAD') return res.end();
        return bucket.openDownloadStream(gridFile._id, { start, end: end + 1 }).on('error', next).pipe(res);
      }
    }

    // 2. Stream from local disk file if present
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
      const stat = await fs.promises.stat(filePath);
      const contentType = track.audioFile?.mimeType || 'audio/mpeg';

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (!range) {
        res.setHeader('Content-Length', stat.size);
        if (req.method === 'HEAD') return res.status(200).end();
        return fs.createReadStream(filePath).on('error', next).pipe(res);
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        return res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
      }

      let start = 0;
      let end = stat.size - 1;

      if (!match[1]) {
        const suffix = Number(match[2]);
        if (suffix === 0) return res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
        start = Math.max(0, stat.size - suffix);
      } else {
        start = Number(match[1]);
        if (match[2]) {
          end = Math.min(Number(match[2]), stat.size - 1);
        }
      }

      if (start >= stat.size || start > end) {
        return res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', end - start + 1);
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(filePath, { start, end }).on('error', next).pipe(res);
    }

    // 3. Fall back to external audioSrc redirect if present
    if (track.audioSrc && !track.audioSrc.startsWith('/audio/')) {
      return res.redirect(track.audioSrc);
    }

    return res.status(404).json({ error: { code: 'AUDIO_NOT_FOUND', message: 'Audio stream is currently unavailable' } });
  } catch (error) {
    next(error);
  }
};
