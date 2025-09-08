import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from 'react';
import ProtectedRoute from "./components/ProtectedRoute";
import { useLoginNotifications } from "./hooks/useLoginNotifications";

// Immediate load components (critical for initial page load)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load components for better performance
const Pricing = lazy(() => import("./pages/Pricing"));
const Account = lazy(() => import("./pages/Account"));
const Builder = lazy(() => import("./pages/Builder"));
const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const DashboardAgents = lazy(() => import("./pages/dashboard/DashboardAgents"));
const DashboardMessages = lazy(() => import("./pages/dashboard/DashboardMessages"));
const DashboardIntegrations = lazy(() => import("./pages/dashboard/DashboardIntegrations"));
const DashboardSettings = lazy(() => import("./pages/dashboard/DashboardSettings"));
const DashboardAgentDetail = lazy(() => import("./pages/dashboard/DashboardAgentDetail"));
const Documentation = lazy(() => import("./pages/resources/Documentation"));
const DocumentationArticle = lazy(() => import("./pages/resources/DocumentationArticle"));
const Blog = lazy(() => import("./pages/resources/Blog"));
const BlogArticle = lazy(() => import("./pages/resources/BlogArticle"));
const VideoTutorials = lazy(() => import("./pages/resources/VideoTutorials"));
const VideoTutorialArticle = lazy(() => import("./pages/resources/VideoTutorialArticle"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
const ChatPage = lazy(() => import("./pages/ChatPage").then(module => ({ default: module.ChatPage })));
const DevTestLogin = lazy(() => import("./pages/DevTestLogin").then(module => ({ default: module.DevTestLogin })));

import { queryClient } from "@/lib/queryClient";

// Loading component for lazy loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Sayfa yükleniyor...</p>
    </div>
  </div>
);

const AppContent = () => {
  useLoginNotifications();
  
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/builder" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
          <Route path="/chat/:agentId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="agents" element={<DashboardAgents />} />
            <Route path="agents/:agentId" element={<DashboardAgentDetail />} />
            <Route path="messages" element={<DashboardMessages />} />
            <Route path="integrations" element={<DashboardIntegrations />} />
            <Route path="settings" element={<DashboardSettings />} />

          </Route>
          <Route path="/resources/documentation" element={<Documentation />} />
          <Route path="/resources/documentation/:sectionId/:articleIndex" element={<DocumentationArticle />} />
          <Route path="/resources/blog" element={<Blog />} />
          <Route path="/resources/blog/:articleId" element={<BlogArticle />} />
          <Route path="/resources/videos" element={<VideoTutorials />} />
          <Route path="/resources/videos/:videoId" element={<VideoTutorialArticle />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/account/deletion" element={<ProtectedRoute><AccountDeletion /></ProtectedRoute>} />
          <Route path="/dev-test-login" element={<DevTestLogin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
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
