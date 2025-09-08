# Overview

Nonplo is a Turkish SaaS platform enabling businesses to create, customize, and deploy AI agents (virtual employees) without coding. These AI assistants can handle tasks such as customer support, lead qualification, and appointment booking. The platform offers a visual wizard for agent creation, pre-built templates, and comprehensive management tools, aiming to automate business processes. The system now primarily utilizes a "PLAYBOOK ONLY" architecture powered by Gemini 2.0 Flash for agent instructions, completely eliminating traditional Dialogflow CX flows.

# User Preferences

Preferred communication style: Simple, everyday language.
Remove legacy Firebase code automatically when provided - all functionality migrated to Supabase.

## Recent Critical Fixes (September 8, 2025)
- **PRODUCTION-LEVEL GOOGLE CALENDAR INTEGRATION COMPLETE**: Comprehensive Google Calendar system with security, monitoring, and production configuration
  - **Phase 1B:** Complete CRUD operations (create, read, update, delete events, availability check)
  - **Phase 2A:** Enhanced Calendar Connection UI with real-time status, OAuth management, agent-specific controls
  - **Phase 3:** Security & Monitoring with rate limiting, token refresh handling, usage analytics, error alerting
  - **Phase 4:** Production Configuration with environment variables, database optimization, backup strategy
  - **Security Features:** Calendar-specific rate limiting, encrypted token storage, automatic token refresh, request validation
  - **Monitoring Systems:** Real-time analytics, usage tracking, error alerting, token expiry warnings
  - **Production Files:** Environment variables template, database indexes, migration scripts, backup strategy
  - **Turkish UI Integration:** Complete frontend integration with agent detail pages and connection management

## Previous Critical Fixes (Aug 21, 2025)
- **CONCURRENT AGENT CREATION PROTECTION**: Implemented comprehensive protection against multiple simultaneous agent creation attempts
  - Frontend: Enhanced button disable logic using both `isLoading` and `isCreatingRef` states with early return protection
  - Backend: Added per-user active creation tracking with Map-based request blocking (429 status response)  
  - Error handling: Proper cleanup of tracking flags on both success and error scenarios
  - User experience: Clear Turkish error messages when concurrent creation is attempted
- **DEPLOYMENT ISSUE IDENTIFIED**: Build successful (Aug 21, 20:21) with latest code but deployment configuration preventing updates
- **ROOT CAUSE**: NODE_ENV not set to "production" in deployment environment variables
- **BUILD VERIFIED**: dist/index.js (265KB) and dist/public assets confirmed updated with latest features
- **SOLUTION STATUS**: Deployment configuration fixes identified, manual deployment settings update required

## Previous Critical Fixes (Aug 18, 2025)
- **30-Day Account Deletion System Complete**: Full Turkish-language account deletion system with automatic cancellation on re-login implemented
  - Middleware-based automatic detection and cancellation of scheduled deletions when user logs in
  - Complete database schema with `account_deletion_requests` table properly configured
  - API endpoints for scheduling deletion (/api/account/schedule-deletion) and checking status (/api/account/status)
  - Session-based notification flag system for "Account deletion process has been cancelled" message
  - 30-day grace period with account deactivation but data preservation
  - Turkish language support throughout the system
  - Production-ready with Supabase PostgreSQL backend integration
- **Real Authentication System Active**: Removed all test/mock authentication systems per user request "gerçekte yap şunu"
  - useSupabaseAuth hook now uses only real Supabase authentication
  - React Query configured with proper token authentication for API calls
  - Backend authentication middleware validates real Supabase JWT tokens
  - Dev test login page redirects to real /auth login page
  - Account deletion notification system works with real user sessions
- **Dashboard Data Loading Optimization**: Optimized getDashboardStats function with parallel queries and single SQL operations, reduced database round trips from 10+ to 3, added 3-second API timeout and faster caching (2min vs 5min)
- **WebSocket Connection Improvements**: Enhanced real-time data connection with 5-second connection timeout (up from 1s), exponential backoff reconnection (1s, 2s, 4s, 8s, 16s), improved error handling with reduced console noise, and added connection state indicators (connecting/offline/connected) with manual reconnect capability
- **Agent Detail Page Streamlined**: Removed "Mesajlar" (Messages) tab from agent detail page, reduced from 6 tabs to 5 tabs (Genel Bakış, Bilgi, Entegrasyonlar, Ayarlar, Test & Yayınla) for cleaner UI
- **Dashboard Messages Auto-Loading**: Fixed authentication dependency issue preventing automatic message loading on page load - messages now load automatically without requiring reset button click
- **Conversation Deletion Auto-Refresh**: Implemented automatic page reload after conversation deletion (both single and bulk) with 1-second delay for immediate UI updates 
- **Dashboard Chart Optimization**: Resized "Son 7 Gün Etkileşim Trendi" chart from oversized layout to compact responsive design (h-24 to h-36) for better page proportion
- **Dashboard Statistics Fix**: Resolved 401 authentication error in dashboard stats API by adding proper Supabase session token authentication to frontend API calls
- **Agent Status Toggle System**: Fixed data mapping inconsistencies between frontend (isActive) and backend (is_active) by standardizing on PUT endpoints with proper authentication
- **Real-time Dashboard Updates**: Dashboard now correctly displays active agent counts with automatic refresh every 15 seconds (optimized from 30 seconds)
- **Playbook Form Structure**: Fixed Dialogflow agent classification issue by changing "Restaurant Name:" to "Name:" in form data, preventing all businesses from being classified as restaurants
- **Enhanced Form Layout**: Restructured form data sent to Dialogflow with clean, organized format including separate lines for Name, Description, Products/Services, Tasks, Address, Website, and Sector information
- **Dynamic Data Population**: Enhanced PlaybookConfig to pull actual agent data (sector, products, address, website, taskDescription) from database instead of using static placeholders

