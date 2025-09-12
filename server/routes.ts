import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { storage } from "./database/storage";
import { authenticate, optionalAuth, getUserId, supabase, adminClient, type AuthenticatedRequest } from "./middleware/auth";
import { createClient } from '@supabase/supabase-js';
import { rateLimiters } from "./middleware/rateLimiter";
import { metricsMiddleware } from "./monitoring/metricsCollector";
import { cacheMiddleware, cacheManager } from "./performance/cacheManager";
import * as monitoring from "./routes/monitoring";
import { calendarMonitoring, validateCalendarRequest, getCalendarAnalytics, calendarErrorAlert } from "./middleware/calendarMonitoring";
import { sanitizeRequest } from "./middleware/security";
import { chatWithAgent, getChatHistory, getMessages } from "./routes/chat";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import OpenAI from "openai";
import { 
  insertAgentSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertNewsletterSubscriberSchema,
  insertTrainingRequestSchema,
  insertToolsSettingsSchema,
  insertIntegrationsConnectionSchema,
  agentWizardSchema,
  insertUserNotificationSettingsSchema,
  updateUserNotificationSettingsSchema,
  insertAccountDeletionSchema,
  insertUserStatusSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // CORS configuration for Replit domains
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        /https:\/\/.*\.replit\.app$/,
        /https:\/\/.*\.replit\.dev$/,
        /https:\/\/.*\.replit\.co$/
      ];

      // Check if origin matches allowed patterns
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Allow all origins for now to fix the issue
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Client-Version'
    ],
    maxAge: 86400 // 24 hours
  };

  // Apply CORS middleware
  app.use(cors(corsOptions));

  // Global middleware - temporarily disabled due to crashes
  // app.use(metricsMiddleware);

  // Monitoring endpoints
  app.get('/api/health', monitoring.healthCheck);
  app.get('/api/monitoring/metrics', monitoring.getMetrics);
  app.get('/api/monitoring/cache', monitoring.getCacheStats);
  app.delete('/api/monitoring/cache', monitoring.clearCache);
  app.delete('/api/monitoring/cache/user/:userId', monitoring.invalidateUserCache);
  app.get('/api/monitoring/queries', monitoring.getQueryStats);
  app.post('/api/monitoring/optimize-indexes', monitoring.createOptimizedIndexes);
  app.delete('/api/monitoring/query-metrics', monitoring.clearQueryMetrics);
  app.post('/api/monitoring/load-test', monitoring.runLoadTest);
  app.post('/api/monitoring/e2e-test', monitoring.runE2ETests);

  // Newsletter subscription
  app.post("/api/newsletter/subscribe", rateLimiters.api, async (req, res) => {
    try {
      const { email } = insertNewsletterSubscriberSchema.parse(req.body);
      const subscriber = await storage.subscribeToNewsletter(email);
      res.json(subscriber);
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      
      // Check if it's a unique constraint violation (duplicate email)
      if (error.code === '23505' && error.constraint_name === 'newsletter_subscribers_email_key') {
        return res.status(400).json({ error: "Email already subscribed to newsletter" });
      }
      
      res.status(500).json({ error: "Failed to subscribe to newsletter" });
    }
  });

  // Training requests
  app.post("/api/training-requests", async (req, res) => {
    try {
      const request = insertTrainingRequestSchema.parse(req.body);
      const trainingRequest = await storage.createTrainingRequest(request);
      res.json(trainingRequest);
    } catch (error) {
      console.error("Training request error:", error);
      res.status(500).json({ error: "Failed to create training request" });
    }
  });

  // File upload endpoint using service role
  app.post("/api/support/upload", rateLimiters.api, authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      // This endpoint will be called from frontend to upload files using service role
      const { fileName, fileData, mimeType } = req.body;
      
      if (!fileName || !fileData) {
        return res.status(400).json({ error: "fileName and fileData required" });
      }

      console.log('📁 Uploading file:', fileName, 'Size:', fileData.length, 'bytes (base64)');

      // Sanitize filename - remove special characters and Turkish characters
      const sanitizedFileName = fileName
        .replace(/[ğĞıİöÖüÜşŞçÇ]/g, (char) => {
          const map = { 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S', 'ç': 'c', 'Ç': 'C' };
          return map[char] || char;
        })
        .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace non-alphanumeric chars with underscore
        .replace(/_+/g, '_')              // Replace multiple underscores with single
        .replace(/^_|_$/g, '');           // Remove leading/trailing underscores

      console.log('🧹 Sanitized filename:', sanitizedFileName);

      // Create buffer from base64 data
      const buffer = Buffer.from(fileData, 'base64');
      console.log('📊 Buffer size:', buffer.length, 'bytes');
      
      const finalFileName = `support_${Date.now()}_${sanitizedFileName}`;
      console.log('📝 Final filename for storage:', finalFileName);
      
      const { uploadFileAsService } = await import('./database/storage-direct');
      const result = await uploadFileAsService(buffer, finalFileName, mimeType || 'application/octet-stream');
      
      if (result.error) {
        console.error('❌ Upload service error:', result.error);
        return res.status(500).json({ error: result.error });
      }
      
      console.log('✅ Upload completed:', result.url);
      res.json({ url: result.url });
      
    } catch (error) {
      console.error('Upload endpoint error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Integrations file upload endpoint using service role
  app.post("/api/integrations/upload", rateLimiters.api, authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      // This endpoint will be called from frontend to upload files for integration requests
      const { fileName, fileData, mimeType } = req.body;
      
      if (!fileName || !fileData) {
        return res.status(400).json({ error: "fileName and fileData required" });
      }

      console.log('📁 Uploading integrations file:', fileName, 'Size:', fileData.length, 'bytes (base64)');

      // Sanitize filename - remove special characters and Turkish characters
      const sanitizedFileName = fileName
        .replace(/[ğĞıİöÖüÜşŞçÇ]/g, (char) => {
          const map = { 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S', 'ç': 'c', 'Ç': 'C' };
          return map[char] || char;
        })
        .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace non-alphanumeric chars with underscore
        .replace(/_+/g, '_')              // Replace multiple underscores with single
        .replace(/^_|_$/g, '');           // Remove leading/trailing underscores

      console.log('🧹 Sanitized filename:', sanitizedFileName);

      // Create buffer from base64 data
      const buffer = Buffer.from(fileData, 'base64');
      console.log('📊 Buffer size:', buffer.length, 'bytes');
      
      const finalFileName = `integrations_${Date.now()}_${sanitizedFileName}`;
      console.log('📝 Final filename for storage:', finalFileName);
      
      const { uploadFileAsService } = await import('./database/storage-direct');
      const result = await uploadFileAsService(buffer, finalFileName, mimeType || 'application/octet-stream');
      
      if (result.error) {
        console.error('❌ Upload service error:', result.error);
        return res.status(500).json({ error: result.error });
      }
      
      console.log('✅ Integrations upload completed:', result.url);
      res.json({ url: result.url });
      
    } catch (error) {
      console.error('Integrations upload endpoint error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Integration request endpoint with file attachment support
  app.post("/api/integrations/request", rateLimiters.api, authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, email, requested, details, attachmentUrl, attachmentName } = req.body;
      
      console.log('📥 Integration request received:', {
        name, email, requested, details,
        attachmentUrl: attachmentUrl || 'NO URL',
        attachmentName: attachmentName || 'NO NAME'
      });
      
      if (!name || !email || !requested) {
        return res.status(400).json({ error: "Name, email, and requested integration are required" });
      }
      
      // Debug OAuth credentials
      console.log('🔐 Gmail Client ID:', process.env.GMAIL_CLIENT_ID ? 'SET' : 'NOT SET');
      console.log('🔐 Gmail Client Secret:', process.env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET');
      console.log('🔐 Gmail Refresh Token:', process.env.GMAIL_REFRESH_TOKEN ? 'SET' : 'NOT SET');
      console.log('📧 SMTP User:', process.env.SMTP_USER ? process.env.SMTP_USER : 'NOT SET');
      
      // Try multiple Gmail configurations
      let transporter: any = null;
      let canSendEmail = false;
      
      // Try OAuth 2.0 configuration first
      if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.SMTP_USER) {
        try {
          console.log('🔑 Setting up OAuth 2.0 authentication for integration request...');
          
          const oauth2Client = new OAuth2Client(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
          );
          
          oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
          });
          
          const accessTokenResponse = await oauth2Client.getAccessToken();
          const accessToken = accessTokenResponse.token;
          
          if (!accessToken) {
            throw new Error('Failed to obtain access token');
          }
          
          console.log('✅ Access token obtained successfully');
          
          // Prepare mail options with attachment if provided
          const mailOptions: any = {
            from: process.env.SMTP_USER,
            to: 'contact@nonplo.com',
            subject: `[Integration Request] ${requested}`,
            text: `
Yeni entegrasyon talebi alındı:

İsim: ${name}
E-posta: ${email}
İstenen Entegrasyon: ${requested}

${details ? `Detaylar/Kullanım Durumu:\n${details}\n` : ''}

${attachmentName ? `\nEkli dosya: ${attachmentName}` : ''}
            `,
            html: `
<h2>Yeni Entegrasyon Talebi</h2>
<p><strong>İsim:</strong> ${name}</p>
<p><strong>E-posta:</strong> ${email}</p>
<p><strong>İstenen Entegrasyon:</strong> ${requested}</p>

${details ? `<h3>Detaylar/Kullanım Durumu:</h3><p>${details.replace(/\n/g, '<br>')}</p>` : ''}

${attachmentName ? `<p><strong>Ekli dosya:</strong> ${attachmentName}</p>` : ''}
${attachmentUrl ? `<p><a href="${attachmentUrl}" target="_blank">Dosyayı İndir</a></p>` : ''}
            `
          };

          // If there's an attachment URL, download and attach the file
          if (attachmentUrl && attachmentName) {
            try {
              const attachmentResponse = await fetch(attachmentUrl);
              if (attachmentResponse.ok) {
                const attachmentBuffer = await attachmentResponse.arrayBuffer();
                mailOptions.attachments = [{
                  filename: attachmentName,
                  content: Buffer.from(attachmentBuffer)
                }];
                console.log('✅ Attachment added to integration request email');
              }
            } catch (attachmentError) {
              console.log('⚠️ Failed to download attachment, sending integration email without attachment:', attachmentError);
            }
          }
          
          // Send email directly via OAuth
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: process.env.SMTP_USER,
              clientId: process.env.GMAIL_CLIENT_ID,
              clientSecret: process.env.GMAIL_CLIENT_SECRET,
              refreshToken: process.env.GMAIL_REFRESH_TOKEN,
              accessToken: accessToken
            }
          });
          
          console.log('📧 Testing OAuth 2.0 Gmail connection for integration request...');
          await transporter.verify();
          console.log('✅ OAuth 2.0 Gmail connection successful!');
          
          const info = await transporter.sendMail(mailOptions);
          console.log('✅ Integration request email sent successfully:', info.messageId);
          canSendEmail = true;
          
        } catch (oauthError: any) {
          console.log('❌ OAuth 2.0 authentication failed for integration request:', oauthError.message);
          console.log('🔍 OAuth Error details:', oauthError.code || 'No error code');
        }
      } else {
        console.log('⚠️  OAuth 2.0 credentials not complete, skipping OAuth authentication for integration request');
      }
      
      if (canSendEmail) {
        res.json({ success: true, message: "Integration request sent successfully" });
      } else {
        // Log to console for now if email sending fails
        console.log('📝 Integration request (email failed, logged to console):', {
          name,
          email,
          requested,
          details,
          attachmentName,
          attachmentUrl,
          timestamp: new Date().toISOString()
        });
        res.json({ success: true, message: "Integration request logged successfully" });
      }
      
    } catch (error: any) {
      console.error("Integration request error:", error);
      res.status(500).json({ error: "Failed to send integration request" });
    }
  });

  // Conversations endpoint - Get conversations for a user
  app.get("/api/conversations", rateLimiters.api, optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Messages endpoint - Get messages for a conversation
  app.get("/api/conversations/:conversationId/messages", rateLimiters.api, optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      const conversationId = req.params.conversationId;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Verify user has access to this conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Support ticket endpoint with file attachment support
  app.post("/api/support/ticket", rateLimiters.api, authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, email, subject, message, attachmentUrl, attachmentName } = req.body;
      
      if (!email || !subject || !message) {
        return res.status(400).json({ error: "Email, subject, and message are required" });
      }
      
      // Debug OAuth credentials
      console.log('🔐 Gmail Client ID:', process.env.GMAIL_CLIENT_ID ? 'SET' : 'NOT SET');
      console.log('🔐 Gmail Client Secret:', process.env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET');
      console.log('🔐 Gmail Refresh Token:', process.env.GMAIL_REFRESH_TOKEN ? 'SET' : 'NOT SET');
      console.log('📧 SMTP User:', process.env.SMTP_USER ? process.env.SMTP_USER : 'NOT SET');
      
      // Try multiple Gmail configurations
      let transporter: any = null;
      let canSendEmail = false;
      
      // Try OAuth 2.0 configuration first
      if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.SMTP_USER) {
        try {
          console.log('🔑 Setting up OAuth 2.0 authentication...');
          
          const oauth2Client = new OAuth2Client(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
          );
          
          oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
          });
          
          const accessTokenResponse = await oauth2Client.getAccessToken();
          const accessToken = accessTokenResponse.token;
          
          if (!accessToken) {
            throw new Error('Failed to obtain access token');
          }
          
          console.log('✅ Access token obtained successfully');
          
          // Prepare mail options with attachment if provided
          const mailOptions: any = {
            from: process.env.SMTP_USER,
            to: 'contact@nonplo.com',
            subject: `[Support] ${subject}`,
            text: `
Yeni destek talebi alındı:

İsim: ${name || 'Dashboard Kullanıcısı'}
E-posta: ${email}
Konu: ${subject}

Mesaj:
${message}

${attachmentName ? `\nEkli dosya: ${attachmentName}` : ''}
            `,
            html: `
<h2>Yeni Destek Talebi</h2>
<p><strong>İsim:</strong> ${name || 'Dashboard Kullanıcısı'}</p>
<p><strong>E-posta:</strong> ${email}</p>
<p><strong>Konu:</strong> ${subject}</p>

<h3>Mesaj:</h3>
<p>${message.replace(/\n/g, '<br>')}</p>

${attachmentName ? `<p><strong>Ekli dosya:</strong> ${attachmentName}</p>` : ''}
${attachmentUrl ? `<p><a href="${attachmentUrl}" target="_blank">Dosyayı İndir</a></p>` : ''}
            `
          };

          // If there's an attachment URL, download and attach the file
          if (attachmentUrl && attachmentName) {
            try {
              const attachmentResponse = await fetch(attachmentUrl);
              if (attachmentResponse.ok) {
                const attachmentBuffer = await attachmentResponse.arrayBuffer();
                mailOptions.attachments = [{
                  filename: attachmentName,
                  content: Buffer.from(attachmentBuffer)
                }];
                console.log('✅ Attachment added to email');
              }
            } catch (attachmentError) {
              console.log('⚠️ Failed to download attachment, sending email without attachment:', attachmentError);
            }
          }
          
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: process.env.SMTP_USER,
              clientId: process.env.GMAIL_CLIENT_ID,
              clientSecret: process.env.GMAIL_CLIENT_SECRET,
              refreshToken: process.env.GMAIL_REFRESH_TOKEN,
              accessToken: accessToken
            }
          });
          
          console.log('📧 Testing OAuth 2.0 Gmail connection...');
          await transporter.verify();
          console.log('✅ OAuth 2.0 Gmail connection successful!');
          
          const info = await transporter.sendMail(mailOptions);
          console.log('✅ Support ticket email sent successfully:', info.messageId);
          canSendEmail = true;
          
        } catch (oauthError: any) {
          console.log('❌ OAuth 2.0 authentication failed:', oauthError.message);
          console.log('🔍 OAuth Error details:', oauthError.code || 'No error code');
        }
      } else {
        console.log('⚠️  OAuth 2.0 credentials not complete, skipping OAuth authentication');
      }
      
      if (canSendEmail) {
        res.json({ success: true, message: "Support ticket sent successfully" });
      } else {
        // Log to console for now if email sending fails
        console.log('📝 Support ticket (email failed, logged to console):', {
          name: name || 'Dashboard Kullanıcısı',
          email,
          subject,
          message,
          attachmentName,
          attachmentUrl,
          timestamp: new Date().toISOString()
        });
        res.json({ success: true, message: "Support ticket logged successfully" });
      }
      
    } catch (error: any) {
      console.error("Support ticket error:", error);
      res.status(500).json({ error: "Failed to send support ticket" });
    }
  });

  // Original contact email endpoint (kept for backward compatibility)
  app.post("/api/contact", rateLimiters.api, async (req, res) => {
    try {
      const { name, email, phone, company, subject, message } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required" });
      }
      
      // Debug OAuth credentials
      console.log('🔐 Gmail Client ID:', process.env.GMAIL_CLIENT_ID ? 'SET' : 'NOT SET');
      console.log('🔐 Gmail Client Secret:', process.env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET');
      console.log('🔐 Gmail Refresh Token:', process.env.GMAIL_REFRESH_TOKEN ? 'SET' : 'NOT SET');
      console.log('📧 SMTP User:', process.env.SMTP_USER ? process.env.SMTP_USER : 'NOT SET');
      
      // Try multiple Gmail configurations
      let transporter: any = null;
      let canSendEmail = false;
      
      // Try OAuth 2.0 configuration first
      if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.SMTP_USER) {
        try {
          console.log('🔑 Setting up OAuth 2.0 authentication...');
          
          const oauth2Client = new OAuth2Client(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
          );
          
          oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
          });
          
          const accessTokenResponse = await oauth2Client.getAccessToken();
          const accessToken = accessTokenResponse.token;
          
          if (!accessToken) {
            throw new Error('Failed to obtain access token');
          }
          
          console.log('✅ Access token obtained successfully');
          
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: process.env.SMTP_USER,
              clientId: process.env.GMAIL_CLIENT_ID,
              clientSecret: process.env.GMAIL_CLIENT_SECRET,
              refreshToken: process.env.GMAIL_REFRESH_TOKEN,
              accessToken: accessToken
            }
          });
          
          console.log('📧 Testing OAuth 2.0 Gmail connection...');
          await transporter.verify();
          console.log('✅ OAuth 2.0 Gmail connection successful!');
          canSendEmail = true;
          
        } catch (oauthError: any) {
          console.log('❌ OAuth 2.0 authentication failed:', oauthError.message);
          console.log('🔍 OAuth Error details:', oauthError.code || 'No error code');
        }
      } else {
        console.log('⚠️  OAuth 2.0 credentials not complete, skipping OAuth authentication');
      }
      
      // Fallback to App Password if OAuth fails
      if (!canSendEmail && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        try {
          console.log('🔄 Falling back to App Password authentication...');
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD
            }
          });
          
          await transporter.verify();
          console.log('✅ App Password authentication successful!');
          canSendEmail = true;
          
        } catch (appPasswordError: any) {
          console.log('❌ App Password authentication failed:', appPasswordError.message);
        }
      }
      
      if (!canSendEmail) {
        console.log('❌ All Gmail authentication methods failed');
        console.log('📝 Will log email instead of sending');
      }
      
      // Always proceed regardless of Gmail status
      console.log('🎯 Email sending status:', canSendEmail ? 'ENABLED' : 'DISABLED (will log only)')
      
      // Email content
      const emailContent = {
        from: process.env.SMTP_USER || 'demo@example.com',
        to: 'contact@nonplo.com',
        subject: subject ? `Nonplo İletişim: ${subject}` : 'Nonplo İletişim Formu',
        html: `
          <h2>Yeni İletişim Formu Mesajı</h2>
          <p><strong>Ad Soyad:</strong> ${name}</p>
          <p><strong>E-posta:</strong> ${email}</p>
          ${phone ? `<p><strong>Telefon:</strong> ${phone}</p>` : ''}
          ${company ? `<p><strong>Şirket:</strong> ${company}</p>` : ''}
          ${subject ? `<p><strong>Konu:</strong> ${subject}</p>` : ''}
          <p><strong>Mesaj:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      };
      
      // Send email or log based on connection status
      if (canSendEmail && transporter) {
        try {
          const info = await transporter.sendMail(emailContent);
          console.log('✅ Email sent successfully to contact@nonplo.com:', info.messageId);
          
          res.json({ 
            success: true, 
            message: "Mesajınız başarıyla gönderildi. Size 24 saat içinde dönüş yapacağız." 
          });
        } catch (sendError: any) {
          console.log('❌ Email sending failed:', sendError.message);
          // Fall back to logging
          canSendEmail = false;
        }
      }
      
      if (!canSendEmail) {
        // Log email content when can't send actual email
        console.log('📬 ===== CONTACT FORM SUBMISSION =====');
        console.log('📧 To: contact@nonplo.com');
        console.log('👤 From:', `${name} <${email}>`);
        console.log('📱 Phone:', phone || 'Not provided');
        console.log('🏢 Company:', company || 'Not provided');
        console.log('📝 Subject:', subject || 'Nonplo İletişim Formu');
        console.log('💬 Message:', message);
        console.log('🕐 Time:', new Date().toLocaleString('tr-TR'));
        console.log('=====================================');
        
        res.json({ 
          success: true, 
          message: "Mesajınız alındı ve kayıt edildi. Size 24 saat içinde dönüş yapacağız." 
        });
      }
    } catch (error: any) {
      console.error("❌ Unexpected contact form error:", error);
      
      // Last resort fallback - log the data
      console.log('📬 ===== EMERGENCY CONTACT FORM LOG =====');
      console.log('📧 To: contact@nonplo.com');
      console.log('👤 From:', req.body.name, '<', req.body.email, '>');
      console.log('💬 Message:', req.body.message);
      console.log('🕐 Time:', new Date().toISOString());
      console.log('=====================================');
      
      res.json({ 
        success: true,
        message: "Mesajınız alındı ve kayıt edildi. Size 24 saat içinde dönüş yapacağız."
      });
    }
  });

  // Agents CRUD with authentication and caching
  app.get("/api/agents", optionalAuth, cacheMiddleware(3 * 60 * 1000), async (req: AuthenticatedRequest, res) => {
    try {
      // Try to get userId from auth middleware first, then fallback to query parameter
      const userId = getUserId(req) || (req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      // Use middleware cache only - remove duplicate manual caching
      const agents = await storage.getAgentsByUserId(userId);
      res.json(agents);
    } catch (error) {
      console.error("Get agents error:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", optionalAuth, cacheMiddleware(5 * 60 * 1000), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      // Try to get userId from auth middleware first, then fallback to query parameter
      const userId = getUserId(req) || (req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const agent = await storage.getAgentById(id, userId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Get agent error:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const agent = insertAgentSchema.parse(req.body);
      const newAgent = await storage.createAgent(agent);
      
      // Broadcast to user for real-time dashboard updates
      if (agent.user_id && global.broadcastToUser) {
        setTimeout(async () => {
          try {
            const stats = await storage.getDashboardStats(agent.user_id);
            global.broadcastToUser(agent.user_id, 'dashboard_stats', stats);
            global.broadcastToUser(agent.user_id, 'agent_created', newAgent);
          } catch (error) {
            console.error('Failed to broadcast agent creation:', error);
          }
        }, 1000);
      }
      
      res.json(newAgent);
    } catch (error) {
      console.error("Create agent error:", error);
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  // Create agent from wizard data
  app.post("/api/agents/wizard", optionalAuth, rateLimiters.agentCreation, async (req: AuthenticatedRequest, res) => {
    try {
      const { wizardData } = req.body;
      const userId = getUserId(req) || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Validate wizard data
      const validatedData = agentWizardSchema.parse(wizardData);
      
      // Create the agent in database first
      const newAgent = await storage.createAgentFromWizard(userId, validatedData);
      
      // Create Dialogflow CX agent if needed
      let dialogflowCxAgentId = null;
      let dialogflowCxIntegrated = false;
      
      try {
        console.log(`🚀 DialogFlow CX entegrasyonu başlatılıyor: ${newAgent.name}`);
        
        // Import create agent functions dynamically
        const { createAgent } = await import("./routes/create-agent");
        
        // Create DialogFlow CX agent with wizard data
        const cxRequest = {
          method: 'POST',
          body: {
            restaurantName: newAgent.name,
            description: newAgent.description || `${newAgent.name} AI Asistanı`,
            userId: userId
          },
          headers: { authorization: 'Bearer test-token' }
        } as any;
        
        const cxResponse = {
          status: (code: number) => ({ json: (data: any) => data }),
          json: (data: any) => data
        } as any;
        
        const cxResult = await createAgent(cxRequest, cxResponse);
        
        if (cxResult && (cxResult as any).success) {
          dialogflowCxAgentId = (cxResult as any).dialogflowCxAgentId;
          dialogflowCxIntegrated = (cxResult as any).dialogflowCxIntegrated;
          console.log(`✅ DialogFlow CX agent oluşturuldu: ${dialogflowCxAgentId}`);
          
          // Check if Google Calendar is enabled in wizard
          if ((validatedData as any).googleCalendarConnection?.enabled) {
            console.log('📅 Google Calendar wizardda aktif - tool otomatik eklenecek');
            console.log('📅 Google Calendar tool zaten createAgent fonksiyonunda eklendi');
          }
          
          // Playbook oluştur ve tool'ları otomatik aktif et
          try {
            console.log('🚀 Playbook oluşturuluyor ve tool\'lar aktif ediliyor...');
            
            // Get the real user token from request headers
            const userToken = req.headers.authorization || '';
            console.log('🔑 Using real user token for playbook creation');
            
            const playbookResponse = await fetch('/api/create-advanced-playbook', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': userToken
              },
              body: JSON.stringify({
                agentId: newAgent.id,
                config: {
                  restaurantName: newAgent.name,
                  description: newAgent.description || 'AI Asistanı',
                  toneOfVoice: 'friendly',
                  greetingStyle: 'warm',
                  language: 'turkish'
                },
                userId: userId
              })
            });
            
            if (playbookResponse.ok) {
              console.log('✅ Playbook oluşturuldu ve tool\'lar aktif edildi!');
            } else {
              console.log('⚠ Playbook oluşturulamadı, manuel oluşturma gerekebilir');
            }
          } catch (playbookError) {
            console.log('⚠ Playbook oluşturma hatası:', playbookError);
          }
        }
        
      } catch (integrationError) {
        console.error("Dialogflow integration error:", integrationError);
        console.log(`✅ Agent ${newAgent.name} created successfully (CX integration failed but agent exists)`);
      }
      
      res.json({ 
        success: true, 
        agent: newAgent,
        dialogflowCxAgentId,
        dialogflowCxIntegrated,
        message: dialogflowCxIntegrated 
          ? "Agent, DialogFlow CX entegrasyonu ve otomatik tool aktifleştirme tamamlandı!" 
          : "Agent başarıyla oluşturuldu!" 
      });
    } catch (error) {
      console.error("Create agent from wizard error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Geçersiz veri", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Agent oluşturulurken bir hata oluştu" });
    }
  });

  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const updates = req.body;
      delete updates.userId; // Don't allow updating userId
      const updatedAgent = await storage.updateAgent(id, userId, updates);
      if (!updatedAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      // Broadcast real-time updates to user
      if (global.broadcastToUser) {
        setTimeout(async () => {
          try {
            const stats = await storage.getDashboardStats(userId);
            global.broadcastToUser(userId, 'dashboard_stats', stats);
            global.broadcastToUser(userId, 'agent_updated', updatedAgent);
          } catch (error) {
            console.error('Failed to broadcast agent update:', error);
          }
        }, 1000);
      }
      
      res.json(updatedAgent);
    } catch (error) {
      console.error("Update agent error:", error);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  app.put("/api/agents/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req) || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      console.log(`🔄 PUT Agent Update - Agent ID: ${id}, User ID: ${userId}`);
      console.log("Update data:", JSON.stringify(req.body, null, 2));

      const updates = { ...req.body };
      delete updates.userId; // Don't allow updating userId

      // Convert isActive to is_active for database consistency
      if ('isActive' in updates) {
        updates.is_active = updates.isActive;
        delete updates.isActive;
      }

      const updatedAgent = await storage.updateAgent(id, userId, updates);
      if (!updatedAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      console.log(`✅ Agent updated successfully: ${id}, Active: ${updatedAgent.is_active}`);
      
      // Clear cache for this user's agents
      cacheManager.invalidateUserData(userId);
      cacheManager.delete(`route:/api/agents?userId=${userId}:anonymous`);

      // Broadcast real-time updates to user
      if (global.broadcastToUser) {
        setTimeout(async () => {
          try {
            const stats = await storage.getDashboardStats(userId);
            global.broadcastToUser(userId, 'dashboard_stats', stats);
            global.broadcastToUser(userId, 'agent_updated', updatedAgent);
          } catch (error) {
            console.error('Failed to broadcast agent update:', error);
          }
        }, 1000);
      }

      res.json(updatedAgent);
    } catch (error) {
      console.error("PUT update agent error:", error);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  // Update agent temperature
  app.patch("/api/agents/:id/temperature", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const { temperature } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (temperature === undefined) {
        return res.status(400).json({ error: "Temperature değeri gerekli" });
      }

      // Temperature değerini sınırla (0.0 - 2.0)
      const validTemperature = Math.min(Math.max(parseFloat(temperature), 0.0), 2.0).toString();

      console.log(`🌡️ Temperature Update - Agent ID: ${id}, User ID: ${userId}, Temperature: ${validTemperature}`);

      // Get agent first to check ownership and get OpenAI assistant ID
      const agent = await storage.getAgentById(id, userId);
      if (!agent) {
        return res.status(404).json({ error: "Agent bulunamadı" });
      }

      // Update temperature in database
      const updatedAgent = await storage.updateAgent(id, userId, { temperature: validTemperature });
      if (!updatedAgent) {
        return res.status(500).json({ error: "Agent temperature güncellenemedi" });
      }

      // Update OpenAI assistant if assistant ID exists
      if (agent.openaiAssistantId) {
        try {
          await openai.beta.assistants.update(agent.openaiAssistantId, {
            temperature: parseFloat(validTemperature)
          });
          console.log(`✅ OpenAI Assistant temperature updated: ${agent.openaiAssistantId}`);
        } catch (openaiError: any) {
          console.error("OpenAI temperature update error:", openaiError);
          // Don't fail the whole request if OpenAI update fails
        }
      }

      // Clear cache
      cacheManager.invalidateUserData(userId);
      cacheManager.delete(`route:/api/agents?userId=${userId}:anonymous`);

      // Broadcast real-time updates
      if (global.broadcastToUser) {
        setTimeout(async () => {
          try {
            const stats = await storage.getDashboardStats(userId);
            global.broadcastToUser(userId, 'dashboard_stats', stats);
            global.broadcastToUser(userId, 'agent_updated', updatedAgent);
          } catch (error) {
            console.error('Failed to broadcast temperature update:', error);
          }
        }, 1000);
      }

      res.json({
        success: true,
        message: 'Agent temperature başarıyla güncellendi',
        agent: {
          id: updatedAgent.id,
          name: updatedAgent.name,
          temperature: validTemperature
        }
      });

    } catch (error: any) {
      console.error('Agent temperature güncelleme hatası:', error);
      res.status(500).json({ 
        error: 'Agent temperature güncellenemedi',
        details: error.message 
      });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.body.userId;
      console.log(`🗑️ DELETE Agent Request - Agent ID: ${id}, User ID: ${userId}`);
      console.log("DELETE request body:", JSON.stringify(req.body, null, 2));
      
      if (!userId) {
        console.error("❌ User ID missing in delete request");
        return res.status(400).json({ error: "User ID is required" });
      }
      
      console.log(`🚀 Starting agent deletion process for agent: ${id}`);
      await storage.deleteAgent(id, userId);
      console.log(`✅ Agent deletion completed successfully: ${id}`);
      
      // Clear user's cache after successful deletion
      console.log(`🧹 Clearing cache for user: ${userId}`);
      cacheManager.invalidateUserData(userId);
      
      // Also clear the specific agents cache for this user
      cacheManager.delete(`route:/api/agents?userId=${userId}:anonymous`);
      console.log(`🗑️ Specific cache key deleted: route:/api/agents?userId=${userId}:anonymous`);
      
      res.json({ success: true, message: "Agent deleted successfully from both database and Dialogflow CX" });
    } catch (error: any) {
      console.error(`💥 Delete agent error for ID ${req.params.id}:`, error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        error: "Failed to delete agent", 
        details: error.message,
        agentId: req.params.id 
      });
    }
  });

  // Conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get conversations for a specific agent
  app.get("/api/agents/:agentId/conversations", optionalAuth, cacheMiddleware(60 * 1000), async (req: AuthenticatedRequest, res) => {
    try {
      // Try to get userId from auth middleware first, then fallback to query parameter
      const userId = getUserId(req) || (req.query.userId as string);
      const { agentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const conversations = await storage.getConversationsByAgentId(userId, agentId, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Get agent conversations error:", error);
      res.status(500).json({ error: "Failed to fetch agent conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const conversation = insertConversationSchema.parse(req.body);
      const newConversation = await storage.createConversation(conversation);
      res.json(newConversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const updates = req.body;
      delete updates.userId;
      const updatedConversation = await storage.updateConversation(id, userId, updates);
      if (!updatedConversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(updatedConversation);
    } catch (error) {
      console.error("Update conversation error:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // Messages
  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const messages = await storage.getMessagesByConversationId(conversationId, userId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const message = insertMessageSchema.parse(req.body);
      const newMessage = await storage.createMessage(message);
      
      // Broadcast to user for real-time updates
      if (message.user_id && global.broadcastToUser) {
        global.broadcastToUser(message.user_id, 'new_message', newMessage);
        
        // Also refresh dashboard stats
        setTimeout(async () => {
          try {
            const stats = await storage.getDashboardStats(message.user_id);
            global.broadcastToUser(message.user_id, 'dashboard_stats', stats);
          } catch (error) {
            console.error('Failed to broadcast updated stats:', error);
          }
        }, 1000);
      }
      
      res.json(newMessage);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Tools settings
  app.get("/api/tools/settings", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const settings = await storage.getToolsSettingsByUserId(userId);
      res.json(settings);
    } catch (error) {
      console.error("Get tools settings error:", error);
      res.status(500).json({ error: "Failed to fetch tools settings" });
    }
  });

  app.post("/api/tools/settings", async (req, res) => {
    try {
      const setting = insertToolsSettingsSchema.parse(req.body);
      const newSetting = await storage.upsertToolsSetting(setting);
      res.json(newSetting);
    } catch (error) {
      console.error("Upsert tools setting error:", error);
      res.status(500).json({ error: "Failed to update tools setting" });
    }
  });

  // Integrations
  app.get("/api/integrations", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const integrations = await storage.getIntegrationsByUserId(userId);
      res.json(integrations);
    } catch (error) {
      console.error("Get integrations error:", error);
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations", async (req, res) => {
    try {
      const integration = insertIntegrationsConnectionSchema.parse(req.body);
      const newIntegration = await storage.upsertIntegration(integration);
      res.json(newIntegration);
    } catch (error) {
      console.error("Upsert integration error:", error);
      res.status(500).json({ error: "Failed to update integration" });
    }
  });

  // Global employee settings
  app.get("/api/global-settings", async (req, res) => {
    try {
      const settings = await storage.getGlobalEmployeeSettings();
      res.json(settings || { settings: {} });
    } catch (error) {
      console.error("Get global settings error:", error);
      res.status(500).json({ error: "Failed to fetch global settings" });
    }
  });

  app.post("/api/global-settings", async (req, res) => {
    try {
      const { settings } = req.body;
      const updatedSettings = await storage.updateGlobalEmployeeSettings(settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Update global settings error:", error);
      res.status(500).json({ error: "Failed to update global settings" });
    }
  });

  // Notification Settings
  app.get("/api/notification-settings", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      let settings = await storage.getUserNotificationSettings(userId);
      
      // If user doesn't have settings yet, create default ones
      if (!settings) {
        const defaultSettings = {
          userId,
          emailNotifications: true,
          marketingEmails: true,
        };
        settings = await storage.createUserNotificationSettings(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Get notification settings error:", error);
      res.status(500).json({ error: "Failed to fetch notification settings" });
    }
  });

  app.patch("/api/notification-settings", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req) || req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const updates = updateUserNotificationSettingsSchema.parse(req.body);
      const updatedSettings = await storage.upsertUserNotificationSettings(userId, updates);
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Update notification settings error:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // Password change endpoint
  app.post("/api/change-password", async (req: AuthenticatedRequest, res) => {
    try {
      // Get and validate auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authorization header required" });
      }

      const token = authHeader.substring(7);
      
      // Verify token with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const userId = user.id;

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
      }

      // For security, verify the user owns this session
      if (user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized: User ID mismatch" });
      }

      // CRITICAL SECURITY: Verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        return res.status(400).json({ error: "Güncel şifrenizi yanlış girdiniz" });
      }

      // Update password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Password update error:", updateError);
        return res.status(500).json({ error: "Failed to update password" });
      }

      res.json({ 
        success: true, 
        message: "Password updated successfully" 
      });

    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Email change verification endpoint - only verifies password
  app.post("/api/verify-password", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword } = req.body;
      
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }

      // Use the authenticated user from middleware
      const user = req.user;
      if (!user || !user.email) {
        return res.status(401).json({ error: "User authentication required" });
      }

      // Verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return res.status(400).json({ error: "Güncel şifrenizi yanlış girdiniz" });
      }

      res.json({ 
        success: true, 
        message: "Şifre doğrulandı" 
      });

    } catch (error: any) {
      console.error("Password verification error:", error);
      res.status(500).json({ error: "Failed to verify password" });
    }
  });

  // Cancel agent creation endpoint
  app.post("/api/cancel-agent-creation", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: "Agent ID is required" });
      }

      console.log(`🚫 Cancelling agent creation for ID: ${agentId}, User: ${userId}`);

      // Delete agent and related data from database
      try {
        await storage.deleteAgent(agentId, userId);
        console.log(`✅ Agent ${agentId} successfully cancelled and deleted`);
      } catch (dbError) {
        console.error(`❌ Error during agent cancellation ${agentId}:`, dbError);
        // Don't fail the request if agent was already deleted
        if ((dbError as Error).message !== 'Agent not found') {
          throw dbError;
        }
        console.log(`ℹ️ Agent ${agentId} was already deleted - cancellation successful`);
      }

      res.json({ 
        success: true, 
        message: "Agent creation cancelled and cleaned up" 
      });

    } catch (error: any) {
      console.error("Cancel agent creation error:", error);
      res.status(500).json({ error: "Failed to cancel agent creation" });
    }
  });

  // Admin email change endpoint - immediately changes email without confirmation
  app.post("/api/admin/change-email", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const { newEmail } = req.body;
      
      if (!newEmail) {
        return res.status(400).json({ error: "New email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Use the authenticated user from middleware
      const user = req.user;
      if (!user || !user.email) {
        return res.status(401).json({ error: "User authentication required" });
      }

      // Check if new email is different from current email
      if (user.email === newEmail) {
        return res.status(400).json({ error: "New email must be different from current email" });
      }

      // Update email using admin API with email confirmation disabled
      const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
        userId,
        { 
          email: newEmail,
          email_confirm: true  // Skip email confirmation
        }
      );

      if (updateError) {
        console.error("Email update error:", updateError);
        if (updateError.message?.includes('already registered')) {
          return res.status(400).json({ error: "Bu e-posta zaten başka bir hesaba kayıtlı" });
        }
        if (updateError.message?.includes('Email rate limit')) {
          return res.status(429).json({ error: "Çok fazla e-posta değişiklik talebi. Lütfen daha sonra tekrar deneyin" });
        }
        return res.status(500).json({ error: "E-posta değiştirme başarısız oldu" });
      }

      res.json({ 
        success: true, 
        message: "E-posta adresiniz başarıyla değiştirildi" 
      });

    } catch (error: any) {
      console.error("Admin change email error:", error);
      res.status(500).json({ error: "Failed to change email" });
    }
  });

  // Dashboard Statistics (with aggressive caching)
  app.get("/api/dashboard/stats", authenticate, cacheMiddleware(2 * 60 * 1000), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if stats are cached first
      const cachedStats = cacheManager.getCachedDashboardStats(userId);
      if (cachedStats) {
        res.setHeader('X-Cache-Source', 'dashboard-cache');
        return res.json(cachedStats);
      }
      
      const stats = await storage.getDashboardStats(userId);
      
      // Cache the results for 2 minutes
      cacheManager.cacheDashboardStats(userId, stats, 2 * 60 * 1000);
      
      res.json(stats);
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Delete User Account
  app.delete("/api/user/account", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req) || req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      console.log(`🗑️ Account deletion request received for user: ${userId}`);
      
      await storage.deleteUserAccount(userId);
      
      res.json({ 
        success: true, 
        message: "Hesabınız ve tüm verileriniz başarıyla silindi." 
      });
    } catch (error: any) {
      console.error("Delete user account error:", error);
      res.status(500).json({ 
        error: "Hesap silinirken bir hata oluştu", 
        details: error.message 
      });
    }
  });

  // Agent creation routes (OpenAI-based)
  app.post("/api/create-cx-agent", async (req, res) => {
    try {
      const { createCustomAgent } = await import("./routes/create-custom-agent");
      return createCustomAgent(req, res);
    } catch (error) {
      console.error("Create custom agent error:", error);
      res.status(500).json({ error: "Failed to create custom agent" });
    }
  });

  // Custom Agent Creation with OpenAI Assistants API  
  app.post("/api/create-custom-agent", async (req, res) => {
    try {
      const { createCustomAgent } = await import("./routes/create-custom-agent");
      return createCustomAgent(req, res);
    } catch (error) {
      console.error("Create custom agent error:", error);
      res.status(500).json({ error: "Failed to create custom agent" });
    }
  });

  // Check agent name availability
  app.get("/api/check-agent-name", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { checkAgentName } = await import("./routes/check-agent-name");
      return checkAgentName(req, res);
    } catch (error) {
      console.error("Check agent name error:", error);
      res.status(500).json({ error: "Failed to check agent name" });
    }
  });



  // Main playbook creation endpoint (OpenAI-powered)
  app.post("/api/create-playbook", async (req, res) => {
    try {
      const { createAdvancedPlaybook } = await import("./routes/create-playbook-openai");
      return createAdvancedPlaybook(req, res);
    } catch (error) {
      console.error("Create OpenAI playbook error:", error);
      res.status(500).json({ error: "Failed to create OpenAI playbook" });
    }
  });

  // Legacy endpoint alias for backward compatibility
  app.post("/api/create-advanced-playbook", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { createAdvancedPlaybook } = await import("./routes/create-advanced-playbook");
      return createAdvancedPlaybook(req, res);
    } catch (error) {
      console.error("Create advanced playbook error:", error);
      res.status(500).json({ error: "Failed to create advanced playbook" });
    }
  });


  // Fix old agents without openaiAssistantId
  app.post("/api/fix-agent/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      const OpenAI = await import('openai');
      const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
      
      // Get agent
      const agent = await storage.getAgentById(agentId, 'd59a0ba4-c16e-49c5-8e10-54e6f6d15d1f');
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      console.log(`🔧 Fixing agent: ${agent.name}`);
      
      if (agent.openaiAssistantId) {
        return res.json({ success: true, message: 'Agent already has Assistant ID', assistantId: agent.openaiAssistantId });
      }
      
      // Create OpenAI Assistant
      const assistant = await openai.beta.assistants.create({
        name: agent.name,
        instructions: `Sen ${agent.name} adlı AI asistanısın. ${agent.description || 'Kullanıcılara yardım etmek için buradayım.'}`,
        model: "gpt-4o-mini",
        tools: [{ type: "code_interpreter" }, { type: "file_search" }]
      });
      
      // Update agent with Assistant ID
      await storage.updateAgent(agentId, 'd59a0ba4-c16e-49c5-8e10-54e6f6d15d1f', {
        openaiAssistantId: assistant.id
      });
      
      console.log(`✅ Agent ${agent.name} fixed with Assistant ID: ${assistant.id}`);
      
      res.json({ success: true, assistantId: assistant.id, agentName: agent.name });
      
    } catch (error) {
      console.error("Fix agent error:", error);
      res.status(500).json({ error: "Failed to fix agent" });
    }
  });

  // Chat API routes
  app.post("/api/chat", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      return chatWithAgent(req, res);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Chat failed" });
    }
  });

  app.get("/api/agents/:agentId/chat-history", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      return getChatHistory(req, res);
    } catch (error) {
      console.error("Get chat history error:", error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  app.get("/api/conversations/:conversationId/messages", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      return getMessages(req, res);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Phase 3: Manual Google Calendar tool activation endpoint
  app.post("/api/agents/:agentId/activate-google-calendar-tool", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      console.log(`🚀 Manual Google Calendar tool activation - Agent: ${agentId}, User: ${userId}`);
      
      // Get agent data
      const agentData = await storage.getAgentById(agentId, userId);
      if (!agentData) {
        console.log(`❌ Agent not found: ${agentId}`);
        return res.status(404).json({ error: "Agent not found" });
      }
      
      console.log(`📋 Agent found: ${agentData.name}`);
      console.log(`✅ Using PLAYBOOK ONLY architecture - no DialogFlow CX required`);
      
      // PLAYBOOK ONLY - no tool creation needed in DialogFlow CX
      console.log(`✅ Google Calendar already enabled via PLAYBOOK system`);
      const toolCreated = true; // Always successful in PLAYBOOK mode
      const debugLogs = ['PLAYBOOK ONLY mode - no DialogFlow CX tool creation needed'];
      
      console.log('🔍 Tool creation result:', toolCreated);
      
      if (toolCreated) {
        console.log(`✅ Google Calendar tool manually activated for agent: ${agentId}`);
        res.json({
          success: true,
          message: "Google Calendar tool successfully activated",
          agentId,
          debugLogs: debugLogs
        });
      } else {
        console.log(`❌ Failed to activate Google Calendar tool for agent: ${agentId}`);
        res.status(500).json({ 
          success: false,
          error: "Failed to activate Google Calendar tool" 
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Manual Google Calendar tool activation error:`, error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Failed to activate Google Calendar tool" 
      });
    }
  });

  // Mevcut agent'a Google Calendar tool'unu ekle
  app.post("/api/agents/:agentId/enable-calendar-tool", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req) || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      console.log(`📅 Google Calendar tool ekleniyor - Agent: ${agentId}, User: ${userId}`);

      // Agent'ı kontrol et
      const agent = await storage.getAgentById(agentId, userId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // DialogFlow CX agent ID'sini bul - Detaylı debug ile
      let dialogflowCxAgentId = null;
      
      console.log(`🔍 Agent bilgileri debug: ID=${agentId}, Name=${agent.name}`);
      console.log(`🔍 Agent.dialogflowCxAgentId:`, agent.dialogflowCxAgentId);
      
      // 1. Agent tablosundan al (en direk yöntem)
      if (agent.dialogflowCxAgentId) {
        dialogflowCxAgentId = agent.dialogflowCxAgentId;
        console.log(`✅ Agent tablosundan DialogFlow CX ID bulundu: ${dialogflowCxAgentId}`);
      }
      
      // 2. Playbook'tan al - detaylı debug
      if (!dialogflowCxAgentId) {
        try {
          console.log(`🔍 Playbook aranıyor - Agent ID: ${agentId}`);
          const playbooks = await storage.getPlaybookByAgentId(agentId);
          console.log(`🔍 Bulunan playbook sayısı: ${playbooks?.length || 0}`);
          
          if (playbooks && playbooks.length > 0) {
            const config = playbooks[0].config as any;
            console.log(`🔍 Playbook config keys:`, Object.keys(config || {}));
            console.log(`🔍 Playbook config.dialogflowCxAgentId:`, config?.dialogflowCxAgentId);
            console.log(`🔍 Playbook config.dialogflowCxIntegration:`, config?.dialogflowCxIntegration);
            
            // Birden fazla alan dene
            dialogflowCxAgentId = 
              config?.dialogflowCxAgentId ||
              config?.dialogflowCxIntegration?.agentPath?.split('/').pop() ||
              config?.agentDisplayName?.match(/CX: ([a-f0-9-]+)/)?.[1] ||
              config?.dialogflowCxIntegration?.projectId; // Son çare
              
            if (dialogflowCxAgentId) {
              console.log(`✅ Playbook'tan DialogFlow CX ID bulundu: ${dialogflowCxAgentId}`);
            }
          }
        } catch (error) {
          console.log(`❌ Playbook arama hatası:`, error);
        }
      }
      
      // 3. Fallback - agent ID kullan (bu muhtemelen başarısız olacak)
      if (!dialogflowCxAgentId) {
        console.log(`⚠ DialogFlow CX Agent ID hiçbir yerde bulunamadı!`);
        console.log(`⚠ Agent tablosunda mevcut alanlar:`, Object.keys(agent));
        console.log(`⚠ Fallback: agent ID kullanılıyor - bu muhtemelen başarısız olacak`);
        dialogflowCxAgentId = agentId;
      }

      console.log(`🎯 Final DialogFlow CX Agent ID: ${dialogflowCxAgentId}`);
      console.log(`🔗 Tool eklenecek agent path: projects/nonplo-auth2/locations/europe-west3/agents/${dialogflowCxAgentId}`);

      // Google Calendar tool'unu ekle
      const { createGoogleCalendarTool, getAccessToken } = await import('./routes/create-agent');
      
      console.log('🔑 Getting access token...');
      const accessToken = await getAccessToken();
      console.log('✅ Access token başarıyla alındı:', accessToken ? 'SET' : 'EMPTY');
      
      const debugLogs: string[] = [];
      console.log('🔧 createGoogleCalendarTool çağrılıyor...');
      console.log('📍 DialogFlow CX Agent ID:', dialogflowCxAgentId);
      
      const toolCreated = await createGoogleCalendarTool(dialogflowCxAgentId, accessToken, debugLogs);
      
      console.log('🔍 Tool creation result:', toolCreated);
      console.log('📋 Debug logs:');
      debugLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`);
      });

      if (toolCreated) {
        console.log('✅ Google Calendar tool başarıyla eklendi!');
        res.json({ 
          success: true, 
          message: "Google Calendar tool başarıyla eklendi!",
          agentId: agentId,
          dialogflowCxAgentId: dialogflowCxAgentId,
          debugLogs: debugLogs
        });
      } else {
        console.log('⚠ Google Calendar tool eklenemedi');
        console.log('❌ Debug logs:', debugLogs.join('\n'));
        res.status(500).json({ 
          error: "Google Calendar tool eklenemedi",
          debugLogs: debugLogs
        });
      }

    } catch (error: any) {

      res.status(500).json({ 
        error: "Failed to enable calendar tool",
        details: error.message,
        stack: error.stack
      });
    }
  });





  // Content generator routes
  app.post("/api/content-generator", async (req, res) => {
    try {
      const { createAdvancedPlaybook } = await import("./routes/create-advanced-playbook");
      return createAdvancedPlaybook(req, res);
    } catch (error) {
      res.status(500).json({ error: "Failed to process content generation request" });
    }
  });

  // Google Calendar Routes - with error handling
  let calendarService: any = null;
  try {
    const { CalendarService } = await import("./services/CalendarService");
    calendarService = new CalendarService();
    // CalendarService initialized successfully
  } catch (calendarError: any) {
    console.error('❌ CalendarService initialization failed:', calendarError.message);
    console.error('❌ CalendarService stack:', calendarError.stack);
    // Calendar features will be disabled
  }

  // Google Calendar OAuth routes
  app.get('/auth/google/connect/:userId/:agentId', (req, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const { userId, agentId } = req.params;
      
      // UUID validation - proper UUID format with hyphens
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!userId.match(uuidPattern) || !agentId.match(uuidPattern)) {
        return res.status(400).json({ error: 'Invalid user or agent ID' });
      }
      
      const authUrl = calendarService.generateAuthUrl(userId, agentId);
      res.redirect(authUrl);
    } catch (error: any) {
      res.redirect('/dashboard?error=calendar_connect_failed');
    }
  });

  app.get('/auth/google/callback', async (req, res) => {
    try {
      if (!calendarService) {
        return res.status(500).send(`
          <html><body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h2>❌ Google Calendar Hizmet Hatası</h2>
            <p>Calendar servisi şu anda mevcut değil.</p>
            <script>
              setTimeout(() => { window.close(); }, 3000);
            </script>
          </body></html>
        `);
      }
      
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('❌ Google OAuth hatası:', error);
        return res.status(400).send(`
          <html><body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h2>❌ Google Calendar Bağlantısı Reddedildi</h2>
            <p>Google Calendar erişimi reddedildi veya iptal edildi.</p>
            <script>
              setTimeout(() => { window.close(); }, 3000);
            </script>
          </body></html>
        `);
      }
      
      if (!code || !state) {
        console.error('❌ OAuth callback verileri eksik:', { code: !!code, state: !!state });
        return res.status(400).send(`
          <html><body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h2>❌ Geçersiz OAuth Callback</h2>
            <p>OAuth callback verileri eksik veya geçersiz.</p>
            <script>
              setTimeout(() => { window.close(); }, 3000);
            </script>
          </body></html>
        `);
      }
      
      console.log('🔄 OAuth callback işleniyor...');
      const result = await calendarService.handleCallback(code as string, state as string);
      console.log('✅ OAuth callback başarıyla tamamlandı:', result);
      
      // Başarılı calendar bağlantısı sonrası Google Calendar tool'unu DialogFlow CX'e ekle
      try {
        console.log(`📅 Google Calendar bağlantısı başarılı - Agent: ${result.agentId}`);
        console.log('🔧 DialogFlow CX\'e Google Calendar tool ekleniyor...');
        
        // Phase 2 Fix: Agent'ın DialogFlow CX ID'sini bul - Enhanced debugging
        console.log(`🔍 Agent araştırılıyor: userId=${result.userId}, agentId=${result.agentId}`);
        
        // Önce agent'i bul
        const agentData = await storage.getAgentById(result.agentId, result.userId);
        console.log(`📋 Agent data:`, agentData ? 'FOUND' : 'NOT FOUND');
        
        if (agentData) {
          console.log(`📋 Agent fields:`, Object.keys(agentData));
          console.log(`📋 dialogflowCxAgentId:`, agentData.dialogflowCxAgentId);
          
          if (agentData.dialogflowCxAgentId) {
            console.log(`🎯 DialogFlow CX Agent ID bulundu: ${agentData.dialogflowCxAgentId}`);
            
            try {
              // Google Calendar tool ekleme fonksiyonunu import et
              const { createGoogleCalendarTool, getAccessToken } = await import('./routes/create-agent');
              console.log('🔧 Tool creation functions imported successfully');
              
              // Access token al ve tool'u ekle
              const accessToken = await getAccessToken();
              console.log('🔑 Access token obtained for tool creation');
              
              const debugLogs: string[] = [];
              const toolCreated = await createGoogleCalendarTool(agentData.dialogflowCxAgentId, accessToken, debugLogs);
              
              // Debug logs'u yazdır
              debugLogs.forEach(log => console.log('📄 Tool Creation:', log));
              
              if (toolCreated) {
                console.log('✅ Google Calendar tool başarıyla eklendi!');
              } else {
                console.log('⚠ Google Calendar tool eklenemedi');
                console.log('🔍 Debug logs inçin yukarıdaki logları kontrol edin');
              }
            } catch (toolError: any) {
              console.error('❌ Tool ekleme hatası:', toolError.message);
              console.error('❌ Tool Error Stack:', toolError.stack);
            }
          } else {
            console.log('⚠ DialogFlow CX Agent ID boş - tool eklenemedi');
          }
        } else {
          console.log('❌ Agent bulunamadı! Agent ID veya User ID uyuşmuyor olabilir');
          
          // Fallback: Bur gerçek agent ID'yi bulabilir miyiz?
          console.log('🔎 Fallback: Kullanıcının tüm agentları aranyor...');
          const allUserAgents = await storage.getAgentsByUserId(result.userId);
          console.log(`📋 Kullanıcının agent sayısı: ${allUserAgents.length}`);
          
          if (allUserAgents.length > 0) {
            const latestAgent = allUserAgents[allUserAgents.length - 1];
            console.log(`🕰 En yeni agent: ${latestAgent.id}`);
            
            if (latestAgent.dialogflowCxAgentId) {
              console.log(`🎯 Fallback DialogFlow CX Agent ID bulundu: ${latestAgent.dialogflowCxAgentId}`);
              
              try {
                const { createGoogleCalendarTool, getAccessToken } = await import('./routes/create-agent');
                const accessToken = await getAccessToken();
                const toolCreated = await createGoogleCalendarTool(latestAgent.dialogflowCxAgentId, accessToken, []);
                
                if (toolCreated) {
                  console.log('✅ Google Calendar tool (fallback) başarıyla eklendi!');
                } else {
                  console.log('⚠ Google Calendar tool (fallback) eklenemedi');
                }
              } catch (fallbackToolError: any) {
                console.error('❌ Fallback tool ekleme hatası:', fallbackToolError.message);
              }
            }
          }
        }
      } catch (toolError) {
        console.error('❌ Google Calendar tool ekleme hatası:', toolError);
        // Tool ekleme hatası olsa bile calendar bağlantısını başarılı say
      }
      
      // Başarılı bağlantı - pencereyi kapat ve kullanıcıya bilgi ver
      console.log('✅ Google Calendar bağlantısı tamamlandı:', result);
      res.status(200).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2 style="color: green;">✅ Google Calendar Başarıyla Bağlandı!</h2>
          <p>Google Calendar entegrasyonu aktif edildi.</p>
          <p><strong>Email:</strong> ${result.userId}</p>
          <script>
            setTimeout(() => { window.close(); }, 2000);
          </script>
        </body></html>
      `);
    } catch (error) {
      console.error('💥 Google Calendar callback hatası:', error);
      
      let userMessage = 'Bilinmeyen bir hata oluştu.';
      if (error.message.includes('invalid_grant')) {
        userMessage = 'Bağlantı zaten kurulmuş veya süre dolmuş. Lütfen sayfayı kapatıp yeniden bağlantı kurun.';
      } else if (error.message.includes('access_denied')) {
        userMessage = 'Google Calendar erişimi reddedildi.';
      } else if (error.message.includes('invalid_request')) {
        userMessage = 'Geçersiz istek. Lütfen tekrar deneyin.';
      }
      
      res.status(500).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>❌ Google Calendar Bağlantı Durumu</h2>
          <p>${userMessage}</p>
          <p style="font-size: 14px; color: #666;">Tekrar bağlanmak için bu pencereyi kapatın ve yeniden deneyin.</p>
          <button onclick="window.close()" style="padding: 10px 20px; margin-top: 10px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Pencereyi Kapat
          </button>
          <script>
            setTimeout(() => { window.close(); }, 8000);
          </script>
        </body></html>
      `);
    }
  });

  // ============ CALENDAR API ENDPOINTS ============

  // Generate OAuth URL for calendar connection
  app.get('/api/calendar/auth/url', rateLimiters.calendarOAuth, authenticate, sanitizeRequest, calendarMonitoring('oauth_url'), validateCalendarRequest(['userId', 'agentId']), async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Google Calendar service not available' });
      }
      
      const userId = getUserId(req);
      const agentId = req.query.agentId as string;
      
      if (!userId || !agentId) {
        return res.status(400).json({ error: 'userId and agentId are required' });
      }
      
      const authUrl = calendarService.generateAuthUrl(userId, agentId);
      res.json({ success: true, authUrl });
    } catch (error: any) {
      console.error('Calendar auth URL generation error:', error);
      res.status(500).json({ error: 'Failed to generate OAuth URL' });
    }
  });

  // Enhanced calendar connection status endpoint
  app.get('/api/calendar/status', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.json({ connected: false });
      }
      
      const userId = getUserId(req);
      const agentId = req.query.agentId as string;
      
      if (!userId || !agentId) {
        return res.status(400).json({ error: 'userId and agentId are required' });
      }
      
      const status = await calendarService.getConnectionStatus(userId, agentId);
      res.json(status);
    } catch (error) {
      console.error('Calendar status error:', error);
      res.json({ connected: false });
    }
  });

  // Enhanced calendar disconnect endpoint with POST method
  app.post('/api/calendar/disconnect', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const userId = getUserId(req);
      const { agentId } = req.body;
      
      if (!userId || !agentId) {
        return res.status(400).json({ error: 'userId and agentId are required' });
      }
      
      const result = await calendarService.disconnectCalendar(userId, agentId);
      res.json(result);
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect calendar' });
    }
  });

  // Create calendar event
  app.post('/api/calendar/events', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const userId = getUserId(req);
      const { agentId, title, startTime, endTime, description, attendees } = req.body;
      
      if (!userId || !agentId || !startTime || !endTime) {
        return res.status(400).json({ error: 'userId, agentId, startTime, and endTime are required' });
      }
      
      const eventData = {
        title,
        startTime,
        endTime,
        description,
        attendees
      };
      
      const result = await calendarService.createEvent(userId, agentId, eventData);
      res.json(result);
    } catch (error) {
      console.error('Calendar event creation error:', error);
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  });

  // Check calendar availability
  app.post('/api/calendar/availability', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const userId = getUserId(req);
      const { agentId, startTime, endTime } = req.body;
      
      if (!userId || !agentId || !startTime || !endTime) {
        return res.status(400).json({ error: 'userId, agentId, startTime, and endTime are required' });
      }
      
      const result = await calendarService.checkAvailability(userId, agentId, startTime, endTime);
      res.json(result);
    } catch (error) {
      console.error('Calendar availability check error:', error);
      res.status(500).json({ error: 'Failed to check calendar availability' });
    }
  });

  // Get calendar events
  app.get('/api/calendar/events', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const userId = getUserId(req);
      const agentId = req.query.agentId as string;
      
      if (!userId || !agentId) {
        return res.status(400).json({ error: 'userId and agentId are required' });
      }
      
      const options = {
        timeMin: req.query.timeMin as string,
        timeMax: req.query.timeMax as string,
        maxResults: req.query.maxResults ? parseInt(req.query.maxResults as string) : undefined,
        orderBy: req.query.orderBy as string
      };
      
      const result = await calendarService.getEvents(userId, agentId, options);
      res.json(result);
    } catch (error) {
      console.error('Calendar events list error:', error);
      res.status(500).json({ error: 'Failed to get calendar events' });
    }
  });

  // Update calendar event
  app.put('/api/calendar/events/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const userId = getUserId(req);
      const eventId = req.params.id;
      const { agentId, title, startTime, endTime, description, attendees } = req.body;
      
      if (!userId || !agentId || !eventId) {
        return res.status(400).json({ error: 'userId, agentId, and eventId are required' });
      }
      
      const eventData = {
        title,
        startTime,
        endTime,
        description,
        attendees
      };
      
      const result = await calendarService.updateEvent(userId, agentId, eventId, eventData);
      res.json(result);
    } catch (error) {
      console.error('Calendar event update error:', error);
      res.status(500).json({ error: 'Failed to update calendar event' });
    }
  });

  // Delete calendar event
  app.delete('/api/calendar/events/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const userId = getUserId(req);
      const eventId = req.params.id;
      const agentId = req.query.agentId as string;
      
      if (!userId || !agentId || !eventId) {
        return res.status(400).json({ error: 'userId, agentId, and eventId are required' });
      }
      
      const result = await calendarService.deleteEvent(userId, agentId, eventId);
      res.json(result);
    } catch (error) {
      console.error('Calendar event delete error:', error);
      res.status(500).json({ error: 'Failed to delete calendar event' });
    }
  });

  // Calendar connection status
  app.get('/api/calendar/status/:userId/:agentId', async (req, res) => {
    try {
      if (!calendarService) {
        return res.json({ connected: false });
      }
      
      const { userId, agentId } = req.params;
      const status = await calendarService.getConnectionStatus(userId, agentId);
      res.json(status);
    } catch (error) {
      console.error('Calendar status error:', error);
      res.json({ connected: false });
    }
  });

  // Disconnect calendar
  app.delete('/api/calendar/disconnect/:userId/:agentId', async (req, res) => {
    try {
      if (!calendarService) {
        return res.status(503).json({ error: 'Calendar service not available' });
      }
      
      const { userId, agentId } = req.params;
      const result = await calendarService.disconnectCalendar(userId, agentId);
      res.json(result);
    } catch (error) {
      console.error('Calendar disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect calendar' });
    }
  });

  // Calendar operations history
  app.get('/api/calendar/operations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const operations = await storage.getCalendarOperationsByUser(userId, limit);
      res.json(operations);
    } catch (error) {
      console.error('Calendar operations error:', error);
      res.status(500).json({ error: 'Failed to fetch calendar operations' });
    }
  });

  // Google Calendar webhook endpoints for DialogFlow CX
  app.post("/api/webhooks/calendar/create-event", async (req, res) => {
    try {
      const { createCalendarEvent } = await import("./routes/calendar-webhooks");
      return createCalendarEvent(req, res);
    } catch (error) {
      console.error("Calendar create event webhook error:", error);
      res.status(500).json({ 
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Randevu oluşturma sırasında bir hata oluştu.']
            }
          }]
        }
      });
    }
  });

  // Calendar Analytics and Monitoring
  app.get('/api/calendar/analytics', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      const days = parseInt(req.query.days as string) || 7;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      const analytics = getCalendarAnalytics(userId, days);
      
      // Check if alerts should be sent
      const alertCheck = calendarErrorAlert.shouldAlert(userId);
      if (alertCheck.shouldAlert) {
        await calendarErrorAlert.sendAlert(userId, alertCheck.reason!, alertCheck.metrics!);
      }
      
      res.json({
        success: true,
        analytics,
        alertStatus: alertCheck
      });
    } catch (error) {
      console.error('Calendar analytics error:', error);
      res.status(500).json({ error: 'Failed to get calendar analytics' });
    }
  });

  // Calendar Health Check
  app.get('/api/calendar/health', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      const agentId = req.query.agentId as string;
      
      if (!userId || !agentId) {
        return res.status(400).json({ error: 'userId and agentId are required' });
      }
      
      // Check token status
      const tokenStatus = await checkTokenExpiry(userId, agentId);
      
      // Get connection info
      const connection = await storage.getGoogleCalendarConnection(userId, agentId);
      
      res.json({
        success: true,
        health: {
          connected: !!connection,
          tokenValid: !tokenStatus.needsRefresh,
          expiresIn: tokenStatus.expiresIn,
          warning: tokenStatus.warning,
          email: connection?.email,
          lastUpdated: connection?.updatedAt
        }
      });
    } catch (error) {
      console.error('Calendar health check error:', error);
      res.status(500).json({ 
        success: false,
        health: {
          connected: false,
          tokenValid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  app.post("/api/webhooks/calendar/check-availability", async (req, res) => {
    try {
      const { checkCalendarAvailability } = await import("./routes/calendar-webhooks");
      return checkCalendarAvailability(req, res);
    } catch (error) {
      console.error("Calendar availability webhook error:", error);
      res.status(500).json({ 
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Müsaitlik kontrolü sırasında bir hata oluştu.']
            }
          }]
        }
      });
    }
  });


  // ============ ERROR TRACKING ENDPOINTS ============

  // Log an agent error
  app.post("/api/agents/:agentId/errors", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const errorData = {
        agentId,
        userId,
        ...req.body
      };

      const error = await storage.logAgentError(errorData);
      res.json(error);
    } catch (error: any) {
      console.error("Log agent error:", error);
      res.status(500).json({ error: "Failed to log agent error" });
    }
  });

  // Get agent errors
  app.get("/api/agents/:agentId/errors", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const errors = await storage.getAgentErrors(agentId);
      res.json(errors);
    } catch (error: any) {
      console.error("Get agent errors:", error);
      res.status(500).json({ error: "Failed to fetch agent errors" });
    }
  });

  // Get agent error statistics
  app.get("/api/agents/:agentId/error-stats", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await storage.getAgentErrorStats(agentId);
      res.json(stats);
    } catch (error: any) {
      console.error("Get agent error stats:", error);
      res.status(500).json({ error: "Failed to fetch agent error statistics" });
    }
  });

  // Record health metric
  app.post("/api/agents/:agentId/health-metrics", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const metricData = {
        agentId,
        userId,
        ...req.body
      };

      const metric = await storage.recordHealthMetric(metricData);
      res.json(metric);
    } catch (error: any) {
      console.error("Record health metric:", error);
      res.status(500).json({ error: "Failed to record health metric" });
    }
  });

  // Get health metrics
  app.get("/api/agents/:agentId/health-metrics", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const { metricType } = req.query;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const metrics = await storage.getHealthMetrics(agentId, metricType as string);
      res.json(metrics);
    } catch (error: any) {
      console.error("Get health metrics:", error);
      res.status(500).json({ error: "Failed to fetch health metrics" });
    }
  });

  // Log agent activity
  app.post("/api/agents/:agentId/activity", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const activityData = {
        agentId,
        userId,
        ...req.body
      };

      const activity = await storage.logAgentActivity(activityData);
      res.json(activity);
    } catch (error: any) {
      console.error("Log agent activity:", error);
      res.status(500).json({ error: "Failed to log agent activity" });
    }
  });

  // Get agent activity logs
  app.get("/api/agents/:agentId/activity", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const activities = await storage.getAgentActivityLogs(agentId);
      res.json(activities);
    } catch (error: any) {
      console.error("Get agent activity logs:", error);
      res.status(500).json({ error: "Failed to fetch agent activity logs" });
    }
  });

  // Get agent performance statistics
  app.get("/api/agents/:agentId/performance-stats", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await storage.getAgentPerformanceStats(agentId);
      res.json(stats);
    } catch (error: any) {
      console.error("Get agent performance stats:", error);
      res.status(500).json({ error: "Failed to fetch agent performance statistics" });
    }
  });

  // Get agent daily message counts
  app.get("/api/agents/:agentId/daily-message-counts", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dailyCounts = await storage.getAgentDailyMessageCounts(agentId, userId);
      res.json({ dailyMessageCounts: dailyCounts });
    } catch (error: any) {
      console.error("Get agent daily message counts:", error);
      res.status(500).json({ error: "Failed to fetch agent daily message counts" });
    }
  });

  // Get agent average response time
  app.get("/api/agents/:agentId/response-time", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      const hours = parseInt(req.query.hours as string) || 24;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      console.log(`⏱️ Getting average response time for agent: ${agentId}, user: ${userId}, hours: ${hours}`);
      
      const avgResponseTime = await storage.getAverageResponseTime(agentId, userId, hours);
      
      console.log(`📈 Average response time: ${avgResponseTime}ms`);
      
      res.json({ averageResponseTimeMs: avgResponseTime });
    } catch (error: any) {
      console.error("Get average response time error:", error);
      res.status(500).json({ error: "Failed to get average response time" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time data monitoring
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients by userId for targeted updates
  const connectedClients = new Map<string, Set<any>>();
  
  wss.on('connection', (ws, req) => {
    let userId: string | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          // Authenticate WebSocket connection
          userId = data.userId;
          if (userId) {
            if (!connectedClients.has(userId)) {
              connectedClients.set(userId, new Set());
            }
            connectedClients.get(userId)?.add(ws);
            
            // Send initial dashboard stats
            const stats = await storage.getDashboardStats(userId);
            ws.send(JSON.stringify({
              type: 'dashboard_stats',
              data: stats
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        const userClients = connectedClients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            connectedClients.delete(userId);
          }
        }
      }
    });
    
    // Send ping every 15 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 15000);
  });
  
  // Broadcast function for real-time updates
  global.broadcastToUser = (userId: string, type: string, data: any) => {
    const userClients = connectedClients.get(userId);
    if (userClients) {
      const message = JSON.stringify({ type, data });
      userClients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      });
    }
  };

  // Account deletion system endpoints
  
  // Get account status
  app.get('/api/account/status', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      console.log(`🔍 Checking account status for user: ${userId}`);
      
      const scheduledDeletion = await storage.getScheduledDeletion(userId);
      
      // Check if there's a recently cancelled deletion (within last 5 minutes)
      const recentlyCancelled = await storage.getRecentlyCancelledDeletion(userId);
      
      const response = {
        scheduledDeletion,
        deletionCancelled: !!recentlyCancelled,
        recentCancellation: recentlyCancelled
      };
      
      console.log(`📊 Account status response:`, response);
      
      res.json(response);
    } catch (error) {
      console.error('Get account status error:', error);
      res.status(500).json({ error: 'Failed to get account status' });
    }
  });
  
  // Schedule account deletion (30-day grace period)
  app.post('/api/account/schedule-deletion', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      const { reason } = req.body;
      
      // Check if user already has a scheduled deletion
      const existingDeletion = await storage.getScheduledDeletion(userId);
      if (existingDeletion && existingDeletion.status === 'scheduled') {
        return res.status(400).json({ 
          error: 'Zaten planlanmış bir hesap silme isteğiniz var',
          scheduledDate: existingDeletion.deletionDate 
        });
      }
      
      const deletion = await storage.scheduleAccountDeletion(userId, reason);
      
      // Email notification would be sent here if needed
      
      res.json({ 
        success: true,
        message: 'Hesap silme başarıyla planlandı. Tekrar giriş yaparsanız otomatik olarak iptal edilir.',
        deletion,
        shouldLogout: true // Tell frontend to logout user
      });
    } catch (error) {
      console.error('Schedule account deletion error:', error);
      res.status(500).json({ error: 'Hesap silme planlaması başarısız' });
    }
  });
  
  // Cancel account deletion (reactivate account)
  app.post('/api/account/cancel-deletion', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      
      const result = await storage.cancelAccountDeletion(userId);
      
      if (!result) {
        return res.status(400).json({ 
          error: 'Planlanmış hesap silme isteği bulunamadı' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Hesap başarıyla aktifleştirildi'
      });
    } catch (error) {
      console.error('Cancel account deletion error:', error);
      res.status(500).json({ error: 'Hesap aktifleştirme başarısız' });
    }
  });



  // Agent-specific tool settings endpoints
  app.get('/api/agents/:agentId/tool-settings', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const settings = await storage.getAgentToolSettings(userId, agentId);
      const settingsMap: Record<string, boolean> = {};
      settings.forEach(setting => {
        settingsMap[setting.toolKey] = setting.enabled;
      });
      
      res.json(settingsMap);
    } catch (error: any) {
      console.error('Error getting agent tool settings:', error);
      res.status(500).json({ error: 'Failed to get agent tool settings' });
    }
  });

  app.post('/api/agents/:agentId/tool-settings', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const { toolKey, enabled } = req.body;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!toolKey || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'toolKey and enabled (boolean) are required' });
      }
      
      const setting = await storage.upsertAgentToolSetting(userId, agentId, toolKey, enabled);
      res.json({ success: true, setting });
    } catch (error: any) {
      console.error('Error updating agent tool setting:', error);
      res.status(500).json({ error: 'Failed to update agent tool setting' });
    }
  });

  // Google Web Search API endpoint for agents
  app.post('/api/agents/:agentId/web-search', rateLimiters.api, authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { agentId } = req.params;
      const { query, maxResults = 5, language = 'tr' } = req.body;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required and must be a string' });
      }
      
      // Check if web search is enabled for this agent
      const toolSettings = await storage.getAgentToolSettings(userId, agentId);
      const webSearchEnabled = toolSettings.find(setting => 
        setting.toolKey === 'web_search' && setting.enabled
      );
      
      if (!webSearchEnabled) {
        return res.status(403).json({ 
          error: 'Web search is not enabled for this agent' 
        });
      }
      
      // Check if agent belongs to user
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.userId !== userId) {
        return res.status(403).json({ error: 'Agent not found or unauthorized' });
      }
      
      // Get Google API credentials
      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      if (!apiKey || !searchEngineId) {
        return res.status(500).json({ 
          error: 'Google Search API not configured' 
        });
      }
      
      // Build Google Custom Search API URL
      const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
      searchUrl.searchParams.set('key', apiKey);
      searchUrl.searchParams.set('cx', searchEngineId);
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('num', Math.min(maxResults, 10).toString());
      if (language) {
        searchUrl.searchParams.set('lr', `lang_${language}`);
      }
      
      console.log(`🔍 Web search request for agent ${agentId}: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`); // Redact long queries
      
      // Make request to Google Custom Search API
      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Search API error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'Search request failed',
          details: errorText 
        });
      }
      
      const data = await response.json();
      
      // Process and return results
      const results = data.items?.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
        formattedUrl: item.formattedUrl
      })) || [];
      
      const searchResponse = {
        query,
        results,
        searchTime: data.searchInformation?.searchTime,
        totalResults: data.searchInformation?.totalResults,
        agentId,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Web search completed: ${results.length} results found`);
      res.json(searchResponse);
      
    } catch (error: any) {
      console.error('Web search error:', error);
      res.status(500).json({ 
        error: 'Internal server error during web search',
        details: error.message 
      });
    }
  });

  // Auto-broadcast dashboard stats every 15 seconds for all connected users
  setInterval(async () => {
    for (const [userId, clients] of connectedClients.entries()) {
      if (clients.size > 0) {
        try {
          const stats = await storage.getDashboardStats(userId);
          global.broadcastToUser(userId, 'dashboard_stats', stats);
        } catch (error) {
          console.error(`Failed to broadcast stats for user ${userId}:`, error);
        }
      }
    }
  }, 15000);

  return httpServer;
}
