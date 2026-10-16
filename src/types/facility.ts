export type FacilityStatus = 'active' | 'maintenance' | 'inactive';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NetworkVerificationPolicy {
  requireNetworkMatch: boolean;
  allowedSsidPrefixes: string[];
  allowedIpRanges: string[];
  description: string;
}

export interface OfflineVerificationPolicy {
  allowOfflineAttendance: boolean;
  maxOfflineHours: number;
  requireReviewThresholdHours: number;
  description: string;
}

export interface Facility {
  id: string;
  organizationId?: string;
  name: string;
  code: string;
  address: string;
  coordinates: Coordinates;
  geofenceRadiusMeters: number;
  networkPolicy: NetworkVerificationPolicy;
  offlinePolicy: OfflineVerificationPolicy;
  status: FacilityStatus;
  activeEmployeeCount: number;
  createdAt: string;
}
