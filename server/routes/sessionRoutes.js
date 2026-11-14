const express = require('express');
const sessionController = require('../controllers/sessionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/rooms', sessionController.joinRoom);
router.post('/signal', sessionController.sendSignal);
router.get('/poll', sessionController.pollSignals);
router.post('/leave', sessionController.leaveRoom);
router.post('/playlist', sessionController.updatePlaylist);
router.post('/sync', sessionController.syncPlayback);

// System Architect Exclusive Jam Mesh Governance
router.get('/active-rooms', protect, adminOnly, sessionController.listActiveRooms);
router.delete('/rooms/:roomId', protect, adminOnly, sessionController.terminateRoom);
router.post('/force-sync', protect, adminOnly, sessionController.adminForceSync);

module.exports = router;
