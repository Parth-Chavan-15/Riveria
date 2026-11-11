# Riveria Music Engine

Riveria is a React, Express, MongoDB, Socket.IO music engine with authenticated track administration, byte-range audio streaming, browser-local libraries, and WebRTC playback-state jams.

## Run locally

1. Copy `.env.example` to `.env` and provide an Atlas URI plus a 32-character-or-longer JWT secret.
2. Copy the values required by the API into `server/.env` (use `CLIENT_ORIGIN=http://localhost:5173` for Vite development).
3. Run `npm ci --prefix server` and `npm ci --prefix client`.
4. Start the API with `npm run dev --prefix server`, then the client with `npm run dev --prefix client`.

The Vite development server proxies `/api` and `/socket.io` to port 5000. Uploaded tracks are administrator-only and stream from `GET /api/tracks/:id/stream` with HTTP range support. Device-local tracks are intentionally retained only in the browser and are not uploaded.

Public registration always creates standard users. Provision an administrator explicitly with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `npm run seed:admin --prefix server`.

## Containers

Set the variables in `.env`, then run `docker compose up --build`. The UI is served at `http://localhost:8080`; Nginx proxies API and Socket.IO calls to the private backend service. Atlas remains the production database, while uploaded audio uses the persistent Compose volume.

## Verification

Run `npm run lint --prefix server`, `npm test --prefix server`, `npm run lint --prefix client`, and `npm run build --prefix client`. GitHub Actions runs these checks and verifies both container builds. The deployment workflow publishes immutable commit-tagged images to GHCR after a protected production-environment approval.
