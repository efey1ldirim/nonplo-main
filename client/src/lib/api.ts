// API client with Supabase JWT integration
import { supabase } from './supabase';

const API_BASE = '/api';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Enhanced API client with Supabase JWT token integration
 * Automatically includes Bearer token from Supabase session
 */
export class ApiClient {
  private static async getHeaders(skipAuth = false): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    return headers;
  }

  static async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...requestOptions } = options;
    
    const headers = await this.getHeaders(skipAuth);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...requestOptions,
      headers: {
        ...headers,
        ...requestOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  static async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static async post<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Convenience exports for common operations
export const api = ApiClient;
export default ApiClient;