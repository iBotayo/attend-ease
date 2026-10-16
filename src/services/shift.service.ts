import { Shift } from '@/types/shift';
import { mockStore } from '@/mocks';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

export interface CreateShiftInput {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  assignedFacilityId?: string;
  assignedFacilityName?: string;
  assignedDays: number[];
  isActive: boolean;
}

class ShiftService {
  async getShifts(): Promise<Shift[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<Shift[]>(API_ENDPOINTS.SHIFTS.LIST);
    }
    return mockStore.getShifts();
  }

  async getShiftById(id: string): Promise<Shift | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<Shift>(`/shifts/${id}`);
    }
    const shifts = mockStore.getShifts();
    return shifts.find((s) => s.id === id);
  }

  async createShift(input: CreateShiftInput): Promise<Shift> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<Shift>(API_ENDPOINTS.SHIFTS.CREATE, input);
    }
    const newShift: Shift = {
      id: `shift-${Date.now().toString().slice(-4)}`,
      ...input,
      employeeCount: 0,
    };
    return mockStore.addShift(newShift);
  }

  async updateShift(id: string, updates: Partial<Shift>): Promise<Shift | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.put<Shift>(API_ENDPOINTS.SHIFTS.UPDATE(id), updates);
    }
    return mockStore.updateShift(id, updates);
  }

  async toggleShiftStatus(id: string): Promise<Shift | undefined> {
    const shift = await this.getShiftById(id);
    if (!shift) return undefined;
    return this.updateShift(id, { isActive: !shift.isActive });
  }
}

export const shiftService = new ShiftService();
