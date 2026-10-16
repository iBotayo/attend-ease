import test from 'node:test';
import assert from 'node:assert/strict';

// Core authentication logic under test
function validateLoginInput(identifier, password) {
  const cleanId = (identifier || '').trim();
  if (!cleanId) {
    throw new Error('Please enter your Employee ID or Work Email.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  return { identifier: cleanId, password };
}

function authenticateMockUser(users, identifier, password) {
  const { identifier: cleanId } = validateLoginInput(identifier, password);
  const lowerId = cleanId.toLowerCase();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === lowerId ||
      u.employeeId.toLowerCase() === lowerId
  );

  if (!user) {
    throw new Error('Invalid credentials. Check your employee ID or email.');
  }

  if (!user.isActive) {
    throw new Error('This account has been deactivated. Please contact your facility administrator.');
  }

  return {
    user,
    token: `mock_jwt_token_${user.id}_${Date.now()}`,
    expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };
}

const mockUsers = [
  {
    id: 'user-1',
    organizationId: 'org-demo-1',
    employeeId: 'EMP-1001',
    name: 'Sarah Lin',
    email: 'sarah.lin@attendease.internal',
    role: 'employee',
    isActive: true,
  },
  {
    id: 'user-2',
    organizationId: 'org-demo-1',
    employeeId: 'EMP-1002',
    name: 'Marcus Vance',
    email: 'marcus.vance@attendease.internal',
    role: 'system_admin',
    isActive: true,
  },
  {
    id: 'user-3',
    organizationId: 'org-demo-1',
    employeeId: 'EMP-1003',
    name: 'Deactivated User',
    email: 'deactivated@attendease.internal',
    role: 'employee',
    isActive: false,
  },
];

test('Authentication Service Logic', async (t) => {
  await t.test('rejects empty identifier or password', () => {
    assert.throws(() => validateLoginInput('', 'password123'), {
      message: 'Please enter your Employee ID or Work Email.',
    });
    assert.throws(() => validateLoginInput('EMP-1001', ''), {
      message: 'Password must be at least 6 characters long.',
    });
    assert.throws(() => validateLoginInput('EMP-1001', '123'), {
      message: 'Password must be at least 6 characters long.',
    });
  });

  await t.test('authenticates valid employee by employeeId', () => {
    const session = authenticateMockUser(mockUsers, 'EMP-1001', 'ValidPassword123');
    assert.strictEqual(session.user.name, 'Sarah Lin');
    assert.strictEqual(session.user.role, 'employee');
    assert.ok(session.token.startsWith('mock_jwt_token_user-1_'));
  });

  await t.test('authenticates valid administrator by email', () => {
    const session = authenticateMockUser(mockUsers, 'marcus.vance@attendease.internal', 'ValidPassword123');
    assert.strictEqual(session.user.name, 'Marcus Vance');
    assert.strictEqual(session.user.role, 'system_admin');
  });

  await t.test('rejects unknown user credentials', () => {
    assert.throws(
      () => authenticateMockUser(mockUsers, 'nonexistent@attendease.internal', 'password123'),
      { message: 'Invalid credentials. Check your employee ID or email.' }
    );
  });

  await t.test('blocks login for deactivated accounts', () => {
    assert.throws(
      () => authenticateMockUser(mockUsers, 'EMP-1003', 'password123'),
      { message: 'This account has been deactivated. Please contact your facility administrator.' }
    );
  });
});
