const { JamRoom, JamSignal } = require('../models/JamSession');

const PEER_TIMEOUT_MS = 120000; // 120s inactivity = peer disconnected (protects background tabs)

exports.joinRoom = async (req, res, next) => {
  try {
    const { roomId, peerId, user } = req.body;
    if (!roomId || !peerId) {
      return res.status(400).json({ ok: false, error: 'roomId and peerId are required' });
    }

    const normalizedRoom = roomId.trim().toLowerCase();
    const now = new Date();

    // 1. Ensure room exists atomically without duplicate key race condition
    let room = await JamRoom.findOne({ roomId: normalizedRoom });
    if (!room) {
      try {
        room = await JamRoom.create({
          roomId: normalizedRoom,
          peers: [],
          playlist: []
        });
      } catch (err) {
        if (err.code === 11000) {
          room = await JamRoom.findOne({ roomId: normalizedRoom });
        } else {
          throw err;
        }
      }
    }

    // 2. Atomically prune stale peers and current peer (if re-joining)
    const cutoff = new Date(Date.now() - PEER_TIMEOUT_MS);
    await JamRoom.updateOne(
      { roomId: normalizedRoom },
      {
        $pull: {
          peers: {
            $or: [{ peerId }, { lastSeen: { $lt: cutoff } }]
          }
        }
      }
    );

    // 3. Atomically add current peer and update timestamp
    const updatedRoom = await JamRoom.findOneAndUpdate(
      { roomId: normalizedRoom },
      {
        $push: {
          peers: {
            peerId,
            email: user?.email || req.user?.email || 'Anonymous',
            role: user?.role || req.user?.role || 'Listener',
            lastSeen: now
          }
        },
        $set: { updatedAt: now }
      },
      { new: true, lean: true }
    );

    const activePeers = (updatedRoom?.peers || []).filter(
      (p) => now - new Date(p.lastSeen) < PEER_TIMEOUT_MS
    );

    res.json({
      ok: true,
      roomId: normalizedRoom,
      peers: activePeers.map((p) => ({ peerId: p.peerId, email: p.email, role: p.role })),
      playlist: updatedRoom?.playlist || [],
      currentPlayback: updatedRoom?.currentPlayback || null,
      serverTime: Date.now()
    });
  } catch (err) {
    next(err);
  }
};

