// Asset optimization utilities for production builds

export interface AssetOptimizationConfig {
  enableWebP: boolean;
  enableBrotli: boolean;
  enableLazyLoading: boolean;
  criticalCSSThreshold: number;
  imageSizeThreshold: number;
}

export class AssetOptimizationService {
  private config: AssetOptimizationConfig = {
    enableWebP: true,
    enableBrotli: true,
    enableLazyLoading: true,
    criticalCSSThreshold: 50 * 1024, // 50KB
    imageSizeThreshold: 100 * 1024,  // 100KB
  };

  // Generate optimization recommendations based on file types and sizes
  analyzeAssets(files: string[]): AssetAnalysis {
    const analysis: AssetAnalysis = {
      totalFiles: files.length,
      totalSize: 0,
      recommendations: [],
      optimizationPotential: 0,
      breakdown: {
        javascript: { count: 0, size: 0 },
        css: { count: 0, size: 0 },
        images: { count: 0, size: 0 },
        fonts: { count: 0, size: 0 },
        other: { count: 0, size: 0 }
      }
    };

    files.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase() || '';
      const estimatedSize = this.estimateFileSize(file);
      analysis.totalSize += estimatedSize;

      // Categorize files
      if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
        analysis.breakdown.javascript.count++;
        analysis.breakdown.javascript.size += estimatedSize;
        
        if (estimatedSize > 500 * 1024) { // 500KB
          analysis.recommendations.push(`Large JavaScript file detected: ${file}. Consider code splitting.`);
        }
      } else if (['css', 'scss', 'sass'].includes(ext)) {
        analysis.breakdown.css.count++;
        analysis.breakdown.css.size += estimatedSize;
        
        if (estimatedSize > this.config.criticalCSSThreshold) {
          analysis.recommendations.push(`Large CSS file detected: ${file}. Consider critical CSS extraction.`);
        }
      } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
        analysis.breakdown.images.count++;
        analysis.breakdown.images.size += estimatedSize;
        
