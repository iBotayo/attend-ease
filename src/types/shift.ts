export interface Shift {
  id: string;
  organizationId?: string;
  name: string;
  code: string;
  startTime: string; // HH:mm format, e.g. "09:00"
  endTime: string;   // HH:mm format, e.g. "17:00"
  gracePeriodMinutes: number; // e.g. 15 mins
  assignedFacilityId?: string;
  assignedFacilityName?: string;
  assignedDays: number[]; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  isActive: boolean;
  employeeCount: number;
}