exports.sendSignal = async (req, res, next) => {
  try {
    let { roomId, fromId, targetId, signal } = req.body || {};
    if (!roomId && req.headers['x-room-id']) roomId = req.headers['x-room-id'];
    if (!roomId || !fromId || !targetId || !signal) {
      return res.status(400).json({ ok: false, error: 'Missing required signaling fields' });
    }

    const normalizedRoom = roomId.trim().toLowerCase();
    await JamSignal.create({
      roomId: normalizedRoom,
      fromId,
      targetId,
      signal,
      createdAt: new Date()
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.pollSignals = async (req, res, next) => {
  try {
    const { roomId, peerId } = req.query;
    if (!roomId || !peerId) {
      return res.status(400).json({ ok: false, error: 'roomId and peerId query parameters required' });
    }

    const normalizedRoom = roomId.trim().toLowerCase();
    const now = new Date();

    // 1. Fetch and consume pending signals for this peer
    const signals = await JamSignal.find({ roomId: normalizedRoom, targetId: peerId }).sort({ createdAt: 1 });
    if (signals.length > 0) {
      const signalIds = signals.map((s) => s._id);
      await JamSignal.deleteMany({ _id: { $in: signalIds } });
    }

    // 2. Touch heartbeat atomically and retrieve current room state
    let room = await JamRoom.findOneAndUpdate(
      { roomId: normalizedRoom, 'peers.peerId': peerId },
      { $set: { 'peers.$.lastSeen': now, updatedAt: now } },
      { new: true, lean: true }
    );

    if (!room) {
      // Peer not yet in array, push peer atomically
      room = await JamRoom.findOneAndUpdate(
        { roomId: normalizedRoom },
        {
          $push: {
            peers: {
              peerId,
              email: req.user?.email || 'Anonymous',
              role: req.user?.role || 'Listener',
              lastSeen: now
            }
          },
          $set: { updatedAt: now }
        },
        { new: true, lean: true }
      );

      if (!room) {
        // Room does not exist yet: safely create
        try {
          room = await JamRoom.create({
            roomId: normalizedRoom,
            peers: [{
              peerId,
              email: req.user?.email || 'Anonymous',
              role: req.user?.role || 'Listener',
              lastSeen: now
            }],
            playlist: []
          });
        } catch (e) {
          if (e.code === 11000) {
            room = await JamRoom.findOne({ roomId: normalizedRoom }).lean();
          }
        }
      }
    }

    const activePeers = (room?.peers || []).filter(
      (p) => now - new Date(p.lastSeen) < PEER_TIMEOUT_MS
    );
    const peers = activePeers.map((p) => ({ peerId: p.peerId, email: p.email, role: p.role }));
    const playlist = room?.playlist || [];

    res.json({
      ok: true,
      signals: signals.map((s) => ({ fromId: s.fromId, signal: s.signal })),
      peers,
      playlist,
      currentPlayback: room?.currentPlayback || null,
      serverTime: Date.now()
    });
  } catch (err) {
    next(err);
  }
};

exports.leaveRoom = async (req, res, next) => {
  try {
    const { roomId, peerId } = req.body;
    if (roomId && peerId) {
      const normalizedRoom = roomId.trim().toLowerCase();
      await JamRoom.updateOne(
        { roomId: normalizedRoom },
        { $pull: { peers: { peerId } }, $set: { updatedAt: new Date() } }
      );
      await JamSignal.deleteMany({ roomId: normalizedRoom, $or: [{ fromId: peerId }, { targetId: peerId }] });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.syncPlayback = async (req, res, next) => {
  try {
    const { roomId, currentPlayback } = req.body;
    if (!roomId || !currentPlayback) {
      return res.status(400).json({ ok: false, error: 'roomId and currentPlayback are required' });
    }
    const normalizedRoom = roomId.trim().toLowerCase();
    const now = new Date();
    const serverTimeMs = Date.now();

    // Monotonically increment version for action deduplication
    const existing = await JamRoom.findOne({ roomId: normalizedRoom }).lean();
    const prevVersion = existing?.currentPlayback?.version || 0;
    const nextVersion = prevVersion + 1;

    const targetTrackId = currentPlayback.trackId || currentPlayback.track?._id || currentPlayback.track?.id;
    const trackObj = currentPlayback.track ? {
      ...currentPlayback.track,
      _id: targetTrackId,
      id: targetTrackId
    } : null;

    // Single-Speaker Master-Clock Scheduling: 150ms lookahead
    const scheduledStartTime = currentPlayback.scheduledStartTime || (serverTimeMs + 150);

    const playbackWithTime = {
      ...currentPlayback,
      trackId: targetTrackId,
      track: trackObj,
      version: nextVersion,
      timestamp: now,
      serverTime: serverTimeMs,
      scheduledStartTime
    };

    await JamRoom.updateOne(
      { roomId: normalizedRoom },
      { $set: { currentPlayback: playbackWithTime, updatedAt: now } },
      { upsert: true }
    );

    req.app.get('io')?.to(`jam:${normalizedRoom}`).emit('jam:playback-sync', playbackWithTime);
    res.json({ ok: true, currentPlayback: playbackWithTime, serverTime: serverTimeMs });
  } catch (err) {
    next(err);
  }
};

exports.updatePlaylist = async (req, res, next) => {
  try {
    const { roomId, playlist } = req.body;
    if (!roomId || !Array.isArray(playlist)) {
      return res.status(400).json({ ok: false, error: 'roomId and playlist array required' });
    }
    const normalizedRoom = roomId.trim().toLowerCase();
    const now = new Date();
    await JamRoom.updateOne(
      { roomId: normalizedRoom },
      { $set: { playlist, updatedAt: now } },
      { upsert: true }
    );
    req.app.get('io')?.to(`jam:${normalizedRoom}`).emit('jam:playlist-sync', { playlist });
    res.json({ ok: true, playlist });
  } catch (err) {
    next(err);
  }
};
