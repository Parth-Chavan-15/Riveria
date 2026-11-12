const express = require('express');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

router.post('/rooms', sessionController.joinRoom);
router.post('/signal', sessionController.sendSignal);
router.get('/poll', sessionController.pollSignals);
router.post('/leave', sessionController.leaveRoom);
router.post('/playlist', sessionController.updatePlaylist);
router.post('/sync', sessionController.syncPlayback);

module.exports = router;
