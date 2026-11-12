const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { registerSchema } = require('../validators/authSchemas');
const { createTrackSchema, updateTrackSchema, trackIdSchema, uploadTrackSchema } = require('../validators/trackSchemas');
const { validateAudioSignature } = require('../utils/audioValidator');

test('registration rejects role escalation and short passwords', () => {
  assert.equal(registerSchema.safeParse({ body: { email: 'admin@example.com', password: 'a'.repeat(12), role: 'admin' }, params: {}, query: {} }).success, false);
  assert.equal(registerSchema.safeParse({ body: { email: 'admin@example.com', password: 'short' }, params: {}, query: {} }).success, false);
});

test('track creation accepts only approved metadata', () => {
  assert.equal(createTrackSchema.safeParse({ body: { title: 'Song', artist: 'Artist', type: 'Cloud' }, params: {}, query: {} }).success, true);
  assert.equal(createTrackSchema.safeParse({ body: { title: 'Song', artist: 'Artist', injected: true }, params: {}, query: {} }).success, false);
});

test('track creation normalizes type and accepts tailwind colors', () => {
  const result = createTrackSchema.safeParse({
    body: {
      title: 'Neon Echoes',
      artist: 'Aetheric',
      type: 'cloud',
      imageColor: 'bg-gradient-to-r from-purple-500/80 via-indigo-600 to-cyan-400'
    },
    params: {},
    query: {}
  });
  assert.equal(result.success, true);
  assert.equal(result.data.body.type, 'Cloud');
});

test('uploadTrackSchema accepts upload payload without audioSrc', () => {
  assert.equal(uploadTrackSchema.safeParse({ body: { title: 'Local Wave', artist: 'Producer' }, params: {}, query: {} }).success, true);
  assert.equal(uploadTrackSchema.safeParse({ body: { title: '', artist: 'Producer' }, params: {}, query: {} }).success, false);
});

test('track route requires a MongoDB ObjectId', () => {
  assert.equal(trackIdSchema.safeParse({ body: {}, query: {}, params: { id: 'not-an-id' } }).success, false);
});

test('audioValidator correctly detects genuine audio signatures and rejects fake files', async () => {
  const tempDir = os.tmpdir();

  // Test 1: ID3 MP3 file
  const mp3Path = path.join(tempDir, `test-${Date.now()}.mp3`);
  const mp3Header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  fs.writeFileSync(mp3Path, mp3Header);
  const mp3Res = await validateAudioSignature(mp3Path);
  fs.unlinkSync(mp3Path);
  assert.equal(mp3Res.valid, true);
  assert.equal(mp3Res.format, 'mp3');

  // Test 2: WAV file
  const wavPath = path.join(tempDir, `test-${Date.now()}.wav`);
  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
    0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20
  ]);
  fs.writeFileSync(wavPath, wavHeader);
  const wavRes = await validateAudioSignature(wavPath);
  fs.unlinkSync(wavPath);
  assert.equal(wavRes.valid, true);
  assert.equal(wavRes.format, 'wav');

  // Test 3: Spoofed fake file (e.g. text/html purporting to be audio)
  const fakePath = path.join(tempDir, `fake-${Date.now()}.mp3`);
  fs.writeFileSync(fakePath, Buffer.from('<html><body>Hello</body></html>'));
  const fakeRes = await validateAudioSignature(fakePath);
  fs.unlinkSync(fakePath);
  assert.equal(fakeRes.valid, false);
});
