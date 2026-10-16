import { Facility } from '@/types/facility';
import { mockStore } from '@/mocks';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

export interface CreateFacilityInput {
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  requireNetworkMatch: boolean;
  allowedSsidPrefixes: string[];
  allowOfflineAttendance: boolean;
  maxOfflineHours: number;
  requireReviewThresholdHours: number;
  status: Facility['status'];
}

class FacilityService {
  async getFacilities(): Promise<Facility[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<Facility[]>(API_ENDPOINTS.FACILITIES.LIST);
    }
    return mockStore.getFacilities();
  }

  async getFacilityById(id: string): Promise<Facility | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<Facility>(API_ENDPOINTS.FACILITIES.DETAILS(id));
    }
    return mockStore.getFacilityById(id);
  }

  async createFacility(input: CreateFacilityInput): Promise<Facility> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<Facility>(API_ENDPOINTS.FACILITIES.CREATE, input);
    }
    const newFacility: Facility = {
      id: `fac-${Date.now().toString().slice(-4)}`,
      name: input.name,
      code: input.code.toUpperCase(),
      address: input.address,
      coordinates: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
      geofenceRadiusMeters: input.geofenceRadiusMeters,
      networkPolicy: {
        requireNetworkMatch: input.requireNetworkMatch,
        allowedSsidPrefixes: input.allowedSsidPrefixes,
        allowedIpRanges: ['10.180.0.0/16'],
        description: input.requireNetworkMatch
          ? `Strict Wi-Fi subnet match required (${input.allowedSsidPrefixes.join(', ')})`
          : 'Geofence-only; network verification optional',
      },
      offlinePolicy: {
        allowOfflineAttendance: input.allowOfflineAttendance,
        maxOfflineHours: input.maxOfflineHours,
        requireReviewThresholdHours: input.requireReviewThresholdHours,
        description: `Max ${input.maxOfflineHours}h offline buffer with review after ${input.requireReviewThresholdHours}h.`,
      },
      status: input.status,
      activeEmployeeCount: 0,
      createdAt: new Date().toISOString(),
    };

    return mockStore.addFacility(newFacility);
  }

  async updateFacility(id: string, input: Partial<CreateFacilityInput>): Promise<Facility | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.put<Facility>(API_ENDPOINTS.FACILITIES.UPDATE(id), input);
    }
    const existing = mockStore.getFacilityById(id);
    if (!existing) return undefined;

    const updates: Partial<Facility> = {
      ...(input.name ? { name: input.name } : {}),
      ...(input.code ? { code: input.code.toUpperCase() } : {}),
      ...(input.address ? { address: input.address } : {}),
      ...(input.geofenceRadiusMeters ? { geofenceRadiusMeters: input.geofenceRadiusMeters } : {}),
      ...(input.status ? { status: input.status } : {}),
    };

    if (input.latitude !== undefined && input.longitude !== undefined) {
      updates.coordinates = {
        latitude: input.latitude,
        longitude: input.longitude,
      };
    }

    if (input.requireNetworkMatch !== undefined || input.allowedSsidPrefixes) {
      updates.networkPolicy = {
        ...existing.networkPolicy,
        requireNetworkMatch: input.requireNetworkMatch ?? existing.networkPolicy.requireNetworkMatch,
        allowedSsidPrefixes: input.allowedSsidPrefixes ?? existing.networkPolicy.allowedSsidPrefixes,
      };
    }

    if (input.allowOfflineAttendance !== undefined || input.maxOfflineHours !== undefined) {
      updates.offlinePolicy = {
        ...existing.offlinePolicy,
        allowOfflineAttendance: input.allowOfflineAttendance ?? existing.offlinePolicy.allowOfflineAttendance,
        maxOfflineHours: input.maxOfflineHours ?? existing.offlinePolicy.maxOfflineHours,
        requireReviewThresholdHours: input.requireReviewThresholdHours ?? existing.offlinePolicy.requireReviewThresholdHours,
      };
    }

    return mockStore.updateFacility(id, updates);
  }
}

export const facilityService = new FacilityService();
