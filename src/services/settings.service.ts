import { SystemSettings, MOCK_SYSTEM_SETTINGS } from '@/mocks/settings';
import { mockStore } from '@/mocks';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

class SettingsService {
  async getSettings(): Promise<SystemSettings> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<SystemSettings>(API_ENDPOINTS.SETTINGS.GET);
    }
    return mockStore.getSettings();
  }

  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.put<SystemSettings>(API_ENDPOINTS.SETTINGS.UPDATE, updates);
    }
    return mockStore.updateSettings(updates);
  }

  async resetToDefaults(): Promise<SystemSettings> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.put<SystemSettings>(API_ENDPOINTS.SETTINGS.UPDATE, { ...MOCK_SYSTEM_SETTINGS });
    }
    return mockStore.updateSettings({ ...MOCK_SYSTEM_SETTINGS });
  }
}

export const settingsService = new SettingsService();
