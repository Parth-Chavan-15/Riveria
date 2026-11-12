require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const env = require('./config/env');
const connectDB = require('./config/db');
const trackRoutes = require('./routes/trackRoutes');
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { attachWebRtcHandlers } = require('./sockets/webrtcHandler');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const allowedOrigins = new Set(env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()));
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86400,
  credentials: true
};

const io = new Server(server, { cors: corsOptions, transports: ['websocket', 'polling'] });
app.set('io', io);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') throw new Error('Missing token');
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'riveria-api', audience: 'riveria-client' });
    const user = await User.findById(decoded.id);
    if (!user) throw new Error('Unknown user');
    socket.user = user;
    next();
  } catch (_) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  socket.join('authenticated');
  attachWebRtcHandlers(io, socket);
});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'degraded', database: databaseReady ? 'connected' : 'disconnected' });
});
app.use('/api/tracks', trackRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  server.listen(env.PORT, () => console.log(`Riveria API listening on ${env.PORT}`));
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  io.close();
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) start().catch((error) => {
  console.error('Unable to start Riveria API', error);
  process.exit(1);
});

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.start = start;