## Previous Critical Fixes (Aug 16, 2025)
- **Automatic Tool Activation**: Fixed missing `eq` import in create-agent.ts preventing DialogFlow CX agent ID storage, now Google Calendar and code-interpreter tools automatically appear as checked in playbooks
- **Dashboard Agent Display**: Fixed user ID mismatch preventing agent visibility in dashboard
- **Turkish Character Preservation**: Agent names now maintain full Turkish character support (İĞÜÇÖŞ)
- **Database Synchronization**: Resolved agent creation using inconsistent user IDs across frontend/backend
- **Endpoint Consolidation**: Eliminated dual playbook endpoints confusion

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui ("new-york" style)
- **Routing**: React Router v6 (protected routes)
- **State Management**: TanStack Query for server state, React hooks for local state
- **Build Tool**: Vite
- **Design System**: Custom CSS variables (colors, gradients, shadows, animations) using HSL.

## Backend Architecture
- **Framework**: Express.js server with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Supabase PostgreSQL (single database architecture)
- **Development**: Hot reload with Vite middleware
- **Build Process**: ESBuild for server bundling.

## Database Schema
The application uses PostgreSQL with a 11-table schema, including:
- **Agents**: AI assistants with user association, names, roles, and status.
- **Conversations**: Chat sessions linked to agents and users.
- **Messages**: Individual chat messages within conversations.
- **Newsletter Subscribers**: Email subscription management.
- **Training Requests**: Custom agent training requests.
- **Tools Settings**: User preferences for various tool integrations.
- **Integrations Connections**: Third-party service connection metadata.
- **User Google Calendars**: Google Calendar OAuth connections with encrypted tokens.
- **Calendar Operations**: Operation logs and analytics for calendar interactions.

## Authentication System
- **Implementation**: Supabase Auth with Row Level Security (RLS) policies.
- **User Model**: Standard user object with ID, email, and metadata.
- **Protection**: Route-level protection with JWT middleware and role-based access control.
- **Session Management**: Supabase integrated authentication with automatic JWT token integration for API client requests.

## System Design Choices
- **AI Agent Creation**: Utilizes an 8-step visual wizard for comprehensive agent setup, including sector, location, social media, and personality.
- **Playbook-Only Architecture**: Agents operate solely based on dynamic playbook instructions fetched from the database, powered by Gemini 2.0 Flash. No traditional Dialogflow CX flows are created or used.
- **Turkish Character Support**: Agent names maintain full Turkish character support (İĞÜÇÖŞ) in DialogFlow CX console.
- **Unified Playbook API**: Single endpoint `/api/create-playbook` uses advanced features by default, eliminating endpoint confusion.
- **Real-time Features**: Incorporates live subscriptions, chat updates, agent tracking, and notifications.
- **Storage**: Supabase Storage with buckets, file upload, and RLS policies.
- **Edge Functions**: Supports email automation, background jobs, and a template system.
- **Security**: Includes rate limiting, audit logging, and security headers.

# External Dependencies

- **UI and Styling**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel.
- **Form Management**: React Hook Form, Hookform Resolvers, Zod.
- **Development Tools**: TypeScript, Vite, ESBuild, Replit Integration.
- **Database and Backend**: Supabase (PostgreSQL, Auth, Storage), Express, WebSocket (ws library).
- **AI/ML**: Google Dialogflow CX (for agent ID mapping and communication, but not flow creation), Gemini 2.0 Flash (for playbook generation).

## Recent System Changes (Aug 16, 2025)
- **Database Migration Complete**: Successfully migrated from dual-database architecture (Supabase + Neon fallback) to Supabase-only architecture
- **Simplified Database Connections**: Removed fallback logic and complexity - now uses single Supabase PostgreSQL connection
- **Performance Improvement**: Eliminated connection decision logic and reduced database connection overhead
- **Code Cleanup**: All Neon database references removed from codebase, documentation updated, backup files archived
- **Environment Variables**: Changed from DATABASE_URL to SUPABASE_DB_PASSWORD for cleaner configuration