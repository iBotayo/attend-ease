import { ApiError } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, string[]>;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.details = error.details;
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token =
      sessionStorage.getItem('attend_ease_auth_token') ||
      localStorage.getItem('attend_ease_auth_token');
    const orgId =
      sessionStorage.getItem('attend_ease_org_id') ||
      localStorage.getItem('attend_ease_org_id');

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (orgId) {
      headers['X-Organization-Id'] = orgId;
    }
    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...rest } = options;
    const url = this.buildUrl(path, params);

    const mergedHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...headers,
    };

    try {
      const response = await fetch(url, {
        ...rest,
        headers: mergedHeaders,
      });

      if (!response.ok) {
        let errData: ApiError;
        try {
          errData = await response.json();
        } catch {
          errData = {
            code: 'HTTP_ERROR',
            message: `Request failed with status ${response.status}`,
            timestamp: new Date().toISOString(),
          };
        }
        throw new ApiClientError(response.status, errData);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof ApiClientError) throw err;
      throw new ApiClientError(0, {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'A network error occurred. Please check your connection.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(BASE_URL);
