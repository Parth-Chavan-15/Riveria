# Riveria Music Engine
<p align="center">
  <br />
  <strong>Where sound dissolves into memory.</strong><br />
  <em>A high-fidelity listening sanctuary and real-time audio synchronization engine.</em>
  <br /><br />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/WebRTC-Peer_Mesh-FF6C37?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/RFC_9110-Byte_Ranges-9333EA?style=for-the-badge" alt="RFC 9110" />
</p>

---

## ✦ The Prologue

In a modern musical landscape crowded with algorithmic clamor, aggressive telemetry, commercial feeds, and ephemeral marketing trends, **Riveria** was envisioned as an unhurried harbor.

Traditional platforms treat your songs like catalog items on an inventory spreadsheet. Riveria reclaims music as an intimate, emotional experience—marrying audiophile-grade playback mechanics with the warmth of shared resonance and total sovereignty over your personal audio archives.

Mount your private recordings directly from disk without uploading a single byte, stream master cloud recordings across delicate byte-range chunks, or step into a zero-latency WebRTC Jam where you and a companion across oceans hear each crescendo at the exact same millisecond.

---

## ✦ Key Architectural Pillars

```mermaid
flowchart TD
    subgraph Client ["Client Browser (React 19 + Tailwind 4)"]
        Landing["Listening Chamber\n(Fluid Player Deck)"]
        LocalHub["Local Sync Hub\n(In-Memory Object URLs)"]
        JamSession["WebRTC Jam Studio\n(Peer DataChannels)"]
    end

    subgraph Edge ["Vercel Edge & Cloud CDN"]
        VercelRouter["Vercel Multi-Service Router\n(vercel.json)"]
        StaticAssets["Static Audio & Visuals\n(/audio & Cover CDN)"]
    end

    subgraph Backend ["Riveria Core Engine (Node 20 + Express 5)"]
        ByteStream["RFC 9110 Streamer\n(206 Partial Content)"]
        MagicValidator["Binary Signature Validator\n(Magic-Byte Headers)"]
        SocketSignaler["Socket.IO Signaling\n(Mesh Discovery)"]
    end

    subgraph Database ["Cloud State (MongoDB Atlas)"]
        MongoTracks[("Tracks & Metadata")]
        MongoUsers[("RBAC & Security")]
    end

    Client -->|Public Routes| VercelRouter
    VercelRouter -->|/(.*)| Client
    VercelRouter -->|/api/(.*)| Backend
    Client -->|Static Media| StaticAssets
    Client <--->|Sub-50ms P2P Telemetry| Client
    Backend -->|Live Query| Database
    Backend -->|Audio Slicing| ByteStream
```

### 1. Sovereign In-Memory Browser Mounts
*Select any folder on your device.* Riveria provisions instantaneous, client-isolated in-memory browser `Object URLs`. Your acoustic sessions, rare vinyl rips, and master FLAC/WAV files remain strictly on your machine—zero cloud leakage, zero quota limits, and 100% data sovereignty.

### 2. Direct WebRTC Peer Mesh Jams
Listening together should feel like sitting on the same carpet. Utilizing Socket.IO for ephemeral signaling and establishing direct WebRTC DataChannels between peers, playhead indices, scrub positions, and pause states sync directly between browser sessions with sub-50ms latency—completely bypassing intermediary server serialization.

### 3. RFC 9110 Byte-Range Chunk Slicing
Server-uploaded cloud recordings stream through custom Node.js read streams supporting standard HTTP `Range` headers (`bytes=start-end`). Listeners enjoy instantaneous seek response across large audio files without waiting for whole-file downloads.

### 4. Binary Magic-Byte Security
File extensions and MIME headers can be forged. Riveria inspects raw binary magic bytes at the file header level (verifying `ID3`/sync frames for MP3, `RIFF`/`WAVE` for WAV, `OggS` for OGG, `fLaC` for FLAC, and `ftyp` for MP4/AAC) before accepting uploads, instantly unlinking unverified files.

### 5. Audiophile Obsidian & Lavender Glassmorphism
Styled in deep obsidian (`#0e0e0f`), translucent smoked acrylic cards (`bg-white/5`), luminous lavender accents (`#d0bcff`), and reactive frequency equalizer spectrum bars, Riveria is crafted to look and feel like an audiophile high-fidelity workstation.

