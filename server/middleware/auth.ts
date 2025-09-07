import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';

// Fix dashboard URL to API URL format
let supabaseUrl = process.env.SUPABASE_URL || 'https://hnlosxmzbzesyubocgmf.supabase.co';
if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
  const projectId = supabaseUrl.split('/').pop();
  supabaseUrl = `https://${projectId}.supabase.co`;
}
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubG9zeG16Ynplc3l1Ym9jZ21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDgyMzcsImV4cCI6MjA2OTM4NDIzN30.OqaCFNYqOBZJV5B6GQ5XkXbKGIx6r2qJBgYU7Q4rM8U';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';




// Use anon key for user authentication validation
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key for admin operations
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Export the working supabase client for use in other modules
export { supabase, adminClient };

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

/**
 * Authentication middleware using Supabase JWT
 * Validates Bearer token and attaches user info to request
 */
export const authenticate = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      return res.status(401).json({ 
        error: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Allow test token in development mode
    if (token === 'test-token' && process.env.NODE_ENV === 'development') {
      req.user = {
        id: 'd59a0ba4-c16e-49c5-8e10-54e6f6d15d1f', // Use actual user ID
        email: 'test@example.com',
        role: 'free'
      };
      
      // Check for scheduled deletion auto-cancel even for test tokens
      try {
        console.log(`Checking scheduled deletion for test user ${req.user.id}`);
        const scheduledDeletion = await storage.getScheduledDeletion(req.user.id);
        console.log(`Found scheduled deletion:`, scheduledDeletion);
        if (scheduledDeletion && scheduledDeletion.status === 'scheduled') {
          console.log(`Cancelling scheduled deletion for test user ${req.user.id}`);
          const result = await storage.cancelAccountDeletion(req.user.id);
          console.log(`Cancellation result:`, result);
          if (result) {
            console.log(`Auto-cancelled scheduled deletion for test user ${req.user.id} on login`);
            
            // Set session flag for one-time notification
            (req as any).session = (req as any).session || {};
            (req as any).session.deletionCancelled = true;
          }
        }
      } catch (error) {
        console.error('Failed to auto-cancel scheduled deletion for test user:', error);
      }
      
      return next();
    }

    // Validate token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: authError?.message 
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'free'
    };

    // Check if user has a scheduled deletion and auto-cancel it on login
    try {
      const scheduledDeletion = await storage.getScheduledDeletion(user.id);
      if (scheduledDeletion && scheduledDeletion.status === 'scheduled') {
        await storage.cancelAccountDeletion(user.id);
        console.log(`Auto-cancelled scheduled deletion for user ${user.id} on login`);
        
        // Set session flag for one-time notification
        (req as any).session = (req as any).session || {};
        (req as any).session.deletionCancelled = true;
      }
    } catch (error) {
      // Don't block authentication if deletion cancellation fails
      console.error('Failed to auto-cancel scheduled deletion:', error);
    }

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Internal authentication error' 
    });
  }
};

/**
 * Optional authentication middleware - allows both authenticated and anonymous access
 */
export const optionalAuth = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'free'
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if authentication fails
    next();
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role || 'free';
    const roleHierarchy = ['free', 'premium', 'enterprise'];
    
    const requiredLevel = roleHierarchy.indexOf(requiredRole);
    const userLevel = roleHierarchy.indexOf(userRole);

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredRole,
        current: userRole
      });
    }

    next();
  };
};

/**
 * Extract user ID from legacy userId query parameter or authenticated user
 * For backwards compatibility during migration
 */
export const getUserId = (req: AuthenticatedRequest): string | null => {
  // Priority 1: Authenticated user ID
  if (req.user?.id) {
    return req.user.id;
  }
  
  // Priority 2: Legacy userId parameter (for backwards compatibility)
  const legacyUserId = req.query.userId as string || req.body.userId as string;
  if (legacyUserId && legacyUserId !== 'undefined') {
    return legacyUserId;
  }
  
  return null;
};