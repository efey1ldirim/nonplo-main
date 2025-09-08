export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface CustomError {
  type: ErrorType;
  message: string;
  userMessage: string; // Turkish user-friendly message
  statusCode: number;
  details?: any;
  retryable?: boolean;
}

export class ErrorHandler {
  static createError(
    type: ErrorType, 
    message: string, 
    userMessage: string, 
    statusCode: number = 500,
    details?: any,
    retryable: boolean = false
  ): CustomError {
    return {
      type,
      message,
      userMessage,
      statusCode,
      details,
      retryable
    };
  }

  // Google Calendar specific errors
  static handleGoogleCalendarError(error: any): CustomError {
    if (error.code === 401) {
      return this.createError(
        ErrorType.AUTHENTICATION_ERROR,
        'Google Calendar authentication failed',
        'Google Calendar bağlantınızın süresi dolmuş. Lütfen yeniden bağlanın.',
        401,
        error
      );
    }
    
    if (error.code === 403) {
      if (error.message?.includes('Daily Limit Exceeded')) {
        return this.createError(
          ErrorType.RATE_LIMIT_ERROR,
          'Google Calendar daily limit exceeded',
          'Google Calendar günlük kullanım limitine ulaşıldı. Lütfen yarın tekrar deneyin.',
          429,
          error
        );
      }
      return this.createError(
        ErrorType.AUTHORIZATION_ERROR,
        'Google Calendar permission denied',
        'Google Calendar erişim izni bulunamadı. Lütfen yeniden bağlanın.',
        403,
        error
      );
    }

    if (error.code === 429) {
      return this.createError(
        ErrorType.RATE_LIMIT_ERROR,
        'Google Calendar rate limit exceeded',
        'Google Calendar API limite ulaşıldı. Lütfen daha sonra tekrar deneyin.',
        429,
        error,
        true
      );
    }

    if (error.code === 500 || error.code === 503) {
      return this.createError(
        ErrorType.EXTERNAL_API_ERROR,
        'Google Calendar service unavailable',
        'Google Calendar servisi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
        503,
        error,
        true
      );
    }

    return this.createError(
      ErrorType.EXTERNAL_API_ERROR,
      `Google Calendar error: ${error.message}`,
      'Google Calendar ile bağlantı kurulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
      500,
      error,
      true
    );
  }

  // OpenAI specific errors
  static handleOpenAIError(error: any): CustomError {
    if (error.status === 401) {
      return this.createError(
        ErrorType.AUTHENTICATION_ERROR,
        'OpenAI API key invalid',
        'AI servisi kimlik doğrulama hatası. Lütfen sistem yöneticisine başvurun.',
        401,
        error
      );
    }

    if (error.status === 429) {
      return this.createError(
        ErrorType.RATE_LIMIT_ERROR,
        'OpenAI rate limit exceeded',
        'AI servisi kullanım limitine ulaşıldı. Lütfen birkaç dakika sonra tekrar deneyin.',
        429,
        error,
        true
      );
    }

    if (error.status === 503 || error.status === 502) {
      return this.createError(
        ErrorType.EXTERNAL_API_ERROR,
        'OpenAI service unavailable',
        'AI servisi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
        503,
        error,
        true
      );
    }

    if (error.message?.includes('timeout')) {
      return this.createError(
        ErrorType.TIMEOUT_ERROR,
        'OpenAI request timeout',
        'AI yanıt süresi aşıldı. Lütfen tekrar deneyin.',
        408,
        error,
        true
      );
    }

    return this.createError(
      ErrorType.EXTERNAL_API_ERROR,
      `OpenAI error: ${error.message}`,
      'AI servisi ile iletişim kurarken bir hata oluştu. Lütfen tekrar deneyin.',
      500,
      error,
      true
    );
  }

  // Database specific errors
  static handleDatabaseError(error: any): CustomError {
    if (error.code === '23505') { // Unique constraint violation
      return this.createError(
        ErrorType.VALIDATION_ERROR,
        'Duplicate entry',
        'Bu kayıt zaten mevcut. Lütfen farklı bir değer deneyin.',
        409,
        error
      );
    }

    if (error.code === '23503') { // Foreign key constraint violation
      return this.createError(
        ErrorType.VALIDATION_ERROR,
        'Foreign key constraint violation',
        'İlişkili kayıt bulunamadı. Lütfen geçerli bir değer seçin.',
        400,
        error
      );
    }

    if (error.code === '42P01') { // Table doesn't exist
      return this.createError(
        ErrorType.INTERNAL_ERROR,
        'Database table missing',
        'Sistem yapılandırması eksik. Lütfen sistem yöneticisine başvurun.',
        500,
        error
      );
    }

    if (error.message?.includes('timeout')) {
      return this.createError(
        ErrorType.TIMEOUT_ERROR,
        'Database query timeout',
        'Veritabanı yanıt vermiyor. Lütfen daha sonra tekrar deneyin.',
        408,
        error,
        true
      );
    }

    return this.createError(
      ErrorType.DATABASE_ERROR,
      `Database error: ${error.message}`,
      'Veritabanı hatası oluştu. Lütfen daha sonra tekrar deneyin.',
      500,
      error,
      true
    );
  }

  // Network and generic errors
  static handleNetworkError(error: any): CustomError {
    if (error.code === 'ECONNREFUSED') {
      return this.createError(
        ErrorType.NETWORK_ERROR,
        'Connection refused',
        'Servise bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.',
        503,
        error,
        true
      );
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return this.createError(
        ErrorType.NETWORK_ERROR,
        'Network timeout or DNS error',
        'Ağ bağlantısında sorun var. Lütfen internet bağlantınızı kontrol edin.',
        503,
        error,
        true
      );
    }

    return this.createError(
      ErrorType.NETWORK_ERROR,
      `Network error: ${error.message}`,
      'Ağ bağlantısında bir sorun oluştu. Lütfen tekrar deneyin.',
      503,
      error,
      true
    );
  }

  // Auto-classify errors
  static classifyError(error: any): CustomError {
    // Check for specific service errors first
    if (error.response?.config?.url?.includes('calendar.google.com') || 
        error.config?.url?.includes('calendar.google.com')) {
      return this.handleGoogleCalendarError(error);
    }

    if (error.response?.config?.url?.includes('openai.com') || 
        error.config?.url?.includes('openai.com') ||
        error.message?.includes('OpenAI')) {
      return this.handleOpenAIError(error);
    }

    // Check for database errors
    if (error.code && (error.code.startsWith('23') || error.code.startsWith('42'))) {
      return this.handleDatabaseError(error);
    }

    // Check for network errors
    if (error.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return this.handleNetworkError(error);
    }

    // Default fallback
    return this.createError(
      ErrorType.INTERNAL_ERROR,
      error.message || 'Unknown error',
      'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
      500,
      error,
      true
    );
  }
}