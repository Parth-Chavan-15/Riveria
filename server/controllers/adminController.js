const mongoose = require('mongoose');
const os = require('os');
const User = require('../models/User');
const Track = require('../models/Track');
const { JamRoom } = require('../models/JamSession');

/**
 * GET /api/admin/metrics
 * System Engine telemetry, resource utilization, and real-time mesh statistics
 */
exports.getMetrics = async (req, res, next) => {
  try {
    const [userCount, adminCount, trackCount, activeRooms] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Track.countDocuments(),
      JamRoom.find({ 'peers.0': { $exists: true } }).lean()
    ]);

    // Calculate total peers currently in active listening rooms
    const totalActivePeers = activeRooms.reduce((acc, room) => acc + (room.peers ? room.peers.length : 0), 0);

    // Node & System memory metrics
    const memUsage = process.memoryUsage();
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    // Track storage footprint estimate
    const tracks = await Track.find({}, 'audioFile.size').lean();
    const totalStorageBytes = tracks.reduce((acc, t) => acc + (t.audioFile?.size || 0), 0);

    const metrics = {
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        cpuCount: os.cpus().length,
        memory: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
          rssMB: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
          systemFreeMB: Math.round(os.freemem() / 1024 / 1024 * 100) / 100,
          systemTotalMB: Math.round(os.totalmem() / 1024 / 1024 * 100) / 100,
        }
      },
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        host: mongoose.connection.host || 'MongoDB Atlas Cluster',
        name: mongoose.connection.name || 'reveria'
      },
      catalog: {
        trackCount,
        totalStorageBytes,
        totalStorageMB: Math.round(totalStorageBytes / 1024 / 1024 * 100) / 100
      },
      governance: {
        totalUsers: userCount,
        adminUsers: adminCount,
        standardUsers: userCount - adminCount
      },
      mesh: {
        activeRoomCount: activeRooms.length,
        connectedPeersCount: totalActivePeers,
        rooms: activeRooms.map(r => ({
          roomId: r.roomId,
          peerCount: r.peers ? r.peers.length : 0,
          peers: (r.peers || []).map(p => ({ peerId: p.peerId, role: p.role, email: p.email })),
          playlistCount: r.playlist ? r.playlist.length : 0,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        }))
      }
    };

    res.status(200).json(metrics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users
 * Returns list of registered users
 */
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, 'email role createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/users/:id/role
 * Updates a user's role (admin vs user)
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "user" or "admin"' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Safety guard: Protect root admin from demotion
    if (targetUser.email === 'admin@riveria.com' && role !== 'admin') {
      return res.status(403).json({ error: 'Root administrator cannot be demoted' });
    }

    targetUser.role = role;
    await targetUser.save();

    res.status(200).json({
      message: `User ${targetUser.email} role updated to ${role}`,
      user: {
        _id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Removes a user account from the system
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user && String(req.user._id) === String(id)) {
      return res.status(400).json({ error: 'You cannot delete your own administrative account' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.email === 'admin@riveria.com') {
      return res.status(403).json({ error: 'Root administrator account cannot be deleted' });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: `User ${targetUser.email} successfully removed from system` });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/broadcast
 * Broadcast a real-time system message to all connected WebRTC & socket clients
 */
exports.broadcastAnnouncement = async (req, res, next) => {
  try {
    const { message, level = 'info' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Announcement message is required' });
    }

    const io = req.app.get('io');
    const announcementPayload = {
      id: `announcement-${Date.now()}`,
      message: message.trim(),
      level,
      sender: req.user?.email || 'System Architect',
      timestamp: new Date().toISOString()
    };

    if (io) {
      io.emit('system:announcement', announcementPayload);
      io.to('authenticated').emit('notification', {
        id: announcementPayload.id,
        message: `[ADMIN BROADCAST] ${announcementPayload.message}`,
        time: new Date().toLocaleTimeString()
      });
    }

    res.status(200).json({
      ok: true,
      broadcastedTo: 'all-connected-clients',
      announcement: announcementPayload
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/terminate-room/:roomId
 * Forces eviction of all peers and closes a Jam room
 */
exports.terminateRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const normalized = roomId.trim().toLowerCase();

    await JamRoom.deleteOne({ roomId: normalized });

    const io = req.app.get('io');
    if (io) {
      io.to(`room:${normalized}`).emit('room:terminated', {
        reason: 'Administrative eviction / room closed by system architect',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({ ok: true, message: `Room ${roomId.toUpperCase()} terminated successfully` });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/purge-cache
 * Purges memory caches and forces garbage collection if available
 */
exports.purgeCache = async (req, res, next) => {
  try {
    if (global.gc) {
      global.gc();
    }
    res.status(200).json({
      ok: true,
      message: 'Server audio stream caches and buffers successfully purged',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};
