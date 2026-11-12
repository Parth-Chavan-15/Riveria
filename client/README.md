# Riveria Music Engine — Client Application

The Riveria client is a high-fidelity hybrid music application built with React 19, Vite 8, React Router 7, and Tailwind CSS 4.

## Key Architecture & Features

- **Hero Landing Page (`/landing`, `/`)**:
  - High-impact dark aesthetic with ambient aurora gradients and animated soundwave visualizers.
  - Interactive audio engine console with switchable modes: Cloud Stream, Local Device Sandbox, and WebRTC Jam telemetry.
  - Direct entry point with smooth transitions into the authenticated app.
- **Discovery Dashboard (`/`)**:
  - Unified grid presenting cloud-catalog tracks alongside mounted browser-local tracks.
  - Search and filter by title and artist.
  - Real-time updates via Socket.IO for track creation, update, and deletion events.
- **Local Sync Hub (`/sync`)**:
  - Mount audio files directly from the user's device storage into browser RAM using Object URLs.
  - 100% private: local files are never transmitted to the backend server.
- **Zero-Latency Jam Sessions (`/session`)**:
  - WebRTC Data Channels with Socket.IO signaling and STUN/TURN fallback.
  - Sub-50ms synchronized playback telemetry (track, position, play/pause state).
  - Active peer mesh monitor, encrypted invitation links, and live telemetry event log.
- **Global Settings (`/settings`)**:
  - Streaming resolution configuration (Lossless, High, Balanced).
  - WebRTC buffer mode (Zero-Latency, Adaptive, High Stability).
  - Dynamic volume normalization toggle and local sandbox storage metrics.
- **Persistent Bottom Player (`BottomPlayer`)**:
  - Audio playback, Range scrubber, seeking, duration, and error reporting.

## Scripts

```bash
# Start Vite development server (proxies /api and /socket.io to localhost:5000)
npm run dev

# Lint with Oxlint
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```
