import type { VerificationResult } from '@/types/attendance';

/**
 * Face check result used in live mode while no face-matching service is connected.
 * It lets the check-in continue but never claims a match: faceMatch is false and the
 * score is 0, so stored records and the backend (BIOMETRIC_ENABLED=false) treat it as demo data.
 */
export function buildDemoFaceResult(isOffline: boolean, now: Date = new Date()): VerificationResult {
  return {
    isVerified: true,
    score: 0,
    mode: isOffline ? 'offline_sync' : 'face_facility',
    faceMatch: false,
    facilityMatch: true,
    message: 'Demo face check: matching is not connected yet, so this check-in is recorded without a face match.',
    timestamp: now.toISOString(),
  };
}
