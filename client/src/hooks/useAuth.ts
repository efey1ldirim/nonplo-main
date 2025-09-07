// Unified auth system using Supabase Auth
// Replaces mock authentication with real Supabase integration

import { useSupabaseAuth } from './useSupabaseAuth';

export const useAuth = () => {
  const auth = useSupabaseAuth();
  
  return {
    user: auth.user ? {
      id: auth.user.id,
      email: auth.user.email || '',
      name: auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || ''
    } : null,
    login: auth.signIn,
    logout: auth.signOut,
    isLoading: auth.loading,
    // Supabase-specific methods
    session: auth.session,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut
  };
};