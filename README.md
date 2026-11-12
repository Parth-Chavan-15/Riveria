# Riveria Music Engine

Riveria is a high-fidelity hybrid music engine built with React 19, Express 5, MongoDB Atlas, Socket.IO, and WebRTC. It combines cloud track discovery, HTTP byte-range audio streaming, client-isolated browser-local file mounts, and real-time WebRTC playback jams.

## Core Highlights

- **Hero Landing Page & Interactive Sandbox**: Visually rich landing showcase featuring ambient aurora gradients, animated frequency equalizers, and an interactive audio console previewing Cloud, Local Sync, and Jam playback modes.
- **Hybrid Local Sync Hub**: Mount private local audio files (MP3, WAV, FLAC, OGG, M4A) directly in browser memory using Object URLs. Private files remain strictly on the user's device and are never uploaded to the server.
- **Byte-Range Audio Streaming**: Server-uploaded audio streams via Node.js pipelines with RFC 9110 HTTP Range (206 Partial Content) support, enabling instant audio scrub across multi-megabyte lossless files.
- **Zero-Latency WebRTC Jams**: Socket.IO signaling negotiates peer-to-peer WebRTC data channels with STUN/TURN fallback. Participants stay in synchronized lock-step with sub-50ms playback telemetry.
- **Hardened Upload Security**: Uploads are verified by magic byte signatures (MP3, WAV, OGG, FLAC, AAC, WebM) to prevent MIME spoofing, with automated unlink cleanup on validation errors.
- **Role-Based Access Control**: Public registration provisions standard listeners; administrative track mutations and uploads require validated admin credentials with strict Zod schemas and JWT audience claims.

## Run Locally

1. Copy `.env.example` to `.env` and configure your Atlas URI plus a 32-character-or-longer JWT secret.
2. Ensure values required by the API are present in `server/.env` (default `CLIENT_ORIGIN=http://localhost:5173` for Vite).
3. Run `npm ci --prefix server` and `npm ci --prefix client`.
4. Start the backend: `npm run dev --prefix server`.
5. Start the frontend: `npm run dev --prefix client`.

The Vite development server proxies `/api` and `/socket.io` to port 5000. Uploaded tracks stream from `GET /api/tracks/:id/stream` with HTTP range support.

To provision an administrator, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (min 12 characters) in `server/.env` and execute:
```bash
npm run seed:admin --prefix server
```

## Containers

Configure `.env` and launch with Docker Compose:
```bash
docker compose up --build
```
The application is served at `http://localhost:8080`. Nginx reverse-proxies `/api` and `/socket.io` to the private backend container. Audio uploads persist across container restarts via the named `audio_uploads` volume.

## Verification Suite

Execute the full verification suite:
```bash
npm run lint --prefix server
npm test --prefix server
npm run lint --prefix client
npm run build --prefix client
```
All checks run in GitHub Actions CI (`.github/workflows/ci.yml`). Docker images are published to GHCR (`.github/workflows/deploy.yml`) with automated lowercase owner normalization.
