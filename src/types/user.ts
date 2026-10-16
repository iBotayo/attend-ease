export type UserRole = 'employee' | 'supervisor' | 'facility_admin' | 'system_admin' | 'org_admin';

export type BiometricEnrollmentStatus = 'enrolled' | 'pending' | 'failed' | 'not_enrolled';

export interface User {
  id: string;
  organizationId?: string;
  organizationName?: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string;
  departmentName: string;
  assignedFacilityId: string;
  assignedFacilityName: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  biometricStatus: BiometricEnrollmentStatus;
  enrolledAt?: string;
  joinedDate: string;
}

export interface Department {
  id: string;
  organizationId?: string;
  name: string;
  code: string;
  employeeCount: number;
}