        if (estimatedSize > this.config.imageSizeThreshold && !ext.includes('webp')) {
          analysis.recommendations.push(`Large image detected: ${file}. Consider WebP conversion.`);
        }
      } else if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) {
        analysis.breakdown.fonts.count++;
        analysis.breakdown.fonts.size += estimatedSize;
        
        if (ext !== 'woff2') {
          analysis.recommendations.push(`Font optimization: ${file}. Consider WOFF2 format.`);
        }
      } else {
        analysis.breakdown.other.count++;
        analysis.breakdown.other.size += estimatedSize;
      }
    });

    // Calculate optimization potential
    analysis.optimizationPotential = this.calculateOptimizationPotential(analysis);

    // Add general recommendations
    if (analysis.breakdown.javascript.size > 1024 * 1024) { // 1MB
      analysis.recommendations.push('Consider implementing dynamic imports for large JavaScript bundles.');
    }

    if (analysis.breakdown.images.size > 2 * 1024 * 1024) { // 2MB
      analysis.recommendations.push('Implement lazy loading for images to improve initial page load.');
    }

    return analysis;
  }

  // Frontend optimization patterns
  getOptimizationPatterns(): OptimizationPatterns {
    return {
      codeSplitting: {
        routeBased: `
          // Route-based code splitting
          const DashboardPage = lazy(() => import('./pages/Dashboard'));
          const ProfilePage = lazy(() => import('./pages/Profile'));
          
          // With preloading
          const CriticalPage = lazy(() => 
            import('./pages/Critical').then(module => {
              // Preload related components
              import('./components/CriticalComponent');
              return module;
            })
          );
        `,
        componentBased: `
          // Component-based code splitting
          const HeavyModal = lazy(() => import('./components/HeavyModal'));
          const Chart = lazy(() => import('./components/Chart'));
          
          // Conditional loading
          const AdminPanel = useMemo(() => 
            user.isAdmin ? lazy(() => import('./components/AdminPanel')) : null,
            [user.isAdmin]
          );
        `,
        vendorSplitting: `
          // Manual vendor chunks in Vite
          build: {
            rollupOptions: {
              output: {
                manualChunks: {
                  'react-vendor': ['react', 'react-dom'],
                  'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
                  'utils-vendor': ['lodash', 'date-fns']
                }
              }
            }
          }
        `
      },
      
      assetOptimization: {
        images: `
          // Next-gen image formats with fallbacks
          <picture>
            <source srcset="image.avif" type="image/avif">
            <source srcset="image.webp" type="image/webp">
            <img src="image.jpg" alt="Optimized image" loading="lazy">
          </picture>
          
          // Dynamic image loading
          const ImageComponent = ({ src, alt }) => {
            const [imageSrc, setImageSrc] = useState(src.replace('.jpg', '.webp'));
            
            return (
              <img 
                src={imageSrc} 
                alt={alt}
                onError={() => setImageSrc(src)}
                loading="lazy"
              />
            );
          };
        `,
        fonts: `
          // Font optimization
          <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
          
          // CSS font loading
          @font-face {
            font-family: 'Inter';
            src: url('/fonts/inter.woff2') format('woff2'),
                 url('/fonts/inter.woff') format('woff');
            font-display: swap;
          }
        `,
        css: `
          // Critical CSS inline
          <style>{criticalCSS}</style>
          <link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
          
          // CSS-in-JS optimization
          const StyledComponent = styled.div\`
            \${({ theme }) => theme.breakpoints.mobile} {
              display: none; // Mobile-first approach
            }
          \`;
        `
      },
      
      performanceMonitoring: `
        // Web Vitals monitoring
        import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
        
        const sendToAnalytics = (metric) => {
          // Send to your analytics service
          analytics.track('Web Vital', {
            name: metric.name,
            value: metric.value,
            rating: metric.rating
          });
        };
        
        getCLS(sendToAnalytics);
        getFID(sendToAnalytics);
        getFCP(sendToAnalytics);
        getLCP(sendToAnalytics);
        getTTFB(sendToAnalytics);
      `
    };
  }

  private estimateFileSize(filename: string): number {
    // Simple file size estimation based on file type and name
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const baseSizes: Record<string, number> = {
      'js': 50 * 1024,     // 50KB average
      'ts': 45 * 1024,     // 45KB average  
      'css': 20 * 1024,    // 20KB average
      'jpg': 200 * 1024,   // 200KB average
      'png': 150 * 1024,   // 150KB average
      'svg': 10 * 1024,    // 10KB average
      'woff2': 30 * 1024,  // 30KB average
      'html': 15 * 1024,   // 15KB average
    };
    
    return baseSizes[ext] || 10 * 1024; // Default 10KB
  }

  private calculateOptimizationPotential(analysis: AssetAnalysis): number {
    let potential = 0;
    
    // JavaScript optimization potential (30-50%)
    potential += analysis.breakdown.javascript.size * 0.4;
    
    // CSS optimization potential (20-40%)
    potential += analysis.breakdown.css.size * 0.3;
    
    // Image optimization potential (50-70%)
    potential += analysis.breakdown.images.size * 0.6;
    
    // Font optimization potential (10-30%)
    potential += analysis.breakdown.fonts.size * 0.2;
    
    return Math.round(potential);
  }
}

export interface AssetAnalysis {
  totalFiles: number;
  totalSize: number;
  optimizationPotential: number;
  recommendations: string[];
  breakdown: {
    javascript: { count: number; size: number };
    css: { count: number; size: number };
    images: { count: number; size: number };
    fonts: { count: number; size: number };
    other: { count: number; size: number };
  };
}

export interface OptimizationPatterns {
  codeSplitting: {
    routeBased: string;
    componentBased: string;
    vendorSplitting: string;
  };
  assetOptimization: {
    images: string;
    fonts: string;
    css: string;
  };
  performanceMonitoring: string;
}

export const assetOptimizationService = new AssetOptimizationService();