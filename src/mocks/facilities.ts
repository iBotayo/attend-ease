import { Facility } from '@/types/facility';

export const MOCK_FACILITIES: Facility[] = [
  {
    id: 'fac-1',
    name: 'Metropolitan Medical Center - Main Campus',
    code: 'MMC-MAIN',
    address: '100 Medical Center Blvd, Suite 400, Chicago, IL 60611',
    coordinates: {
      latitude: 41.8951,
      longitude: -87.6242,
    },
    geofenceRadiusMeters: 150,
    networkPolicy: {
      requireNetworkMatch: true,
      allowedSsidPrefixes: ['MMC-SecureCorp', 'MMC-Staff-WiFi'],
      allowedIpRanges: ['10.120.0.0/16', '192.168.10.0/24'],
      description: 'Requires connection to MMC-Staff network or authorized facility subnet',
    },
    offlinePolicy: {
      allowOfflineAttendance: true,
      maxOfflineHours: 12,
      requireReviewThresholdHours: 4,
      description: 'Permits up to 12 hours offline queue with administrative review if pending > 4 hours',
    },
    status: 'active',
    activeEmployeeCount: 12,
    createdAt: '2025-01-15T08:00:00Z',
  },
  {
    id: 'fac-2',
    name: 'Northgate Outpatient & Research Center',
    code: 'NRC-NORTH',
    address: '4250 N Lincoln Ave, Chicago, IL 60618',
    coordinates: {
      latitude: 41.9587,
      longitude: -87.6891,
    },
    geofenceRadiusMeters: 200,
    networkPolicy: {
      requireNetworkMatch: true,
      allowedSsidPrefixes: ['Northgate-Clinical', 'NRC-Internal'],
      allowedIpRanges: ['10.140.0.0/16'],
      description: 'Strict clinical subnet verification required during operating hours',
    },
    offlinePolicy: {
      allowOfflineAttendance: true,
      maxOfflineHours: 8,
      requireReviewThresholdHours: 3,
      description: 'Permits 8 hours offline queue during scheduled maintenance windows',
    },
    status: 'active',
    activeEmployeeCount: 6,
    createdAt: '2025-03-01T09:30:00Z',
  },
  {
    id: 'fac-3',
    name: 'Westside Logistics & Diagnostics Facility',
    code: 'WLD-WEST',
    address: '1850 W Harrison St, Chicago, IL 60612',
    coordinates: {
      latitude: 41.8732,
      longitude: -87.6738,
    },
    geofenceRadiusMeters: 250,
    networkPolicy: {
      requireNetworkMatch: false,
      allowedSsidPrefixes: ['WLD-Warehouse', 'WLD-Operations'],
      allowedIpRanges: ['10.160.0.0/16'],
      description: 'GPS and geofence primary; network verification optional for field staff',
    },
    offlinePolicy: {
      allowOfflineAttendance: true,
      maxOfflineHours: 24,
      requireReviewThresholdHours: 6,
      description: 'Extended offline tolerance for dispatch and warehouse staff',
    },
    status: 'active',
    activeEmployeeCount: 4,
    createdAt: '2025-06-10T11:00:00Z',
  },
];
