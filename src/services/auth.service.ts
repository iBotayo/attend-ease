import { User } from '@/types/user';
import { mockStore } from '@/mocks';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { validatePasswordStrength } from '@/lib/utils/password';

export interface LoginCredentials {
  identifier: string; // email or employeeId
  password?: string;
  rememberMe?: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

const STORAGE_KEY = 'attend_ease_current_user';
const TOKEN_KEY = 'attend_ease_auth_token';

class AuthService {
  get isMockMode(): boolean {
    return process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const cleanId = credentials.identifier.trim();
    if (!cleanId) {
      throw new Error('Please enter your Employee ID or Work Email.');
    }
    if (!credentials.password || credentials.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Live Backend API Mode
    if (!this.isMockMode) {
      const session = await apiClient.post<AuthSession>(API_ENDPOINTS.AUTH.LOGIN, {
        identifier: cleanId,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      });

      if (typeof window !== 'undefined') {
        const storage = credentials.rememberMe ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(session.user));
        storage.setItem(TOKEN_KEY, session.token);
      }

      return session;
    }

    // Mock Mode Execution
    await new Promise((r) => setTimeout(r, 400));

    const lowerId = cleanId.toLowerCase();
    const users = mockStore.getUsers();
    
    // Find user by email or employee ID
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === lowerId ||
        u.employeeId.toLowerCase() === lowerId
    );

    if (!user) {
      throw new Error('Invalid credentials. Check your employee ID or email.');
    }

    if (!user.isActive) {
      throw new Error('This account has been deactivated. Please contact your facility administrator.');
    }

    const session: AuthSession = {
      user,
      token: `mock_jwt_token_${user.id}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    };

    if (typeof window !== 'undefined') {
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, JSON.stringify(user));
      storage.setItem(TOKEN_KEY, session.token);
    }

    mockStore.addAuditLog({
      actorId: user.employeeId,
      actorName: user.name,
      actorRole: user.role,
      action: 'user_login',
      affectedResource: 'Authentication Session',
      details: 'User authenticated successfully via credentials.',
      outcome: 'success',
    });

    return session;
  }

  async logout(): Promise<void> {
    const user = this.getCurrentUser();
    
    if (!this.isMockMode) {
      try {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      } catch {
        // Silently continue client-side cleanup if backend logout fails
      }
    } else if (user) {
      mockStore.addAuditLog({
        actorId: user.employeeId,
        actorName: user.name,
        actorRole: user.role,
        action: 'user_logout',
        affectedResource: 'Authentication Session',
        details: 'User session terminated.',
        outcome: 'success',
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  /**
   * Returns current authenticated user or null.
   * NEVER silently falls back to a default user when unauthenticated!
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  }

  setCurrentUser(user: User): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }

  /** Updates the stored user in whichever storage holds the session (remember-me uses localStorage). */
  private persistUser(user: User): void {
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(user);
    if (localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, serialized);
    if (sessionStorage.getItem(STORAGE_KEY) || !localStorage.getItem(STORAGE_KEY)) {
      sessionStorage.setItem(STORAGE_KEY, serialized);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<User> {
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required.');
    }
    if (newPassword === currentPassword) {
      throw new Error('New password must be different from your current password.');
    }
    const policyError = validatePasswordStrength(newPassword);
    if (policyError) {
      throw new Error(policyError);
    }

    const current = this.getCurrentUser();
    if (!current) {
      throw new Error('You must be signed in to change your password.');
    }

    if (!this.isMockMode) {
      const res = await apiClient.post<{ user: User }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword,
      });
      const updated = { ...current, ...res.user, mustChangePassword: false };
      this.persistUser(updated);
      return updated;
    }

    // Mock mode keeps no passwords, so only the flag changes.
    await new Promise((r) => setTimeout(r, 400));
    const updated = { ...current, mustChangePassword: false };
    this.persistUser(updated);
    return updated;
  }

  async requestPasswordReset(identifier: string): Promise<{ success: boolean; message: string }> {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error('Please provide an email or Employee ID.');
    }

    if (!this.isMockMode) {
      return apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { identifier: cleanId }
      );
    }

    await new Promise((r) => setTimeout(r, 600));
    const lowerId = cleanId.toLowerCase();
    const user = mockStore
      .getUsers()
      .find((u) => u.email.toLowerCase() === lowerId || u.employeeId.toLowerCase() === lowerId);

    if (!user) {
      // For security in real auth, standard message is shown regardless
      return {
        success: true,
        message: 'If an account exists with this identifier, password recovery instructions have been dispatched.',
      };
    }

    return {
      success: true,
      message: `Password reset instructions have been simulated for ${user.email}. In a production deployment, a secure one-time link will be emailed.`,
    };
  }
}

export const authService = new AuthService();
