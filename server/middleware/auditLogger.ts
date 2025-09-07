import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from './auth';

// Fix dashboard URL to API URL format
let supabaseUrl = process.env.SUPABASE_URL || 'https://hnlosxmzbzesyubocgmf.supabase.co';
if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
  const projectId = supabaseUrl.split('/').pop();
  supabaseUrl = `https://${projectId}.supabase.co`;
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent?: string;
  request_data?: Record<string, any>;
  response_status: number;
  timestamp: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

class AuditLogger {
  private isEnabled = process.env.NODE_ENV === 'production';
  
  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.isEnabled) {
      console.log('Audit Log:', entry);
      return;
    }

    try {
      await supabase
        .from('audit_logs')
        .insert({
          ...entry,
          timestamp: entry.timestamp || new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // High-level audit log methods
  async logUserAction(
    userId: string,
    userEmail: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress: string = 'unknown'
  ) {
    await this.log({
      user_id: userId,
      user_email: userEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      response_status: 200,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  async logSecurityEvent(
    action: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent?: string
  ) {
    await this.log({
      action: `SECURITY_${action}`,
      resource_type: 'security',
      ip_address: ipAddress,
      user_agent: userAgent,
      response_status: 401,
      timestamp: new Date().toISOString(),
      metadata: details
    });
  }

  async logDataChange(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceType: string,
    resourceId: string,
    changes: Record<string, any>,
    ipAddress: string
  ) {
    await this.log({
      user_id: userId,
      action: `DATA_${action}`,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      response_status: 200,
      timestamp: new Date().toISOString(),
      metadata: { changes }
    });
  }
}

const auditLogger = new AuditLogger();

/**
 * Middleware to automatically log API requests
 */
export const auditMiddleware = (options: {
  logRequests?: boolean;
  logResponses?: boolean;
  sensitiveFields?: string[];
} = {}) => {
  const { 
    logRequests = true, 
    logResponses = true,
    sensitiveFields = ['password', 'token', 'secret', 'key']
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send.bind(res);

    // Sanitize request data (remove sensitive fields)
    const sanitizeData = (data: any): any => {
      if (!data || typeof data !== 'object') return data;
      
      const sanitized = { ...data };
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });
      return sanitized;
    };

    res.send = function(body) {
      const duration = Date.now() - startTime;
      
      // Only log significant actions (not just GET requests to public endpoints)
      const shouldLog = req.method !== 'GET' || req.url.includes('/api/');
      
      if (shouldLog) {
        const logEntry: AuditLogEntry = {
          user_id: req.user?.id,
          user_email: req.user?.email,
          action: `${req.method}_${req.route?.path || req.url}`,
          resource_type: req.url.split('/')[2] || 'api', // Extract resource type from URL
          ip_address: req.ip || req.connection.remoteAddress || 'unknown',
          user_agent: req.get('user-agent'),
          response_status: res.statusCode,
          timestamp: new Date().toISOString(),
          metadata: {
            duration,
            contentLength: body ? body.length : 0,
            ...(logRequests && { requestData: sanitizeData(req.body) }),
            ...(logResponses && res.statusCode >= 400 && { responseData: sanitizeData(body) })
          }
        };

        // Log asynchronously to avoid blocking response
        auditLogger.log(logEntry).catch(console.error);
      }

      return originalSend(body);
    };

    next();
  };
};

// Specific audit functions for common actions
export const auditActions = {
  agentCreated: (userId: string, userEmail: string, agentId: string, agentName: string, ipAddress: string) =>
    auditLogger.logUserAction(userId, userEmail, 'AGENT_CREATED', 'agent', agentId, { agentName }, ipAddress),

  agentUpdated: (userId: string, userEmail: string, agentId: string, changes: Record<string, any>, ipAddress: string) =>
    auditLogger.logDataChange(userId, 'UPDATE', 'agent', agentId, changes, ipAddress),

  agentDeleted: (userId: string, userEmail: string, agentId: string, ipAddress: string) =>
    auditLogger.logDataChange(userId, 'DELETE', 'agent', agentId, {}, ipAddress),

  conversationStarted: (userId: string, userEmail: string, conversationId: string, agentId: string, ipAddress: string) =>
    auditLogger.logUserAction(userId, userEmail, 'CONVERSATION_STARTED', 'conversation', conversationId, { agentId }, ipAddress),

  fileUploaded: (userId: string, userEmail: string, fileName: string, fileSize: number, bucket: string, ipAddress: string) =>
    auditLogger.logUserAction(userId, userEmail, 'FILE_UPLOADED', 'file', fileName, { fileSize, bucket }, ipAddress),

  loginAttempt: (email: string, success: boolean, ipAddress: string, userAgent?: string) =>
    success 
      ? auditLogger.logUserAction('', email, 'LOGIN_SUCCESS', 'auth', undefined, {}, ipAddress)
      : auditLogger.logSecurityEvent('LOGIN_FAILED', { email }, ipAddress, userAgent),

  passwordChanged: (userId: string, userEmail: string, ipAddress: string) =>
    auditLogger.logUserAction(userId, userEmail, 'PASSWORD_CHANGED', 'auth', userId, {}, ipAddress),

  apiKeyUsed: (keyId: string, endpoint: string, ipAddress: string, success: boolean) =>
    auditLogger.logUserAction('', '', 'API_KEY_USED', 'api', keyId, { endpoint, success }, ipAddress),

  rateLimitHit: (identifier: string, endpoint: string, ipAddress: string) =>
    auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier, endpoint }, ipAddress),
};

export default auditLogger;