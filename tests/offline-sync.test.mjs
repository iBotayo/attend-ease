import test from 'node:test';
import assert from 'node:assert/strict';

// Haversine distance function under test
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Offline sync state transition machine under test
class MockSyncEngine {
  constructor() {
    this.events = new Map();
  }

  addEvent(event) {
    this.events.set(event.id, {
      ...event,
      status: 'pending',
      retryCount: 0,
    });
  }

  async syncBatch(simulateNetworkFailure = false) {
    const pending = Array.from(this.events.values()).filter((e) => e.status === 'pending');
    if (pending.length === 0) {
      return { totalProcessed: 0, successful: 0, failed: 0, reviewRequired: 0 };
    }

    // 1. Mark as syncing
    for (const evt of pending) {
      evt.status = 'syncing';
    }

    // 2. Handle network failure rollback
    if (simulateNetworkFailure) {
      for (const evt of pending) {
        evt.status = 'pending';
        evt.retryCount = (evt.retryCount || 0) + 1;
        evt.errorMessage = 'Network connection failed during sync attempt.';
      }
      return {
        totalProcessed: pending.length,
        successful: 0,
        failed: pending.length,
        reviewRequired: 0,
      };
    }

    // 3. Process records with policy reconciliation
    let successful = 0;
    let failed = 0;
    let reviewRequired = 0;

    for (const evt of pending) {
      if (evt.verificationResult.score < 0.8) {
        evt.status = 'rejected';
        evt.errorMessage = 'Biometric match score below threshold.';
        failed++;
      } else if (evt.verificationResult.gpsDistanceMeters > 150) {
        evt.status = 'review_required';
        evt.requiresReviewReason = 'Captured outside geofence boundary.';
        reviewRequired++;
      } else {
        evt.status = 'synced';
        evt.syncedAt = new Date().toISOString();
        successful++;
      }
    }

    return { totalProcessed: pending.length, successful, failed, reviewRequired };
  }
}

test('Geofence Distance Calculation', async (t) => {
  await t.test('calculates 0 meters for identical coordinates', () => {
    const dist = calculateDistanceMeters(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(dist, 0);
  });

  await t.test('calculates accurate distance within expected radius tolerance', () => {
    // Approx 111 meters apart in latitude (0.001 deg ≈ 111 meters)
    const dist = calculateDistanceMeters(37.7749, -122.4194, 37.7759, -122.4194);
    assert.ok(dist >= 100 && dist <= 120, `Expected ~111m, got ${dist}m`);
  });
});

test('Offline Queue & Sync Engine', async (t) => {
  await t.test('preserves pending records on network failure and increments retryCount', async () => {
    const engine = new MockSyncEngine();
    engine.addEvent({
      id: 'evt-1',
      eventType: 'check_in',
      employeeId: 'EMP-1001',
      verificationResult: { score: 0.95, gpsDistanceMeters: 40 },
    });

    // Simulate network failure
    const result = await engine.syncBatch(true);
    assert.strictEqual(result.failed, 1);
    assert.strictEqual(result.successful, 0);

    const saved = engine.events.get('evt-1');
    assert.strictEqual(saved.status, 'pending'); // Reverted to pending, NOT deleted
    assert.strictEqual(saved.retryCount, 1);
    assert.ok(saved.errorMessage.includes('Network connection failed'));
  });

  await t.test('correctly transitions valid records to synced', async () => {
    const engine = new MockSyncEngine();
    engine.addEvent({
      id: 'evt-2',
      eventType: 'check_in',
      employeeId: 'EMP-1002',
      verificationResult: { score: 0.96, gpsDistanceMeters: 35 },
    });

    const result = await engine.syncBatch(false);
    assert.strictEqual(result.successful, 1);
    assert.strictEqual(result.failed, 0);

    const saved = engine.events.get('evt-2');
    assert.strictEqual(saved.status, 'synced');
    assert.ok(saved.syncedAt);
  });

  await t.test('correctly flags boundary deviations as review_required', async () => {
    const engine = new MockSyncEngine();
    engine.addEvent({
      id: 'evt-3',
      eventType: 'check_in',
      employeeId: 'EMP-1003',
      verificationResult: { score: 0.92, gpsDistanceMeters: 190 }, // > 150m
    });

    const result = await engine.syncBatch(false);
    assert.strictEqual(result.reviewRequired, 1);

    const saved = engine.events.get('evt-3');
    assert.strictEqual(saved.status, 'review_required');
    assert.ok(saved.requiresReviewReason);
  });

  await t.test('rejects low confidence biometric captures', async () => {
    const engine = new MockSyncEngine();
    engine.addEvent({
      id: 'evt-4',
      eventType: 'check_in',
      employeeId: 'EMP-1004',
      verificationResult: { score: 0.55, gpsDistanceMeters: 30 }, // < 0.80
    });

    const result = await engine.syncBatch(false);
    assert.strictEqual(result.failed, 1);

    const saved = engine.events.get('evt-4');
    assert.strictEqual(saved.status, 'rejected');
  });
});
