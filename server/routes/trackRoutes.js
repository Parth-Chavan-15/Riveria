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
  limits: { fileSize: env.MAX_UPLOAD_SIZE_BYTES, files: 1 },
  fileFilter: (_, file, callback) => callback(null, /^(audio\/(mpeg|wav|ogg|aac|mp4|webm)|video\/mp4)$/i.test(file.mimetype))
});

router.get('/', trackController.getAllTracks);
router.post('/', protect, adminOnly, validate(createTrackSchema), trackController.createTrack);
router.post('/upload', protect, adminOnly, upload.single('audio'), validate(uploadTrackSchema), trackController.uploadAudio);
router.get('/:id/stream', validate(trackIdSchema), trackController.streamAudio);
router.head('/:id/stream', validate(trackIdSchema), trackController.streamAudio);
router.get('/:id', validate(trackIdSchema), trackController.getTrackById);
router.put('/:id', protect, adminOnly, validate(updateTrackSchema), trackController.updateTrack);
router.delete('/:id', protect, adminOnly, validate(trackIdSchema), trackController.deleteTrack);

module.exports = router;
