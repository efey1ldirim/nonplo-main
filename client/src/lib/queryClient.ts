import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Create a default fetch function for TanStack Query
const defaultQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const url = queryKey[0] as string;
  
  // Get current session to include auth token for queries
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  console.log(`🔄 API Call to: ${url}`, { hasToken: !!token, tokenPreview: token ? `${token.substring(0, 20)}...` : null });
  
  const headers: Record<string, string> = {};
  
  // Add Authorization header if user is authenticated
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('🔐 Using auth token for query:', `${token.substring(0, 20)}...`);
  } else {
    // Fallback to test token in development
    if (process.env.NODE_ENV === 'development' || window.location.hostname.includes('replit')) {
      headers['Authorization'] = 'Bearer test-token';
      console.log('🔐 Using test token for query');
    }
  }
  
  const res = await fetch(url, {
    credentials: 'include',
    headers,
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

// API request function for mutations
export const apiRequest = async (url: string, options: RequestInit = {}) => {
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
  } else {
    // Fallback to test token in development
    if (process.env.NODE_ENV === 'development' || window.location.hostname.includes('replit')) {
      defaultHeaders['Authorization'] = 'Bearer test-token';
      console.log('🔐 Using test token for mutation');
    }
  }

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    ...options,
  };

  // Auto-stringify body if Content-Type is application/json and body is an object
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    const contentType = config.headers?.['Content-Type'] || config.headers?.['content-type'];
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
};