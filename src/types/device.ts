export type DeviceStatus = 'active' | 'revoked' | 'pending';
export type DeviceType = 'mobile_ios' | 'mobile_android' | 'tablet_kiosk' | 'desktop';

export interface RegisteredDevice {
  id: string;
  organizationId?: string;
  name: string;
  model: string;
  deviceType: DeviceType;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedFacilityId?: string;
  assignedFacilityName?: string;
  fingerprintHash: string; // Identifier hash, no raw biometric data
  registeredAt: string;
  lastSyncAt: string;
  status: DeviceStatus;
  appVersion: string;
  isSimulated?: boolean;
}
