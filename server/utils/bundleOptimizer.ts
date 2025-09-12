import { Request, Response, NextFunction } from 'express';

// Bundle optimization utilities
export class BundleOptimizer {
  private static instance: BundleOptimizer;
  private compressionStats = {
    originalSize: 0,
    compressedSize: 0,
    requests: 0,
  };

  static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  // Asset optimization middleware
  assetOptimization() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      
      res.send = function(data: any) {
        // Add cache headers for static assets
        if (req.url.includes('/assets/') || req.url.includes('.js') || req.url.includes('.css')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('ETag', `"${Date.now()}"`);
        }
        
        // Add compression headers
        if (typeof data === 'string' && data.length > 1024) {
          res.setHeader('Content-Encoding', 'gzip');
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }

  // Resource hints for critical assets
  resourceHints() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.url === '/' || req.url.includes('.html')) {
        // Add resource hints for critical assets
        res.setHeader('Link', [
          '</assets/js/vendor.js>; rel=preload; as=script',
          '</assets/css/main.css>; rel=preload; as=style',
          '</assets/fonts/inter.woff2>; rel=preload; as=font; type=font/woff2; crossorigin'
        ].join(', '));
      }
      next();
    };
  }

  // Service Worker registration headers
  serviceWorkerHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.url.includes('sw.js') || req.url.includes('service-worker.js')) {
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache');
      }
      next();
    };
  }

  // Bundle analysis endpoint
  getBundleStats() {
    return {
      compression: this.compressionStats,
      recommendations: this.generateRecommendations(),
      performance: {
        averageCompressionRatio: this.compressionStats.originalSize > 0 
          ? Math.round((1 - this.compressionStats.compressedSize / this.compressionStats.originalSize) * 100)
          : 0,
        totalRequests: this.compressionStats.requests,
      }
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const compressionRatio = this.compressionStats.originalSize > 0 
      ? (1 - this.compressionStats.compressedSize / this.compressionStats.originalSize) * 100
      : 0;

    if (compressionRatio < 30) {
      recommendations.push('Consider enabling gzip/brotli compression for better performance');
    }
    
    if (this.compressionStats.requests > 1000) {
      recommendations.push('High asset request volume detected. Consider implementing CDN.');
    }
    
    recommendations.push('Implement code splitting for better loading performance');
    recommendations.push('Consider lazy loading non-critical components');
    
    if (recommendations.length === 0) {
      recommendations.push('Bundle optimization is working well!');
    }
    
    return recommendations;
  }

  // Track compression stats
  trackCompression(originalSize: number, compressedSize: number) {
    this.compressionStats.originalSize += originalSize;
    this.compressionStats.compressedSize += compressedSize;
    this.compressionStats.requests++;
  }
}

export const bundleOptimizer = BundleOptimizer.getInstance();

// Image optimization utility
export class ImageOptimizer {
  // WebP detection middleware
  static webpDetection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const acceptsWebP = req.headers.accept?.includes('image/webp');
      if (acceptsWebP) {
        res.setHeader('Vary', 'Accept');
        (req as any).supportsWebP = true;
      }
      next();
    };
  }

  // Lazy loading headers
  static lazyLoadingHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.url.includes('/images/') || req.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      next();
    };
  }
}

// Frontend optimization hints
export const frontendOptimizationTips = {
  codesplitting: `
    // Example: Route-based code splitting
    const LazyComponent = lazy(() => import('./LazyComponent'));
    
    // Preload critical components
    const CriticalComponent = lazy(() => 
      import('./CriticalComponent').then(module => {
        // Preload related components
        import('./RelatedComponent');
        return module;
      })
    );
  `,
  
  assetOptimization: `
    // Use dynamic imports for large libraries
    const moment = await import('moment');
    
    // Optimize images with next-gen formats
    <picture>
      <source srcset="image.webp" type="image/webp">
      <img src="image.jpg" alt="optimized image" loading="lazy">
    </picture>
  `,
  
  performanceMonitoring: `
    // Monitor Core Web Vitals
    import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
    
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  `
};