### 6. Role-Based Access Control (RBAC)
Public guests can register and immediately enjoy dynamic cloud streaming and local audio mounting. Administrative catalog management (uploading cloud masters, updating metadata, or deleting entries) is strictly guarded by JWT audience validation and Zod schema sanitization.

---

## ✦ The Living Instrument: Chamber Player

The landing page features an interactive listening sanctuary:
* **Dynamic Cloud Synchronizer**: Seamlessly loads cloud tracks from `/api/tracks` into memory on arrival.
* **Master Controls**: Play/pause, track seeking with click-to-scrub timecodes, skip forward/backward, movement shuffle, and precision master gain slider.
* **Spectrum Equalizer**: Animated wave visualizer pulsating in harmony with the playback state.
* **Dynamic Cover Art**: Atmospheric blurred album art backdrop behind the rotating vinyl core.

---

## ✦ Quickstart: Local Studio Development

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **MongoDB**: A free MongoDB Atlas cluster connection string

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/Parth-Chavan-15/Riveria.git
cd Riveria

# Install dependencies for both workspaces
npm ci --prefix server
npm ci --prefix client
```

### 2. Environment Configuration
Create `server/.env` with your parameters:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.your_host.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_signing_key_must_be_32_characters_or_longer
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_BYTES=104857600
```

### 3. Provision an Admin Account
```bash
ADMIN_EMAIL=admin@riveria.audio ADMIN_PASSWORD=reverie_studio_master npm run seed:admin --prefix server
```

### 4. Launch Development Servers
In separate terminal sessions:
```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev --prefix server

# Terminal 2: Frontend Studio (Port 5173)
npm run dev --prefix client
```

Open `http://localhost:5173` in your browser. The Vite development proxy forwards all `/api` calls and Socket.IO signaling directly to port 5000.

---

## ✦ Deployment: Vercel Multi-Service

Riveria is engineered for native **Vercel Services**, hosting both frontend and backend as a unified project under a single domain.

Root `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "client": {
      "root": "client",
      "framework": "vite"
    },
    "server": {
      "root": "server",
      "framework": "express"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "server" } },
    { "source": "/(.*)", "destination": { "service": "client" } }
  ]
}
```

### Vercel Environment Variables
Set these under **Project Settings > Environment Variables**:
* `MONGODB_URI` — Your MongoDB Atlas connection URI
* `JWT_SECRET` — 32+ character authentication key
* `NODE_ENV` — `production`

---

## ✦ Deployment: Docker Compose Container

To run a production-ready isolated container cluster with Nginx reverse proxying:
```bash
docker compose up --build -d
```
* **Frontend & Reverse Proxy**: Accessible at `http://localhost:8080`
* **Upload Persistence**: Audio files persist safely across restarts via the named `audio_uploads` volume.

---

## ✦ Quality & Verification Suite

Riveria enforces strict quality standards:

```bash
# Verify backend syntax & linting
npm run lint --prefix server

# Run backend unit tests (Node.js native test runner)
npm test --prefix server

# Verify frontend code quality (oxlint)
npm run lint --prefix client

# Verify production frontend build (Vite & Rolldown)
npm run build --prefix client
```

Continuous integration runs automatically on every pull request and push to `main` via [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## ✦ API Reference Summary

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register standard listener account |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated profile |
| `GET` | `/api/tracks` | Public | List cloud library tracks |
| `GET` | `/api/tracks/:id` | Public | Retrieve track metadata |
| `GET` | `/api/tracks/:id/stream` | Public | Stream audio with RFC 9110 byte-ranges |
| `POST` | `/api/tracks/upload` | Admin | Upload binary audio with magic-byte check |
| `POST` | `/api/tracks` | Admin | Register new cloud track metadata |
| `DELETE`| `/api/tracks/:id` | Admin | Remove track and unlink stored audio |

---

<p align="center">
  <sub>Crafted for listeners who cherish stillness, craftsmanship, and personal sovereignty.</sub><br />
  <sub>© 2026 Riveria Music Engine. All rights reserved.</sub>
</p>
