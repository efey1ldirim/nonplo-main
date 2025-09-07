import { google, calendar_v3 } from 'googleapis';
import { storage } from '../storage';
import { encrypt, decrypt } from '../utils/encryption';
import type { UserGoogleCalendar } from '@shared/schema';

export class CalendarService {
  private oauth2Client: any;

  constructor() {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
    

    
    if (!clientId || !clientSecret || !redirectUri) {
      // OAuth credentials not configured, calendar features will be disabled
      this.oauth2Client = null;
      return;
    }
    
    try {
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );
    } catch (error) {
      this.oauth2Client = null;
    }
  }

  // OAuth URL oluştur
  generateAuthUrl(userId: string, agentId: string): string {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar not configured');
    }
    
    const state = Buffer.from(JSON.stringify({ userId, agentId })).toString('base64');
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      state: state,
      prompt: 'consent'
    });
  }

  // OAuth callback handle et
  async handleCallback(code: string, state: string): Promise<{ userId: string; agentId: string; success: boolean }> {
    try {
      if (!this.oauth2Client) {
        throw new Error('Google Calendar not configured');
      }
      
      const { userId, agentId } = JSON.parse(Buffer.from(state, 'base64').toString());
      
      // Check if already connected to prevent duplicate processing
      const existingConnection = await storage.getGoogleCalendarByUserAgent(userId, agentId);
      if (existingConnection) {
        return { userId, agentId, success: true };
      }
      
      // Token al
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('Access token alınamadı');
      }
      
      // User bilgilerini al
      this.oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const profile = await calendar.calendarList.list();
      
      const primaryCalendar = profile.data.items?.find(cal => cal.primary);
      const email = primaryCalendar?.summary || primaryCalendar?.id || 'Unknown';
      
      try {
        // Token'ları encrypt et
        const encryptedAccessToken = encrypt(tokens.access_token);
        const encryptedRefreshToken = encrypt(tokens.refresh_token!);
        
        // Database'e kaydet
        const calendarConnection = await storage.createGoogleCalendarConnection({
          userId,
          agentId,
          googleEmail: email,
          googleAccessToken: encryptedAccessToken,
          googleRefreshToken: encryptedRefreshToken,
          calendarId: 'primary'
        });
        
        // Kaydı doğrula
        const verifyConnection = await storage.getGoogleCalendarByUserAgent(userId, agentId);
        
      } catch (dbError: any) {
        throw new Error(`Database kayıt hatası: ${dbError.message}`);
      }

      return { userId, agentId, success: true };
    } catch (error: any) {
      throw error; // Routes.ts'teki catch bloğu yakalar
    }
  }

  // Kullanıcının calendar client'ını al
  private async getCalendarClient(userId: string, agentId: string): Promise<calendar_v3.Calendar> {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar service not configured');
    }
    
    const userCalendar = await storage.getGoogleCalendarByUserAgent(userId, agentId);
    
    if (!userCalendar) {
      throw new Error('Google Calendar not connected');
    }

    let accessToken: string;
    let refreshToken: string;
    
    try {
      accessToken = decrypt(userCalendar.googleAccessToken);
      refreshToken = decrypt(userCalendar.googleRefreshToken);
    } catch (decryptError) {
      throw new Error('Calendar tokens corrupted, please reconnect');
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    // Token refresh handling
    this.oauth2Client.on('tokens', async (tokens: any) => {
      if (tokens.access_token) {
        const encryptedAccessToken = encrypt(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined;
        await storage.updateGoogleCalendarTokens(userId, agentId, encryptedAccessToken, encryptedRefreshToken);
      }
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Event oluştur
  async createEvent(userId: string, agentId: string, eventData: {
    title?: string;
    startTime: string;
    endTime: string;
    description?: string;
    attendees?: string[];
  }) {
    try {
      const calendar = await this.getCalendarClient(userId, agentId);
      
      const event: calendar_v3.Schema$Event = {
        summary: eventData.title || 'Randevu',
        start: {
          dateTime: eventData.startTime,
          timeZone: 'Europe/Istanbul'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: 'Europe/Istanbul'
        },
        description: eventData.description,
        attendees: eventData.attendees?.map(email => ({ email }))
      };

      const result = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });

      // İşlemi logla
      await storage.logCalendarOperation({
        userId,
        agentId,
        operationType: 'create_event',
        googleEventId: result.data.id!,
        inputData: eventData,
        resultData: result.data,
        success: true
      });

      return {
        success: true,
        eventId: result.data.id,
        calendarLink: result.data.htmlLink,
        message: 'Randevunuz başarıyla oluşturuldu!'
      };

    } catch (error: any) {
      await storage.logCalendarOperation({
        userId,
        agentId,
        operationType: 'create_event',
        inputData: eventData,
        success: false,
        errorMessage: error.message
      });

      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  // Müsaitlik kontrol et
  async checkAvailability(userId: string, agentId: string, startTime: string, endTime: string) {
    try {
      const calendar = await this.getCalendarClient(userId, agentId);
      
      const freeBusyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          items: [{ id: 'primary' }]
        }
      });

      const busyTimes = freeBusyResponse.data.calendars?.primary?.busy || [];
      
      // İşlemi logla
      await storage.logCalendarOperation({
        userId,
        agentId,
        operationType: 'check_availability',
        inputData: { startTime, endTime },
        resultData: { busyTimes, isAvailable: busyTimes.length === 0 },
        success: true
      });
      
      return {
        isAvailable: busyTimes.length === 0,
        busyTimes: busyTimes
      };
    } catch (error: any) {
      await storage.logCalendarOperation({
        userId,
        agentId,
        operationType: 'check_availability',
        inputData: { startTime, endTime },
        success: false,
        errorMessage: error.message
      });

      throw error;
    }
  }

  // Calendar bağlantı durumunu kontrol et
  async getConnectionStatus(userId: string, agentId: string) {
    try {
      const connection = await storage.getGoogleCalendarByUserAgent(userId, agentId);
      
      if (connection) {
        return {
          connected: true,
          email: connection.googleEmail,
          connectedAt: connection.createdAt
        };
      } else {
        return { connected: false };
      }
    } catch (error) {
      console.error('[CalendarService] Error checking connection status:', error);
      return { connected: false };
    }
  }

  // Calendar bağlantısını kes
  async disconnectCalendar(userId: string, agentId: string) {
    await storage.disconnectGoogleCalendar(userId, agentId);
    return { success: true, message: 'Google Calendar bağlantısı kesildi' };
  }

  private getErrorMessage(error: any): string {
    if (error.message.includes('invalid_grant')) {
      return 'Google Calendar bağlantınızın süresi dolmuş. Lütfen yeniden bağlanın.';
    }
    if (error.message.includes('Rate Limit')) {
      return 'Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.';
    }
    if (error.message.includes('not found')) {
      return 'Takvim bulunamadı. Lütfen Google Calendar ayarlarınızı kontrol edin.';
    }
    return 'Calendar işlemi başarısız oldu. Lütfen tekrar deneyin.';
  }
}