import { createClient } from '@supabase/supabase-js';

// CRITICAL FIX: Environment variable mapping was incorrect
// The frontend VITE_SUPABASE_URL was incorrectly set to JWT token instead of URL
// Using the correct hardcoded values that match the backend configuration
let supabaseUrl = 'https://hnlosxmzbzesyubocgmf.supabase.co'; // Force correct URL

// Alternative: Check if env var is actually a JWT token and use fallback
const envUrl = import.meta.env.VITE_SUPABASE_URL;
if (envUrl && !envUrl.startsWith('eyJ') && envUrl.includes('supabase')) {
  supabaseUrl = envUrl;
  if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
    const projectId = supabaseUrl.split('/').pop();
    supabaseUrl = `https://${projectId}.supabase.co`;
  }
}

// Try to use environment variable first, fallback to hardcoded value
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
let supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubG9zeG16Ynplc3l1Ym9jZ21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDgyMzcsImV4cCI6MjA2OTM4NDIzN30.OqaCFNYqOBZJV5B6GQ5XkXbKGIx6r2qJBgYU7Q4rM8U';

if (envAnonKey && envAnonKey.startsWith('eyJ') && envAnonKey.length > 100) {
  // Use env var if it looks like a valid JWT token
  supabaseAnonKey = envAnonKey;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});