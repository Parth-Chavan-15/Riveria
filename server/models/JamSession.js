const mongoose = require('mongoose');

const jamRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true
  },
  peers: [
    {
      peerId: { type: String, required: true },
      email: { type: String, default: 'Anonymous' },
      role: { type: String, default: 'Listener' },
      lastSeen: { type: Date, default: Date.now }
    }
  ],
  playlist: [
    {
      id: String,
      title: String,
      artist: String,
      duration: String,
      type: String, // 'Cloud' or 'Local'
      addedBy: String
    }
  ],
  currentPlayback: {
    track: {
      _id: String,
      title: String,
      artist: String,
      duration: String,
      type: String,
      audioSrc: String,
      imageSrc: String,
      imageColor: String
    },
    isPlaying: { type: Boolean, default: false },
    position: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    fromPeerId: String
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto-clean empty rooms after 1 hour of inactivity
  }
});

const jamSignalSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  fromId: {
    type: String,
    required: true
  },
  targetId: {
    type: String,
    required: true,
    index: true
  },
  signal: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 120 // Auto-clean delivered/old signals after 2 minutes
  }
});

const JamRoom = mongoose.models.JamRoom || mongoose.model('JamRoom', jamRoomSchema);
const JamSignal = mongoose.models.JamSignal || mongoose.model('JamSignal', jamSignalSchema);

module.exports = { JamRoom, JamSignal };
