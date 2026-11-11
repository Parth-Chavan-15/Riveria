const { z } = require('zod');

const roomSchema = z.object({ roomId: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/) }).strict();
const signalSchema = z.object({ targetId: z.string().min(1).max(128), signal: z.object({ type: z.string().max(32), sdp: z.string().max(250_000).optional(), candidate: z.string().max(10_000).optional() }).passthrough() }).strict();
const playbackSchema = roomSchema.extend({ trackId: z.string().max(128).nullable(), position: z.number().min(0).max(86_400), isPlaying: z.boolean(), sentAt: z.number().int().positive() }).strict();

function attachWebRtcHandlers(io, socket) {
  socket.on('jam:join', (payload, acknowledge = () => {}) => {
    const parsed = roomSchema.safeParse(payload);
    if (!parsed.success) return acknowledge({ ok: false, error: 'Invalid room code' });
    const room = `jam:${parsed.data.roomId}`;
    for (const joinedRoom of socket.rooms) if (joinedRoom.startsWith('jam:')) socket.leave(joinedRoom);
    socket.join(room);
    socket.to(room).emit('jam:peer-joined', { peerId: socket.id, user: { id: String(socket.user._id), email: socket.user.email } });
    acknowledge({ ok: true, peerId: socket.id, peers: [...io.sockets.adapter.rooms.get(room) || []].filter((id) => id !== socket.id) });
  });

  socket.on('jam:signal', (payload, acknowledge = () => {}) => {
    const parsed = signalSchema.safeParse(payload);
    const target = io.sockets.sockets.get(parsed.success ? parsed.data.targetId : '');
    if (!parsed.success || !target || ![...socket.rooms].some((room) => room.startsWith('jam:') && target.rooms.has(room))) return acknowledge({ ok: false, error: 'Invalid peer signal' });
    target.emit('jam:signal', { fromId: socket.id, signal: parsed.data.signal });
    acknowledge({ ok: true });
  });

  socket.on('jam:playback', (payload) => {
    const parsed = playbackSchema.safeParse(payload);
    if (!parsed.success || !socket.rooms.has(`jam:${parsed.data.roomId}`)) return;
    socket.to(`jam:${parsed.data.roomId}`).emit('jam:playback', { ...parsed.data, peerId: socket.id });
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) if (room.startsWith('jam:')) socket.to(room).emit('jam:peer-left', { peerId: socket.id });
  });
}

module.exports = { attachWebRtcHandlers };
