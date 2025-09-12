import { Request, Response, NextFunction } from 'express';

/**
 * Fast path middleware for health checks and monitoring endpoints
 * Bypasses heavy processing for frequently accessed endpoints
 */
export const healthCheckFastPath = (req: Request, res: Response, next: NextFunction) => {
  // Fast response for health checks without JSON parsing or logging
  if (req.method === 'HEAD' && req.path === '/api') {
    res.setHeader('X-Health-Check', 'OK');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).end();
  }
  
  // Fast response for basic health endpoint
  if (req.method === 'GET' && req.path === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).json({ status: 'healthy', timestamp: Date.now() });
  }
  
  next();
};

/**
 * Optimized request logging with reduced overhead for frequent requests
 */
export const optimizedRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Skip detailed logging for health checks and monitoring
  const skipDetailedLogging = req.method === 'HEAD' || 
                              req.path === '/api/health' ||
                              req.path.startsWith('/api/monitoring');
  
  if (skipDetailedLogging) {
    return next();
  }
  
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Only capture JSON for API endpoints that might need it
  if (path.startsWith('/api/') && !path.includes('/static')) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log response for errors or slow requests
      if (capturedJsonResponse && (res.statusCode >= 400 || duration > 100)) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
};

/**
 * Conditional JSON parsing based on request type
 */
export const conditionalJsonParser = (req: Request, res: Response, next: NextFunction) => {
  // Skip JSON parsing for requests that don't need it
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return next();
  }
  
  // Skip for non-JSON content types
  const contentType = req.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return next();
  }
  
  next();
};

/**
 * Request compression and optimization
 */
export const requestOptimizer = (req: Request, res: Response, next: NextFunction) => {
  // Set optimal headers for performance
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable compression for text responses
  if (req.headers['accept-encoding']?.includes('gzip')) {
    res.setHeader('Vary', 'Accept-Encoding');
  }
  
  // Optimize connection handling
  if (req.httpVersion === '1.1') {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  }
  
  next();
};

/**
 * Early request filtering for invalid requests
 */
export const earlyRequestFilter = (req: Request, res: Response, next: NextFunction) => {
  // Block obviously malicious requests early
  const suspiciousPatterns = [
    /\.php$/,
    /\.asp$/,
    /wp-admin/,
    /wp-login/,
    /phpmyadmin/,
    /admin\.php/,
    /\.env$/,
    /config\.php$/
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(req.path))) {
    return res.status(404).end();
  }
  
  // Validate content length for POST/PUT requests
  if ((req.method === 'POST' || req.method === 'PUT') && req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength > 50 * 1024 * 1024) { // 50MB limit
      return res.status(413).json({ error: 'Request too large' });
    }
  }
  
  next();
};

/**
 * Response caching headers for static content
 */
export const responseCacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set cache headers for static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000 * 1000).toUTCString());
  }
  
  // No cache for API endpoints by default
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};