const fs = require('fs');

/**
 * Validates that a file on disk starts with known audio magic number signatures.
 * Supports: MP3 (ID3 or MPEG sync frames), WAV (RIFF...WAVE), OGG (OggS),
 * FLAC (fLaC), AAC (ADTS frame 0xFFF), MP4/M4A (ftyp box), and WebM/Matroska.
 *
 * @param {string} filePath - Absolute or relative path to file on disk
 * @returns {Promise<{ valid: boolean, format?: string }>}
 */
async function validateAudioSignature(filePath) {
  let fileHandle;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(32);
    const { bytesRead } = await fileHandle.read(buffer, 0, 32, 0);

    if (bytesRead < 4) {
      return { valid: false };
    }

    // 1. MP3 with ID3v2 tag (ID3)
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return { valid: true, format: 'mp3' };
    }

    // 2. MP3 MPEG frame sync (11 bits set: 0xFF followed by 0xEx or 0xFx)
    if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) {
      return { valid: true, format: 'mp3' };
    }

    // 3. WAV: starts with "RIFF" and bytes 8..11 are "WAVE"
    if (
      bytesRead >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45    // WAVE
    ) {
      return { valid: true, format: 'wav' };
    }

    // 4. OGG: starts with "OggS"
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return { valid: true, format: 'ogg' };
    }

    // 5. FLAC: starts with "fLaC"
    if (buffer[0] === 0x66 && buffer[1] === 0x4C && buffer[2] === 0x61 && buffer[3] === 0x43) {
      return { valid: true, format: 'flac' };
    }

    // 6. MP4 / M4A: byte 4..7 is "ftyp"
    if (
      bytesRead >= 8 &&
      buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
    ) {
      return { valid: true, format: 'm4a' };
    }

    // 7. WebM / Matroska: starts with EBML ID 0x1A 0x45 0xDF 0xA3
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
      return { valid: true, format: 'webm' };
    }

    return { valid: false };
  } catch (err) {
    return { valid: false, error: err.message };
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }
  }
}

/**
 * Validates audio magic numbers from an in-memory buffer without disk I/O.
 * @param {Buffer} buffer
 * @returns {{ valid: boolean, format?: string }}
 */
function validateAudioBufferSignature(buffer) {
  if (!buffer || buffer.length < 4) return { valid: false };

  // 1. MP3 with ID3v2 tag (ID3)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { valid: true, format: 'mp3' };
  }

  // 2. MP3 MPEG frame sync (11 bits set: 0xFF followed by 0xEx or 0xFx)
  if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) {
    return { valid: true, format: 'mp3' };
  }

  // 3. WAV: starts with "RIFF" and bytes 8..11 are "WAVE"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
  ) {
    return { valid: true, format: 'wav' };
  }

  // 4. OGG: starts with "OggS"
  if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { valid: true, format: 'ogg' };
  }

  // 5. FLAC: starts with "fLaC"
  if (buffer[0] === 0x66 && buffer[1] === 0x4C && buffer[2] === 0x61 && buffer[3] === 0x43) {
    return { valid: true, format: 'flac' };
  }

  // 6. MP4 / M4A: byte 4..7 is "ftyp"
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
  ) {
    return { valid: true, format: 'm4a' };
  }

  // 7. WebM / Matroska: starts with EBML ID 0x1A 0x45 0xDF 0xA3
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return { valid: true, format: 'webm' };
  }

  return { valid: false };
}

module.exports = { validateAudioSignature, validateAudioBufferSignature };
