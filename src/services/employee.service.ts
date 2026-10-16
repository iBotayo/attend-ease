import { User, Department } from '@/types/user';
import { mockStore, MOCK_DEPARTMENTS } from '@/mocks';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const IS_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCK_API !== 'false';

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone?: string;
  role: User['role'];
  departmentId: string;
  assignedFacilityId: string;
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  isActive?: boolean;
  biometricStatus?: User['biometricStatus'];
}

class EmployeeService {
  async getEmployees(filters?: {
    search?: string;
    departmentId?: string;
    facilityId?: string;
    role?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<User[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<User[]>(API_ENDPOINTS.EMPLOYEES.LIST, filters);
    }

    let users = mockStore.getUsers();

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q)
      );
    }
    if (filters?.departmentId && filters.departmentId !== 'all') {
      users = users.filter((u) => u.departmentId === filters.departmentId);
    }
    if (filters?.facilityId && filters.facilityId !== 'all') {
      users = users.filter((u) => u.assignedFacilityId === filters.facilityId);
    }
    if (filters?.role && filters.role !== 'all') {
      users = users.filter((u) => u.role === filters.role);
    }
    if (filters?.status && filters.status !== 'all') {
      users = users.filter((u) => (filters.status === 'active' ? u.isActive : !u.isActive));
    }

    return users;
  }

  async getEmployeeById(id: string): Promise<User | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<User>(API_ENDPOINTS.EMPLOYEES.DETAILS(id));
    }
    return mockStore.getUserById(id);
  }

  async getDepartments(): Promise<Department[]> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.get<Department[]>('/departments');
    }
    return [...MOCK_DEPARTMENTS];
  }

  async createEmployee(input: CreateEmployeeInput): Promise<User> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<User>(API_ENDPOINTS.EMPLOYEES.CREATE, input);
    }

    const facilities = mockStore.getFacilities();
    const facility = facilities.find((f) => f.id === input.assignedFacilityId);
    const department = MOCK_DEPARTMENTS.find((d) => d.id === input.departmentId);

    const newId = `user-emp-${Date.now().toString().slice(-4)}`;
    const nextCodeNum = 1000 + mockStore.getUsers().length + 1;
    const employeeCode = `EMP-${nextCodeNum}`;

    const newEmployee: User = {
      id: newId,
      employeeId: employeeCode,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      departmentId: input.departmentId,
      departmentName: department?.name || 'General Staff',
      assignedFacilityId: input.assignedFacilityId,
      assignedFacilityName: facility?.name || 'Metropolitan Medical Center - Main Campus',
      isActive: true,
      biometricStatus: 'pending',
      joinedDate: new Date().toISOString().split('T')[0],
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    };

    return mockStore.addUser(newEmployee);
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<User | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.put<User>(API_ENDPOINTS.EMPLOYEES.UPDATE(id), input);
    }

    const updates: Partial<User> = { ...input };
    if (input.departmentId) {
      const dept = MOCK_DEPARTMENTS.find((d) => d.id === input.departmentId);
      if (dept) updates.departmentName = dept.name;
    }
    if (input.assignedFacilityId) {
      const fac = mockStore.getFacilityById(input.assignedFacilityId);
      if (fac) updates.assignedFacilityName = fac.name;
    }
    return mockStore.updateUser(id, updates);
  }

  async toggleEmployeeStatus(id: string): Promise<User | undefined> {
    if (!IS_MOCK_ENABLED) {
      return apiClient.post<User>(API_ENDPOINTS.EMPLOYEES.TOGGLE_STATUS(id));
    }
    return mockStore.toggleUserStatus(id);
  }
}

export const employeeService = new EmployeeService();
