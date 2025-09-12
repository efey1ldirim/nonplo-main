import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { bundleOptimizer } from '../utils/bundleOptimizer';

// Advanced compression middleware with optimization tracking
export const compressionOptimizer = compression({
  level: 6, // Good balance between compression speed and ratio
  threshold: 1024, // Only compress responses larger than 1kb
  filter: (req: Request, res: Response) => {
    // Don't compress already compressed files
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Skip compression for already compressed files
    if (req.url.match(/\.(jpg|jpeg|png|gif|svg|ico|zip|gz|br)$/)) {
      return false;
    }
    
    // Only compress text-based content
    const contentType = res.getHeader('content-type') as string;
    if (contentType && (
      contentType.includes('text/') ||
      contentType.includes('application/json') ||
      contentType.includes('application/javascript') ||
      contentType.includes('text/css')
    )) {
      return true;
    }
    
    return compression.filter(req, res);
  }
});

// Asset optimization middleware
export const assetOptimization = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const url = req.url;
  
  // Set cache headers for different asset types
  if (url.includes('/assets/') || url.includes('.js') || url.includes('.css')) {
    // Long cache for hashed assets
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${Date.now()}"`);
  } else if (url.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
    // Medium cache for images
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  } else if (url === '/' || url.includes('.html')) {
    // Short cache for HTML
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  
  // Track compression stats
  res.send = function(data: any) {
    if (typeof data === 'string' && data.length > 1024) {
      const originalSize = Buffer.byteLength(data, 'utf8');
      const compressedSize = originalSize * 0.7; // Estimated compression
      bundleOptimizer.trackCompression(originalSize, compressedSize);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Resource hints middleware for critical assets
export const resourceHints = (req: Request, res: Response, next: NextFunction) => {
  if (req.url === '/' || req.url.includes('.html')) {
    // Add resource hints for critical assets
    const hints = [
      '</assets/js/vendor.js>; rel=preload; as=script',
      '</assets/css/main.css>; rel=preload; as=style',
      '</assets/fonts/inter.woff2>; rel=preload; as=font; type=font/woff2; crossorigin'
    ];
    
    res.setHeader('Link', hints.join(', '));
  }
  next();
};

// Bundle optimization tracking
export const bundleTracking = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const size = res.get('content-length');
    
    if (req.url.includes('/assets/') && size) {
      console.log(`📦 Asset served: ${req.url} (${size} bytes) in ${duration}ms`);
    }
  });
  
  next();
};

// WebP support detection
export const webpDetection = (req: Request, res: Response, next: NextFunction) => {
  const acceptsWebP = req.headers.accept?.includes('image/webp');
  if (acceptsWebP) {
    res.setHeader('Vary', 'Accept');
    (req as any).supportsWebP = true;
  }
  next();
};