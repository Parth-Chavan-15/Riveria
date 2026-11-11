const fs = require('fs');
const path = require('path');
const Track = require('../models/Track');
const env = require('../config/env');

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
    if (deletedTrack.audioFile?.filename) await fs.promises.unlink(path.join(uploadsDirectory, deletedTrack.audioFile.filename)).catch(() => {});
    emitTrackEvent(req, 'deleted', deletedTrack);
    res.status(204).end();
  } catch (error) { next(error); }
};

exports.uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'An audio file is required' } });
    const track = await Track.create({
      ...req.body,
      type: 'Upload',
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
    if (!track?.audioFile?.filename) return res.status(404).json({ error: { code: 'AUDIO_NOT_FOUND', message: 'No uploaded audio is available for this track' } });
    const filePath = path.join(uploadsDirectory, path.basename(track.audioFile.filename));
    const stat = await fs.promises.stat(filePath);
    const contentType = track.audioFile.mimeType || 'audio/mpeg';
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (!range) {
      res.setHeader('Content-Length', stat.size);
      if (req.method === 'HEAD') return res.status(200).end();
      return fs.createReadStream(filePath).on('error', next).pipe(res);
    }
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) return res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath, { start, end }).on('error', next).pipe(res);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: { code: 'AUDIO_NOT_FOUND', message: 'Audio file is unavailable' } });
    next(error);
  }
};
