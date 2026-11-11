const test = require('node:test');
const assert = require('node:assert/strict');
const { registerSchema } = require('../validators/authSchemas');
const { createTrackSchema, trackIdSchema } = require('../validators/trackSchemas');

test('registration rejects role escalation and short passwords', () => {
  assert.equal(registerSchema.safeParse({ body: { email: 'admin@example.com', password: 'a'.repeat(12), role: 'admin' }, params: {}, query: {} }).success, false);
  assert.equal(registerSchema.safeParse({ body: { email: 'admin@example.com', password: 'short' }, params: {}, query: {} }).success, false);
});

test('track creation accepts only approved metadata', () => {
  assert.equal(createTrackSchema.safeParse({ body: { title: 'Song', artist: 'Artist', type: 'Cloud' }, params: {}, query: {} }).success, true);
  assert.equal(createTrackSchema.safeParse({ body: { title: 'Song', artist: 'Artist', injected: true }, params: {}, query: {} }).success, false);
});

test('track route requires a MongoDB ObjectId', () => {
  assert.equal(trackIdSchema.safeParse({ body: {}, query: {}, params: { id: 'not-an-id' } }).success, false);
});
