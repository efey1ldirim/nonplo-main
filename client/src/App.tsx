import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { useEffect } from 'react';
import { useLoginNotifications } from "./hooks/useLoginNotifications";
import { initGA } from "./lib/analytics";
import RouterWrapper from "./components/RouterWrapper";
import ContactFormDialog from "@/components/dialogs/ContactFormDialog";
import { MessageCircle } from "lucide-react";

import { queryClient } from "@/lib/queryClient";

const AppInsideRouter = () => {
  // Router-dependent hooks must be called inside Router context
  useLoginNotifications();
  return <RouterWrapper />;
};

const AppContent = () => {
  // Initialize Google Analytics (before Router - safe)
  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);
  
  return (
    <BrowserRouter>
      <AppInsideRouter />
      
      {/* Global Live Support Button - Always Visible */}
      <ContactFormDialog>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-50 bg-primary hover:bg-primary/90"
          data-testid="button-global-live-support"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Canlı Destek</span>
        </Button>
      </ContactFormDialog>
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