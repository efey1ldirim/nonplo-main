import { Routes, Route } from "react-router-dom";
import { lazy, memo, Suspense } from 'react';
import ProtectedRoute from "./ProtectedRoute";
import { useAnalytics } from "../hooks/use-analytics";

// Immediate load components (critical for initial page load)
import Index from "../pages/Index";
import Auth from "../pages/Auth";
import NotFound from "../pages/NotFound";

// High priority components - preload with higher priority
const Pricing = lazy(() => import("../pages/Pricing"));
const Account = lazy(() => 
  import("../pages/Account").then(module => {
    // Preload common dashboard components when account page loads
    import("./layout/DashboardLayout");
    return module;
  })
);

// Dashboard components - load together for better UX
const DashboardLayout = lazy(() => import("./layout/DashboardLayout"));
const DashboardHome = lazy(() => import("../pages/dashboard/DashboardHome"));
const DashboardAgents = lazy(() => import("../pages/dashboard/DashboardAgents"));
const DashboardMessages = lazy(() => import("../pages/dashboard/DashboardMessages"));
const DashboardIntegrations = lazy(() => import("../pages/dashboard/DashboardIntegrations"));
const DashboardSettings = lazy(() => import("../pages/dashboard/DashboardSettings"));
const DashboardAgentDetail = lazy(() => import("../pages/dashboard/DashboardAgentDetail"));

// Builder and Chat - important features
const Builder = lazy(() => import("../pages/Builder"));
const ChatPage = lazy(() => import("../pages/ChatPage").then(module => ({ default: module.ChatPage })));

// Documentation and resources - lower priority
const Documentation = lazy(() => import("../pages/resources/Documentation"));
const DocumentationArticle = lazy(() => import("../pages/resources/DocumentationArticle"));
const Blog = lazy(() => import("../pages/resources/Blog"));
const BlogArticle = lazy(() => import("../pages/resources/BlogArticle"));
const VideoTutorials = lazy(() => import("../pages/resources/VideoTutorials"));
const VideoTutorialArticle = lazy(() => import("../pages/resources/VideoTutorialArticle"));

// Legal pages - lowest priority  
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("../pages/TermsOfService"));
const CookiePolicy = lazy(() => import("../pages/CookiePolicy"));
const AccountDeletion = lazy(() => import("../pages/AccountDeletion"));
const DevTestLogin = lazy(() => import("../pages/DevTestLogin").then(module => ({ default: module.DevTestLogin })));

// Enhanced loading components for different scenarios
const PageLoader = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-primary/20 rounded-full animate-pulse"></div>
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-foreground">Sayfa yükleniyor...</p>
        <p className="text-xs text-muted-foreground">Performans için optimize ediliyor</p>
      </div>
    </div>
  </div>
));

// Fast loader for dashboard components
const DashboardLoader = memo(() => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between pb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6 border rounded-lg space-y-4">
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

// Minimal loader for quick transitions
const QuickLoader = memo(() => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
));

const RouterWrapper = () => {
  // Track page views when routes change - now inside Router context
  useAnalytics();

  return (
    <Routes>
      {/* Critical routes - no lazy loading */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="*" element={<NotFound />} />

      {/* High priority routes */}
      <Route path="/pricing" element={
        <Suspense fallback={<QuickLoader />}>
          <Pricing />
        </Suspense>
      } />

      {/* Account and Builder - important user functions */}
      <Route path="/account" element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Account />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/builder" element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <Builder />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Chat functionality */}
      <Route path="/chat/:agentId" element={
        <ProtectedRoute>
          <Suspense fallback={<QuickLoader />}>
            <ChatPage />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Dashboard routes - use dashboard-specific loader */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Suspense fallback={<DashboardLoader />}>
            <DashboardLayout />
          </Suspense>
        </ProtectedRoute>
      }>
        <Route index element={
          <Suspense fallback={<QuickLoader />}>
            <DashboardHome />
          </Suspense>
        } />
        <Route path="agents" element={
          <Suspense fallback={<QuickLoader />}>
            <DashboardAgents />
          </Suspense>
        } />
        <Route path="agents/:agentId" element={
          <Suspense fallback={<QuickLoader />}>
            <DashboardAgentDetail />
          </Suspense>
        } />
        <Route path="messages" element={
          <Suspense fallback={<QuickLoader />}>
            <DashboardMessages />
          </Suspense>
        } />
        <Route path="integrations" element={
          <Suspense fallback={<QuickLoader />}>
            <DashboardIntegrations />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<QuickLoader />}>
            <DashboardSettings />
          </Suspense>
        } />
      </Route>

      {/* Resource routes - lower priority loading */}
      <Route path="/resources/documentation" element={
        <Suspense fallback={<PageLoader />}>
          <Documentation />
        </Suspense>
      } />
      <Route path="/resources/documentation/:sectionId/:articleIndex" element={
        <Suspense fallback={<QuickLoader />}>
          <DocumentationArticle />
        </Suspense>
      } />
      <Route path="/resources/blog" element={
        <Suspense fallback={<PageLoader />}>
          <Blog />
        </Suspense>
      } />
      <Route path="/resources/blog/:articleId" element={
        <Suspense fallback={<QuickLoader />}>
          <BlogArticle />
        </Suspense>
      } />
      <Route path="/resources/videos" element={
        <Suspense fallback={<PageLoader />}>
          <VideoTutorials />
        </Suspense>
      } />
      <Route path="/resources/videos/:videoId" element={
        <Suspense fallback={<QuickLoader />}>
          <VideoTutorialArticle />
        </Suspense>
      } />

      {/* Legal pages - minimal loading */}
      <Route path="/privacy-policy" element={
        <Suspense fallback={<QuickLoader />}>
          <PrivacyPolicy />
        </Suspense>
      } />
      <Route path="/terms-of-service" element={
        <Suspense fallback={<QuickLoader />}>
          <TermsOfService />
        </Suspense>
      } />
      <Route path="/cookie-policy" element={
        <Suspense fallback={<QuickLoader />}>
          <CookiePolicy />
        </Suspense>
      } />

      {/* Account deletion and dev routes */}
      <Route path="/account/deletion" element={
        <ProtectedRoute>
          <Suspense fallback={<QuickLoader />}>
            <AccountDeletion />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/dev-test-login" element={
        <Suspense fallback={<QuickLoader />}>
          <DevTestLogin />
        </Suspense>
      } />
    </Routes>
  );
};

export default RouterWrapper;