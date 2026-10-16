import { RegisteredDevice } from '@/types/device';
import { mockStore } from '@/mocks';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

class DeviceService {
  async getDevices(): Promise<RegisteredDevice[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<RegisteredDevice[]>(API_ENDPOINTS.DEVICES.LIST);
    }
    return mockStore.getDevices();
  }

  async revokeDevice(id: string): Promise<{ success: boolean; device?: RegisteredDevice; message: string }> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<{ success: boolean; device?: RegisteredDevice; message: string }>(
        API_ENDPOINTS.DEVICES.REVOKE(id)
      );
    }

    const revoked = mockStore.revokeDevice(id);
    if (!revoked) {
      return { success: false, message: 'Device not found.' };
    }
    return {
      success: true,
      device: revoked,
      message: `[Simulated Action] Device certificate for "${revoked.name}" marked as revoked in development mock store. Note: Actual cryptographic hardware revocation requires live backend authentication services.`,
    };
  }
}

export const deviceService = new DeviceService();
