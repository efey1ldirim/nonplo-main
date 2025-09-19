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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
        }
      } catch (error) {
        console.error('Error getting Supabase session:', error);
      }
    }

    return headers;
  }

  static async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...requestOptions } = options;
    
    try {
      const headers = await this.getHeaders(skipAuth);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...requestOptions,
        headers: {
          ...headers,
          ...requestOptions.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        } catch (parseError) {
          throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error - please check your connection');
        }
      }
      throw error;
    }
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