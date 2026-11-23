<div align="center">

# R I V E R I A
### *Where sound dissolves into memory.*

**A sovereign acoustic sanctuary, 32-bit floating-point DSP engine, and real-time listening mesh.**

<br />

[![Live Production](https://img.shields.io/badge/Production-riveria--umber.vercel.app-d0bcff?style=for-the-badge&logo=vercel&logoColor=black)](https://riveria-umber.vercel.app)
[![React 19](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js 22](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-32--Bit_Float_DSP-8B5CF6?style=for-the-badge&logo=soundcharts&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Mesh-FF6C37?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org)
[![RFC 9110](https://img.shields.io/badge/RFC_9110-Partial_Content-9333EA?style=for-the-badge)](https://httpwg.org/specs/rfc9110.html)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_GridFS-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)

<br />

<a href="https://riveria-umber.vercel.app">
  <img src="docs/images/riveria-preview.png" alt="Riveria High-Fidelity Audio Experience" width="100%" style="max-width: 960px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 30px 80px rgba(0,0,0,0.85);" />
</a>

</div>

---

### ✦ The Prologue: Music, Reclaimed

Most modern music apps treat sound like an algorithmic commodity—buried underneath endless recommendation feeds, behavioral trackers, visual clutter, and dynamically squashed audio.

**Riveria** was built to restore what was lost: the feeling of sitting in a quiet room, putting on a record, and losing yourself in pure sound. It is a sovereign listening haven that unites studio-grade acoustic processing with the warmth of shared listening—free from advertisements, tracking, or commercial algorithms.

---

### ✦ What You Can Experience in Riveria

Whether you are seeking solace in late-night listening or syncing a song with a friend across the world, Riveria is designed to feel effortless, intimate, and alive:

#### 1. Holographic 32-Bit Floating DSP Stage
Hear your music the way master recording engineers intended. Riveria runs a high-resolution 32-bit floating-point audio engine with a **Holographic 3D Spatializer**. Using psychoacoustic Mid-Side separation and an 18 ms Haas delay matrix, it expands the acoustic soundstage beyond flat stereo into a wide, immersive chamber—delivering clarity and warmth without phase distortion or mono cancellation.

#### 2. Tactile 5-Band Equalizer & Dynamic Curve
Shape your sound with tactile, responsive vertical faders that react to your touch. Watch the dynamic frequency response curve sculpt itself in real time as you adjust Sub-Bass (60 Hz), Punch (250 Hz), Vocal Mids (1 kHz), Presence (4 kHz), and Air (16 kHz). Switch between curated studio profiles (*Studio Reference*, *Bass Presence*, *Vocal Radiance*, *Electronic & Club*, *Acoustic Warmth*) or carve your own signature tone. Every preference is automatically saved to your cloud account so your acoustic profile stays with you across all your devices.

#### 3. WebRTC Group Jam — Telepathic Synchronized Listening
Music was never meant to be experienced alone. Riveria lets you spin up a private WebRTC Listening Jam and invite friends with a single 6-character room code. Over direct encrypted peer-to-peer data channels, playback stays in telepathic sync: when you pause, scrub to a bridge, or change a track, every connected device moves at the exact same millisecond—with no server in the middle delaying the sound. Powered by bidirectional 4-timestamp micro-NTP time synchronization and a continuous Phase-Locked Loop (PLL) slew engine, playback divergence holds within sub-millisecond phase accuracy (< 4 ms).

#### 4. Acoustic Phase Alignment & Hardware Calibration
Eliminate comb-filtering and phase cancellation when playing across multiple physical speakers in the same room. Riveria includes a dedicated hardware calibration engine that compensates for physical speaker distance and operating-system DAC buffer latencies with customizable millisecond lead and lag offsets ($\Delta_{hw}$ from -60 ms to +60 ms), complete with one-click presets for *Studio Reference (0 ms)*, *Android AudioTrack (-25 ms)*, and *Cellular (-40 ms)*.

#### 5. Sovereign Local Vault (Zero Server Uploads)
Your private collection of lossless FLACs, WAVs, or rare MP3s stays truly private. Mount local audio files directly from your computer or phone into Riveria's memory sandbox via Blob URLs. Audio bytes reside entirely inside browser memory and never leave your device. You can enjoy your rarest tracks inside Riveria's audiophile pipeline with absolute privacy, or stream them peer-to-peer to friends in a WebRTC Jam in 64 KB encrypted binary chunks without a single byte ever touching cloud storage.

#### 6. Seamless Edge Streaming & Studio Ingest
Cloud tracks stream with instant, zero-buffering scrubbing via RFC 9110 byte-range slicing, backed by an in-memory chunk cache delivering sub-5 ms initial playback response. When new studio masters are introduced, Riveria’s chunked ingest processes high-resolution audio into MongoDB GridFS while automatically extracting embedded ID3 cover art and track metadata with binary magic-byte security checks.

#### 7. System Architect Command Suite
For administrators, Riveria provides an executive control room: real-time telemetry gauges showing active WebRTC meshes, memory heap diagnostics, live catalog curation, and user role governance. Multi-account tab isolation allows administrators and listeners to operate simultaneously in separate tabs of the same browser window with zero session bleeding.

---

### ✦ System Architecture

<details>
<summary><b>✦ Click here to view the System Architecture Diagram</b></summary>
<br />

```mermaid
flowchart TD
    classDef client fill:#1e1b4b,stroke:#a78bfa,stroke-width:2px,color:#ffffff
    classDef dsp fill:#3b0764,stroke:#f472b6,stroke-width:2px,color:#ffffff
    classDef p2p fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff
    classDef edge fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#ffffff
    classDef storage fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#ffffff

    subgraph ClientChamber ["Client Chamber (React 19 & Web Audio DSP)"]
        UI["Obsidian Interface<br/>(Discovery • Equalizer • Group Jam)"]:::client
        DSPStage["32-Bit Floating DSP Stage<br/>(Mid-Side Spatializer & 5-Band Biquad)"]:::dsp
        LocalVault["Sovereign Memory Vault<br/>(Zero-Server Uploads • In-Memory Blobs)"]:::client
        PLLSync["Phase-Locked Loop Engine<br/>(Sub-Millisecond Micro-NTP Clock Sync)"]:::p2p
        HardwareCal["Hardware Calibration Stage<br/>(DAC Latency & Acoustic Lead/Lag)"]:::dsp
    end

    subgraph MeshNetwork ["WebRTC Peer-to-Peer Mesh"]
        SCTP["Direct SCTP Data Channels<br/>(Instant Seek & Playhead Lock)"]:::p2p
        RemotePeer["Remote Peer Devices<br/>(Synchronized Playback Nodes)"]:::p2p
    end

    subgraph EdgeLayer ["Global Edge Infrastructure (Vercel)"]
        VercelCDN["Edge Delivery Gateway<br/>(RFC 9110 Byte-Range Slicing)"]:::edge
        SecurityGate["JWT Auth & Role Governance<br/>(System Architect Gate)"]:::edge
    end

    subgraph CloudVault ["Cloud Core (MongoDB Atlas)"]
        GridFSStore["GridFS Lossless Audio Chunks<br/>(512KB Chunks • Stream Vault)"]:::storage
        UserStore["User Profiles & Preferences<br/>(EQ Curves & Saved Settings)"]:::storage
        TTLSignals["Ephemeral Signal Collections<br/>(TTL: 120s Auto-Eviction)"]:::storage
    end

    UI --> DSPStage
    UI --> LocalVault
    DSPStage <--> HardwareCal
    DSPStage <--> PLLSync
    PLLSync <-->|Encrypted Direct P2P| SCTP
    SCTP <--> RemotePeer
    DSPStage -->|HTTP 206 Byte Ranges| VercelCDN
    VercelCDN <--> SecurityGate
    SecurityGate <--> UserStore
    VercelCDN <--> GridFSStore
    SecurityGate <--> TTLSignals
```

</details>

---

### ✦ Launching Riveria

Experience the sanctuary locally or deploy the complete stack:

#### 1. Local Development
```bash
# Clone the repository
git clone https://github.com/Parth-Chavan-15/Riveria.git
cd Riveria

# Install dependencies
npm ci --prefix server && npm ci --prefix client

# Launch both signaling server and frontend studio
npm run dev --prefix server   # Port 5000: Express 5 Signaling Core
npm run dev --prefix client   # Port 5173: Vite Audiophile Client
```

#### 2. Isolated Production Container
```bash
# Build and run the complete containerized stack with one command
docker compose up -d --build
```
Open `http://localhost:8088` in your browser.

#### 3. Automated Verification Suites
```bash
# Run full automated DSP, settings persistence, and admin security tests
node test_settings_and_admin.cjs

# Verify master audio chunked upload and GridFS cloud ingest flow
node test_catalog_upload_flow.cjs
```

---

### ✦ Epilogue

> *"We do not listen to music to escape the world; we listen to remember the world we have forgotten."*

Riveria is open-source, crafted with reverence for pure sound, digital sovereignty, and the timeless art of listening together.

<div align="center">
<sub>© 2026 Riveria Music Engine. Built with love by the Riveria team.</sub>
</div>
