import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect, useState } from 'react';
import { useLoginNotifications } from "./hooks/useLoginNotifications";
import { initGA } from "./lib/analytics";
import RouterWrapper from "./components/RouterWrapper";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { queryClient } from "@/lib/queryClient";

const AppInsideRouter = () => {
  // Router-dependent hooks must be called inside Router context
  useLoginNotifications();
  
  const [showChatTooltip, setShowChatTooltip] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  
  // Don't show chat widget on dashboard page
  const shouldShowChat = !location.pathname.startsWith('/dashboard');
  
  return (
    <>
      <RouterWrapper />
      
      {/* Global Live Chat Widget - Hidden on dashboard page */}
      {shouldShowChat && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="relative">
            {showChatTooltip && (
              <div className="absolute bottom-full right-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                <p className="text-sm text-foreground">Yardıma mı ihtiyacınız var? Bizimle sohbet edin.</p>
                <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-background border-r border-b border-border"></div>
              </div>
            )}
            <Button
              className="w-12 h-12 rounded-full shadow-lg hover:scale-105 transition-all pl-[0px] pr-[0px] pt-[0px] pb-[0px]"
              onMouseEnter={() => setShowChatTooltip(true)}
              onMouseLeave={() => setShowChatTooltip(false)}
              onClick={() => toast({ title: "Sohbet widget'ı", description: "Canlı sohbet özelliği yakında geliyor!" })}
              data-testid="button-global-chat"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

const AppContent = () => {
  // Initialize Google Analytics and global error handling
  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
    
    // Global error handling for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Handle fetch abort errors (these are expected during navigation)
      if (error?.name === 'AbortError' || 
          error?.message?.includes('aborted') ||
          error?.message === 'Fetch is aborted') {
        console.log('🔄 Fetch request was aborted (expected behavior)');
        event.preventDefault(); // Prevent the error from showing in console
        return;
      }
      
      // Handle WebSocket DOMException errors (these are expected)
      if (error instanceof DOMException) {
        console.log('📡 WebSocket/DOM exception (expected behavior):', error.message);
        event.preventDefault(); // Prevent the error from showing in console
        return;
      }
      
      // For other errors, log them but don't prevent console display
      console.warn('🚨 Unhandled promise rejection caught by global handler:', error);
    };
    
    // Add global error handler
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return (
    <BrowserRouter>
      <AppInsideRouter />
    </BrowserRouter>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <AppContent />
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;