const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes enforce JWT authentication AND admin role authorization
router.use(protect, adminOnly);

router.get('/metrics', adminController.getMetrics);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.post('/broadcast', adminController.broadcastAnnouncement);
router.post('/terminate-room/:roomId', adminController.terminateRoom);
router.post('/purge-cache', adminController.purgeCache);

module.exports = router;
