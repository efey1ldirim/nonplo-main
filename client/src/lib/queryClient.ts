import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Create a default fetch function for TanStack Query with AbortController support
const defaultQueryFn = async ({ queryKey, signal }: { queryKey: readonly unknown[]; signal?: AbortSignal }) => {
  const url = queryKey[0] as string;
  
  try {
    // Get current session to include auth token for queries
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    console.log(`🔄 API Call to: ${url}`, { hasToken: !!token, tokenPreview: token ? `${token.substring(0, 20)}...` : null });
    
    const headers: Record<string, string> = {};
    
    // Add Authorization header if user is authenticated
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Using auth token for query:', `${token.substring(0, 20)}...`);
      console.log('🔐 Full token length:', token.length);
    } else {
      console.log('❌ No auth token available for query');
      // Don't fall back to test token anymore - require real authentication for protected routes
      if (url.includes('/api/wizard') || url.includes('/api/agents') || url.includes('/api/chat') || url.includes('/api/context-manager')) {
        throw new Error('Authentication required - please log in');
      }
    }
    
    const res = await fetch(url, {
      credentials: 'include',
      headers,
      signal, // Include abort signal for proper cancellation
    });
    
    console.log(`📡 API Response from ${url}:`, { status: res.status, ok: res.ok });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ API Error ${res.status}:`, errorText);
      throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    console.log(`✅ API Success ${url}:`, data);
    return data;
    
  } catch (error: any) {
    // Handle fetch abort errors gracefully (expected during navigation/unmount)
    if (error.name === 'AbortError' || signal?.aborted) {
      console.log(`🔄 Fetch request to ${url} was aborted (expected behavior)`);
      throw error; // Re-throw so React Query can handle it properly
    }
    
    // Handle "Fetch is aborted" DOMException errors
    if (error instanceof DOMException && error.message?.includes('aborted')) {
      console.log(`🔄 Fetch request to ${url} was aborted by browser (expected behavior)`);
      throw error;
    }
    
    // Handle network errors
    if (error.message?.includes('Failed to fetch') || error.name === 'NetworkError') {
      console.warn(`📡 Network error for ${url}:`, error.message);
      throw new Error(`Network error: ${error.message}`);
    }
    
    // Re-throw other errors
    console.error(`🚨 Unexpected error in queryFn for ${url}:`, error);
    throw error;
  }
};

// Create the query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// API request function for mutations with improved error handling
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    // Get current session to include auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if user is authenticated
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Using auth token for mutation:', token ? `${token.substring(0, 20)}...` : 'none');
      console.log('🔐 Full token length:', token.length);
    } else {
      console.log('❌ No auth token available for mutation');
      // Don't fall back to test token anymore - require real authentication
      throw new Error('Authentication required - please log in');
    }

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...(options.headers instanceof Headers
          ? Object.fromEntries(options.headers.entries())
          : (options.headers as Record<string, string> | undefined)),
      },
    };

    // Auto-stringify body if Content-Type is application/json and body is an object
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      const headers = config.headers as Record<string, string>;
      const contentType = headers?.['Content-Type'] || headers?.['content-type'];
      if (contentType === 'application/json') {
        config.body = JSON.stringify(options.body);
      }
    }

    const res = await fetch(url, config);
    
    if (!res.ok) {
      const errorText = await res.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      } catch (parseError) {
        throw new Error(errorText || `HTTP error! status: ${res.status}`);
      }
    }

    return res.json();
    
  } catch (error: any) {
    // Handle fetch abort errors gracefully (expected during navigation/unmount)
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      console.log(`🔄 Mutation request to ${url} was aborted (expected behavior)`);
      throw error; // Re-throw so the mutation can handle it properly
    }
    
    // Handle "Fetch is aborted" DOMException errors
    if (error instanceof DOMException && error.message?.includes('aborted')) {
      console.log(`🔄 Mutation request to ${url} was aborted by browser (expected behavior)`);
      throw error;
    }
    
    // Handle network errors
    if (error.message?.includes('Failed to fetch') || error.name === 'NetworkError') {
      console.warn(`📡 Network error for mutation ${url}:`, error.message);
      throw new Error(`Network error: ${error.message}`);
    }
    
    // Re-throw other errors
    console.error(`🚨 Unexpected error in mutation for ${url}:`, error);
    throw error;
  }
};