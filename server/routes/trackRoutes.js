const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const trackController = require('../controllers/trackController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createTrackSchema, updateTrackSchema, trackIdSchema, uploadTrackSchema } = require('../validators/trackSchemas');
const env = require('../config/env');

const router = express.Router();
const uploadDirectory = path.resolve(__dirname, '..', env.UPLOAD_DIR);
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, callback) => callback(null, uploadDirectory),
    filename: (_, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: env.MAX_UPLOAD_SIZE_BYTES, files: 2 },
  fileFilter: (_, file, callback) => {
    if (file.fieldname === 'audio') {
      return callback(null, /^(audio\/(mpeg|wav|ogg|aac|mp4|webm|flac|x-flac)|video\/mp4)$/i.test(file.mimetype) || /\.(mp3|wav|ogg|aac|m4a|flac|webm)$/i.test(file.originalname));
    }
    if (file.fieldname === 'cover') {
      return callback(null, /^image\/(jpeg|png|webp|gif|svg\+xml)$/i.test(file.mimetype) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.originalname));
    }
    callback(null, true);
  }
});

router.get('/', trackController.getAllTracks);
router.post('/', protect, adminOnly, validate(createTrackSchema), trackController.createTrack);
router.post('/upload', protect, adminOnly, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), validate(uploadTrackSchema), trackController.uploadAudio);

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});
router.post('/upload/chunk-init', protect, adminOnly, trackController.initChunkedUpload);
router.post('/upload/chunk', protect, adminOnly, chunkUpload.single('chunk'), trackController.uploadChunk);
router.post('/upload/chunk-finalize', protect, adminOnly, trackController.finalizeChunkedUpload);

router.get('/:id/cover', trackController.getTrackCover);
router.get('/:id/stream', validate(trackIdSchema), trackController.streamAudio);
router.head('/:id/stream', validate(trackIdSchema), trackController.streamAudio);
router.get('/:id', validate(trackIdSchema), trackController.getTrackById);
router.put('/:id', protect, adminOnly, validate(updateTrackSchema), trackController.updateTrack);
router.delete('/:id', protect, adminOnly, validate(trackIdSchema), trackController.deleteTrack);

module.exports = router;
