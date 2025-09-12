import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { useEffect } from 'react';
import { useLoginNotifications } from "./hooks/useLoginNotifications";
import { initGA } from "./lib/analytics";
import RouterWrapper from "./components/RouterWrapper";

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
    </BrowserRouter>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;