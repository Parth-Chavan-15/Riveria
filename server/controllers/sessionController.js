const { JamRoom, JamSignal } = require('../models/JamSession');

const PEER_TIMEOUT_MS = 25000; // 25s inactivity = peer disconnected

exports.joinRoom = async (req, res, next) => {
  try {
    const { roomId, peerId, user } = req.body;
    if (!roomId || !peerId) {
      return res.status(400).json({ ok: false, error: 'roomId and peerId are required' });
    }

    const normalizedRoom = roomId.trim().toLowerCase();
    const now = new Date();

    let room = await JamRoom.findOne({ roomId: normalizedRoom });
    if (!room) {
      room = new JamRoom({
        roomId: normalizedRoom,
        peers: [],
        playlist: []
      });
    }

    // Filter out timed-out peers or duplicate of current peer
    room.peers = room.peers.filter((p) => {
      const isSelf = p.peerId === peerId;
      const isFresh = now - new Date(p.lastSeen) < PEER_TIMEOUT_MS;
      return !isSelf && isFresh;
    });

    // Add current peer
    room.peers.push({
      peerId,
      email: user?.email || req.user?.email || 'Anonymous',
      role: user?.role || req.user?.role || 'Listener',
      lastSeen: now
    });
    room.updatedAt = now;
    await room.save();

    res.json({
      ok: true,
      roomId: normalizedRoom,
      peers: room.peers.map((p) => ({ peerId: p.peerId, email: p.email, role: p.role })),
      playlist: room.playlist
    });
  } catch (err) {
    next(err);
  }
};

exports.sendSignal = async (req, res, next) => {
  try {
    const { roomId, fromId, targetId, signal } = req.body;
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

    // 1. Fetch pending signals for this peer
    const signals = await JamSignal.find({ roomId: normalizedRoom, targetId: peerId }).sort({ createdAt: 1 });
    if (signals.length > 0) {
      const signalIds = signals.map((s) => s._id);
      await JamSignal.deleteMany({ _id: { $in: signalIds } });
    }

    // 2. Touch heartbeat and clean up expired peers in the room
    const room = await JamRoom.findOne({ roomId: normalizedRoom });
    let peers = [];
    let playlist = [];

    if (room) {
      let peerFound = false;
      const activePeers = [];

      for (const p of room.peers) {
        if (p.peerId === peerId) {
          p.lastSeen = now;
          peerFound = true;
          activePeers.push(p);
        } else if (now - new Date(p.lastSeen) < PEER_TIMEOUT_MS) {
          activePeers.push(p);
        }
      }

      if (!peerFound) {
        activePeers.push({
          peerId,
          email: req.user?.email || 'Anonymous',
          role: req.user?.role || 'Listener',
          lastSeen: now
        });
      }

      room.peers = activePeers;
      room.updatedAt = now;
      await room.save();

      peers = room.peers.map((p) => ({ peerId: p.peerId, email: p.email, role: p.role }));
      playlist = room.playlist || [];
    }

    res.json({
      ok: true,
      signals: signals.map((s) => ({ fromId: s.fromId, signal: s.signal })),
      peers,
      playlist
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

exports.updatePlaylist = async (req, res, next) => {
  try {
    const { roomId, playlist } = req.body;
    if (!roomId || !Array.isArray(playlist)) {
      return res.status(400).json({ ok: false, error: 'roomId and playlist array required' });
    }
    const normalizedRoom = roomId.trim().toLowerCase();
    await JamRoom.updateOne(
      { roomId: normalizedRoom },
      { $set: { playlist, updatedAt: new Date() } }
    );
    res.json({ ok: true, playlist });
  } catch (err) {
    next(err);
  }
};
