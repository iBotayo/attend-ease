import test from 'node:test';
import assert from 'node:assert/strict';

// Organization registration validation & token logic under test
function validateRegistration(dto) {
  if (!dto.legalName || !dto.legalName.trim()) {
    throw new Error('Organization legal name is required.');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!dto.email || !emailRegex.test(dto.email.trim())) {
    throw new Error('Please enter a valid official email address.');
  }
  if (!dto.contactPersonName || !dto.contactPersonName.trim()) {
    throw new Error('Contact person full name is required.');
  }
  if (!dto.contactPhone || !dto.contactPhone.trim()) {
    throw new Error('Contact phone number is required.');
  }
  if (!dto.password || dto.password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(dto.password) || !/[a-z]/.test(dto.password) || !/[0-9]/.test(dto.password)) {
    throw new Error('Password must contain uppercase, lowercase, and numeric characters.');
  }
  if (dto.password !== dto.confirmPassword) {
    throw new Error('Passwords do not match.');
  }
  if (!dto.termsAccepted) {
    throw new Error('You must accept the terms of service and privacy notice to continue.');
  }
  return true;
}

class MockTokenStore {
  constructor() {
    this.tokens = new Map();
  }

  storeToken(token, email, orgId, ttlMs) {
    this.tokens.set(token, {
      token,
      email: email.toLowerCase(),
      orgId,
      expiresAt: Date.now() + ttlMs,
      used: false,
    });
  }

  verifyToken(token) {
    const entry = this.tokens.get(token);
    if (!entry) return null;
    if (entry.used) return null; // Single-use enforcement
    if (Date.now() > entry.expiresAt) return null; // Expiration enforcement

    entry.used = true; // Mark as consumed
    return { orgId: entry.orgId, email: entry.email };
  }
}

test('Organization Registration & Verification', async (t) => {
  await t.test('validates required registration fields and password complexity', () => {
    // Missing legal name
    assert.throws(() => validateRegistration({ legalName: '', email: 'admin@test.org' }), {
      message: 'Organization legal name is required.',
    });

    // Invalid email
    assert.throws(
      () =>
        validateRegistration({
          legalName: 'Test Hospital',
          email: 'invalid-email',
        }),
      { message: 'Please enter a valid official email address.' }
    );

    // Weak password
    assert.throws(
      () =>
        validateRegistration({
          legalName: 'Test Hospital',
          email: 'admin@test.org',
          contactPersonName: 'Dr. Jane',
          contactPhone: '555-0199',
          password: 'weak',
          confirmPassword: 'weak',
          termsAccepted: true,
        }),
      { message: 'Password must be at least 8 characters long.' }
    );

    // Mismatched password
    assert.throws(
      () =>
        validateRegistration({
          legalName: 'Test Hospital',
          email: 'admin@test.org',
          contactPersonName: 'Dr. Jane',
          contactPhone: '555-0199',
          password: 'SecurePassword1!',
          confirmPassword: 'DifferentPassword2!',
          termsAccepted: true,
        }),
      { message: 'Passwords do not match.' }
    );

    // Terms not accepted
    assert.throws(
      () =>
        validateRegistration({
          legalName: 'Test Hospital',
          email: 'admin@test.org',
          contactPersonName: 'Dr. Jane',
          contactPhone: '555-0199',
          password: 'SecurePassword1!',
          confirmPassword: 'SecurePassword1!',
          termsAccepted: false,
        }),
      { message: 'You must accept the terms of service and privacy notice to continue.' }
    );
  });

  await t.test('accepts valid registration payload', () => {
    const valid = validateRegistration({
      legalName: 'Mercy Memorial Hospital',
      displayName: 'Mercy Health',
      email: 'admin@mercyhealth.org',
      contactPersonName: 'Dr. Robert Hall',
      contactPhone: '+1-555-321-4567',
      password: 'SecurePassword1!',
      confirmPassword: 'SecurePassword1!',
      termsAccepted: true,
    });
    assert.strictEqual(valid, true);
  });

  await t.test('verifies single-use email token and marks it consumed', () => {
    const store = new MockTokenStore();
    const token = 'token_test_12345';
    store.storeToken(token, 'admin@mercyhealth.org', 'org-101', 60000);

    // First verification should succeed
    const result1 = store.verifyToken(token);
    assert.ok(result1);
    assert.strictEqual(result1.orgId, 'org-101');
    assert.strictEqual(result1.email, 'admin@mercyhealth.org');

    // Second verification must fail (single-use token protection)
    const result2 = store.verifyToken(token);
    assert.strictEqual(result2, null);
  });

  await t.test('rejects expired verification tokens', () => {
    const store = new MockTokenStore();
    const token = 'token_expired_123';
    // Expired 1000ms ago
    store.storeToken(token, 'admin@mercyhealth.org', 'org-101', -1000);

    const result = store.verifyToken(token);
    assert.strictEqual(result, null);
  });
});
