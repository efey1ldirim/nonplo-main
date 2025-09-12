import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./config/vite";
import { setupStorageBucket } from "./database/setup-storage";
import { 
  healthCheckFastPath, 
  optimizedRequestLogger,
  conditionalJsonParser,
  requestOptimizer,
  earlyRequestFilter,
  responseCacheHeaders 
} from "./middleware/requestOptimizer";
import { 
  compressionOptimizer,
  assetOptimization,
  resourceHints,
  bundleTracking,
  webpDetection 
} from "./middleware/compressionOptimizer";
import { memoryManager } from "./performance/memoryManager";

const app = express();

// Apply optimized middleware stack
app.use(earlyRequestFilter);           // Block malicious requests early
app.use(healthCheckFastPath);          // Fast path for health checks
app.use(compressionOptimizer);         // Gzip/Brotli compression
app.use(assetOptimization);            // Asset caching and optimization
app.use(resourceHints);                // Preload hints for critical assets
app.use(webpDetection);                // WebP support detection
app.use(bundleTracking);               // Bundle performance tracking
app.use(responseCacheHeaders);         // Set cache headers
app.use(requestOptimizer);             // Connection and header optimization

// Conditional JSON parsing - only for requests that need it
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    express.json({ limit: '50mb' })(req, res, next);
  } else {
    next();
  }
});

app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(optimizedRequestLogger);       // Optimized logging

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack trace:', reason);
  }
});

// Global uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // Exit gracefully in case of uncaught exception
  process.exit(1);
});

(async () => {
  try {
    // Setup storage bucket
    await setupStorageBucket();
    
    // Initialize memory manager for leak prevention and optimization
    console.log('🧠 Memory manager initialized');
    // Memory manager starts monitoring automatically in constructor
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      
      // Log error instead of throwing to prevent unhandled promise rejections
      console.error("Express error handler:", err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('🚨 Server initialization failed:', error);
    process.exit(1);
  }
})();
