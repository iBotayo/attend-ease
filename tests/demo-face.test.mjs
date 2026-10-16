import test from 'node:test';
import assert from 'node:assert/strict';
// Imports the real module (Node 22.6+ strips TypeScript types natively).
import { buildDemoFaceResult } from '../src/lib/attendance/demoFace.ts';

test('demo face result lets check-in continue', () => {
  const r = buildDemoFaceResult(false);
  assert.equal(r.isVerified, true);
  assert.equal(r.mode, 'face_facility');
});

test('demo face result never claims a face match', () => {
  const r = buildDemoFaceResult(false);
  assert.equal(r.faceMatch, false);
  assert.equal(r.score, 0);
  assert.equal(r.gpsDistanceMeters, undefined, 'distance must come from the real location check');
});

test('offline demo result is tagged for offline sync', () => {
  const now = new Date('2026-10-16T09:00:00Z');
  const r = buildDemoFaceResult(true, now);
  assert.equal(r.mode, 'offline_sync');
  assert.equal(r.timestamp, '2026-10-16T09:00:00.000Z');
});
