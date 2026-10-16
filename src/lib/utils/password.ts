// Mirrors backend/internal/auth/policy.go. Keep both in sync.
// No imports so the Node test runner can load this file directly.

export const TEMPORARY_PASSWORDS = ['Welcome123!', 'AttendEase2026!'];

/** Returns an error message, or null when the password meets the policy. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 128) return 'Password must be at most 128 characters long.';
  if (TEMPORARY_PASSWORDS.includes(password)) return 'Password cannot be one of the shared temporary passwords.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}
