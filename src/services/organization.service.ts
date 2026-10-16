import {
  Organization,
  RegisterOrganizationDto,
  RegistrationResult,
  VerifyEmailDto,
  SetupOrganizationDto,
} from '@/types/organization';
import { User } from '@/types/user';
import { Facility } from '@/types/facility';
import { Shift } from '@/types/shift';
import { mockStore } from '@/mocks';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

class OrganizationService {
  /**
   * Register a new organization and provision the initial administrator.
   */
  async register(dto: RegisterOrganizationDto): Promise<RegistrationResult> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<RegistrationResult>(API_ENDPOINTS.ORGANIZATION.REGISTER, dto);
    }

    // Mock Mode Implementation
    await new Promise((r) => setTimeout(r, 600));

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new Error('Please enter a valid official email address.');
    }

    // Password validation (min 8 chars, uppercase, lowercase, digit)
    if (!dto.password || dto.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (dto.password !== dto.confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (!dto.termsAccepted) {
      throw new Error('You must accept the terms of service and privacy notice to continue.');
    }

    // Duplicate checks
    const existingEmail = mockStore.getOrganizationByEmail(dto.email);
    if (existingEmail) {
      throw new Error('An organization is already registered with this email address.');
    }

    const existingName = mockStore.getOrganizationByName(dto.legalName);
    if (existingName) {
      throw new Error('An organization with this registered name already exists.');
    }

    const orgId = `org-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const slug = (dto.displayName || dto.legalName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newOrg: Organization = {
      id: orgId,
      name: dto.legalName.trim(),
      displayName: (dto.displayName || dto.legalName).trim(),
      slug,
      email: dto.email.trim().toLowerCase(),
      phone: dto.contactPhone.trim(),
      status: 'pending_verification',
      tier: 'starter',
      initialAdminEmail: dto.email.trim().toLowerCase(),
      initialAdminName: dto.contactPersonName.trim(),
      isEmailVerified: false,
      setupCompleted: false,
      setupStep: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        requireBiometricLiveness: true,
        requireGeofence: true,
        allowOfflineAttendance: true,
        maxOfflineHours: 48,
        autoSyncIntervalMinutes: 5,
      },
    };

    mockStore.addOrganization(newOrg);

    // Generate server-issued single-use verification token (15m expiry)
    const verificationToken = `token_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    mockStore.storeVerificationToken(verificationToken, dto.email, orgId, 15 * 60 * 1000);

    // Initial administrator is securely created in pending state
    const adminUser: User = {
      id: `user-admin-${Date.now().toString(36)}`,
      organizationId: orgId,
      organizationName: newOrg.displayName,
      employeeId: `ADM-001`,
      name: dto.contactPersonName.trim(),
      email: dto.email.trim().toLowerCase(),
      role: 'org_admin',
      departmentId: 'dept-admin',
      departmentName: 'Executive Administration',
      assignedFacilityId: 'fac-pending',
      assignedFacilityName: 'Pending Facility Setup',
      phone: dto.contactPhone.trim(),
      isActive: true,
      biometricStatus: 'pending',
      joinedDate: new Date().toISOString().split('T')[0],
    };
    mockStore.addUser(adminUser);

    return {
      organizationId: orgId,
      organizationName: newOrg.displayName,
      adminEmail: newOrg.email,
      verificationTokenIssued: true,
      status: 'pending_verification',
      message: `Registration initiated. A verification token has been issued to ${newOrg.email}.`,
    };
  }

  /**
   * Verify organization email with server-issued token.
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<{ success: boolean; organization: Organization; message: string }> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<{ success: boolean; organization: Organization; message: string }>(
        API_ENDPOINTS.ORGANIZATION.VERIFY_EMAIL,
        dto
      );
    }

    await new Promise((r) => setTimeout(r, 500));

    if (!dto.token || dto.token.trim().length === 0) {
      throw new Error('Verification token is required.');
    }

    const verification = mockStore.verifyToken(dto.token.trim());
    if (!verification) {
      throw new Error('Invalid or expired verification token. Please request a new verification code.');
    }

    const org = mockStore.getOrganizationById(verification.orgId);
    if (!org) {
      throw new Error('Associated organization record not found.');
    }

    const updated = mockStore.updateOrganization(org.id, {
      isEmailVerified: true,
      status: 'active',
      setupStep: 2,
    });

    if (!updated) {
      throw new Error('Failed to update organization status.');
    }

    mockStore.addAuditLog({
      actorId: org.initialAdminEmail,
      actorName: org.initialAdminName,
      actorRole: 'Organization Administrator',
      action: 'email_verified',
      affectedResource: `Organization ${org.name}`,
      resourceId: org.id,
      details: 'Email ownership verified successfully via token.',
      outcome: 'success',
    });

    return {
      success: true,
      organization: updated,
      message: 'Email address verified successfully. You may now complete organization onboarding.',
    };
  }

  /**
   * Resend a verification token.
   */
  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.ORGANIZATION.RESEND_VERIFICATION,
        { email }
      );
    }

    await new Promise((r) => setTimeout(r, 400));
    const org = mockStore.getOrganizationByEmail(email);
    if (!org) {
      // Security standard: do not reveal whether email exists
      return {
        success: true,
        message: 'If an organization is registered with this email, a new verification link has been sent.',
      };
    }

    const token = `token_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    mockStore.storeVerificationToken(token, org.email, org.id, 15 * 60 * 1000);

    return {
      success: true,
      message: `A new single-use verification token has been issued for ${org.email}.`,
    };
  }

  /**
   * Retrieve active organization by ID.
   */
  async getOrganization(id: string): Promise<Organization | null> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<Organization>(API_ENDPOINTS.ORGANIZATION.CURRENT);
    }
    const org = mockStore.getOrganizationById(id);
    return org || null;
  }

  /**
   * Retrieve all organizations (for platform administration).
   */
  async getOrganizations(): Promise<Organization[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<Organization[]>('/organizations');
    }
    return mockStore.getOrganizations();
  }

  /**
   * Complete the guided setup wizard for an organization.
   */
  async completeSetup(dto: SetupOrganizationDto): Promise<Organization> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<Organization>(API_ENDPOINTS.ORGANIZATION.SETUP, dto);
    }

    await new Promise((r) => setTimeout(r, 700));

    const org = mockStore.getOrganizationById(dto.organizationId);
    if (!org) {
      throw new Error('Organization not found.');
    }

    // 1. Create first facility
    const facilityId = `fac-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newFacility: Facility = {
      id: facilityId,
      organizationId: org.id,
      name: dto.facilityName.trim(),
      code: `FAC-${Math.floor(100 + Math.random() * 900)}`,
      address: dto.facilityAddress.trim(),
      coordinates: {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      geofenceRadiusMeters: dto.geofenceRadiusMeters || 150,
      networkPolicy: {
        requireNetworkMatch: false,
        allowedSsidPrefixes: ['Facility_WiFi', 'Corporate_Secure'],
        allowedIpRanges: ['10.0.0.0/16', '192.168.1.0/24'],
        description: 'Default network verification policy configured during organization onboarding.',
      },
      offlinePolicy: {
        allowOfflineAttendance: dto.allowOffline,
        maxOfflineHours: 72,
        requireReviewThresholdHours: 24,
        description: 'Offline queueing permitted with supervisor reconciliation.',
      },
      status: 'active',
      activeEmployeeCount: 1,
      createdAt: new Date().toISOString(),
    };
    mockStore.addFacility(newFacility);

    // 2. Create initial shift
    const shiftId = `shift-${Date.now().toString(36)}`;
    const newShift: Shift = {
      id: shiftId,
      organizationId: org.id,
      name: dto.shiftName.trim(),
      code: `SH-${Math.floor(10 + Math.random() * 90)}`,
      startTime: dto.shiftStartTime || '09:00',
      endTime: dto.shiftEndTime || '17:00',
      gracePeriodMinutes: dto.gracePeriodMinutes || 15,
      assignedFacilityId: facilityId,
      assignedFacilityName: newFacility.name,
      assignedDays: dto.shiftDays && dto.shiftDays.length > 0 ? dto.shiftDays : [1, 2, 3, 4, 5],
      isActive: true,
      employeeCount: 1,
    };
    mockStore.addShift(newShift);

    // 3. Update initial administrator facility assignment
    const adminUser = mockStore.getUsers().find((u) => u.email === org.initialAdminEmail);
    if (adminUser) {
      mockStore.updateUser(adminUser.id, {
        assignedFacilityId: facilityId,
        assignedFacilityName: newFacility.name,
      });
    }

    // 4. Create initial invited employees if any
    if (dto.initialEmployees && dto.initialEmployees.length > 0) {
      dto.initialEmployees.forEach((emp, i) => {
        const empUser: User = {
          id: `user-emp-${Date.now().toString(36)}-${i}`,
          organizationId: org.id,
          organizationName: org.displayName,
          employeeId: `EMP-${Math.floor(2000 + Math.random() * 8000)}`,
          name: emp.name.trim(),
          email: emp.email.trim().toLowerCase(),
          role: emp.role,
          departmentId: `dept-${i + 1}`,
          departmentName: emp.departmentName.trim() || 'General Operations',
          assignedFacilityId: facilityId,
          assignedFacilityName: newFacility.name,
          isActive: true,
          biometricStatus: 'pending',
          joinedDate: new Date().toISOString().split('T')[0],
        };
        mockStore.addUser(empUser);
      });
    }

    // 5. Update organization setup status
    const updated = mockStore.updateOrganization(org.id, {
      displayName: dto.displayName || org.displayName,
      setupCompleted: true,
      setupStep: 7,
      settings: {
        ...org.settings,
        timezone: dto.timezone || org.settings.timezone,
        requireBiometricLiveness: dto.requireBiometrics,
        requireGeofence: true,
        allowOfflineAttendance: dto.allowOffline,
      },
    });

    mockStore.addAuditLog({
      actorId: org.initialAdminEmail,
      actorName: org.initialAdminName,
      actorRole: 'Organization Administrator',
      action: 'organization_setup_completed',
      affectedResource: `Organization ${org.name}`,
      resourceId: org.id,
      details: `Completed setup wizard: initial facility "${newFacility.name}", shift "${newShift.name}".`,
      outcome: 'success',
    });

    return updated!;
  }

  /**
   * Demo mode helper: retrieve pending verification token for a registered email.
   */
  getDemoVerificationToken(email: string): string | null {
    if (!IS_MOCK_ENABLED) return null;
    return mockStore.getPendingTokenForEmail(email);
  }
}

export const organizationService = new OrganizationService();
