import { pgTable, text, serial, integer, boolean, uuid, timestamp, jsonb, varchar, json, unique, decimal } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Newsletter subscribers table
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// Training requests table
export const trainingRequests = pgTable("training_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  topic: text("topic").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Agents table
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  business_name: text("business_name"),
  description: text("description"),
  sector: text("sector"),
  location: text("location"),
  address: text("address"),
  website: text("website"),
  socialMedia: jsonb("social_media").default({}),
  workingHours: jsonb("working_hours").default({}),
  holidays: text("holidays"),
  faq: text("faq"),
  products: text("products"),
  personality: jsonb("personality").default({}),
  serviceType: text("service_type"),
  taskDescription: text("task_description"),
  serviceDescription: text("service_description"),
  tools: jsonb("tools").default({}),
  integrations: jsonb("integrations").default({}),
  messageHistoryFile: text("message_history_file"),
  openaiInstructions: text("openai_instructions"), // Re-enabled
  openaiModel: text("openai_model"), // Re-enabled
  openaiAssistantId: text("openai_assistant_id"), // Re-enabled for chat functionality
  forbiddenWordsVectorStoreId: text("forbidden_words_vector_store_id"), // OpenAI vector store ID for forbidden words
  temperature: text("temperature").default("1.0"), // OpenAI temperature setting (0.0-2.0)
  is_active: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tools settings table
export const toolsSettings = pgTable("tools_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  agentId: uuid("agent_id"), // Optional: for agent-specific settings
  toolKey: text("tool_key").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Integrations connections table
export const integrationsConnections = pgTable("integrations_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default('disconnected'),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tools special requests table
export const toolsSpecialRequests = pgTable("tools_special_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  requested: text("requested").notNull(),
  details: text("details"),
  filePath: text("file_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  threadId: text("thread_id"), // OpenAI thread ID - unique geçici olarak kaldırıldı
  channel: text("channel").notNull().default('web'),
  status: text("status").notNull().default('active'),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  unread: boolean("unread").notNull().default(true),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  sender: text("sender").notNull(),
  content: text("content"),
  attachments: jsonb("attachments").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Global employee settings table
export const globalEmployeeSettings = pgTable("global_employee_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  singleton: boolean("singleton").notNull().default(true).unique(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Playbooks table
export const playbooks = pgTable("playbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: 'cascade' }),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Playbook backups table
export const playbookBackups = pgTable("playbook_backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull(),
  playbookIds: jsonb("playbook_ids"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

// Email jobs table for Supabase email queue system
export const emailJobs = pgTable("email_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  to: varchar("to").notNull(),
  template: json("template").notNull(),
  variables: json("variables").default({}),
  status: varchar("status").default("pending"),
  scheduled_for: timestamp("scheduled_for").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  processed_at: timestamp("processed_at"),
  error_message: text("error_message"),
});

export type NewEmailJob = typeof emailJobs.$inferInsert;
export type EmailJob = typeof emailJobs.$inferSelect;

// Create insert schemas
export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).pick({
  email: true,
});

export const insertTrainingRequestSchema = createInsertSchema(trainingRequests).pick({
  userEmail: true,
  userName: true,
  topic: true,
  description: true,
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  userId: true,
  name: true,
  role: true,
  business_name: true,
  description: true,
  sector: true,
  location: true,
  address: true,
  website: true,
  socialMedia: true,
  workingHours: true,
  holidays: true,
  faq: true,
  products: true,
  personality: true,
  serviceType: true,
  taskDescription: true,
  serviceDescription: true,
  tools: true,
  integrations: true,
  messageHistoryFile: true,
  openaiInstructions: true,
  openaiModel: true,
  openaiAssistantId: true,
  forbiddenWordsVectorStoreId: true,
  temperature: true,
  is_active: true,
});

// Full wizard data schema for agent creation
export const agentWizardSchema = z.object({
  sector: z.string().min(1, "Sektör seçimi gerekli"),
  businessName: z.string().min(1, "İşletme adı gerekli"),
  location: z.string().optional(),
  address: z.string().min(1, "Adres gerekli"),
  weeklyHours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  }),
  holidays: z.string().optional(),
  website: z.string().optional(),
  instagramUsername: z.string().optional(),
  twitterUsername: z.string().optional(),
  tiktokUsername: z.string().optional(),
  faq: z.string().min(1, "SSS bilgisi gerekli"),
  products: z.string().min(1, "Ürün/hizmet bilgisi gerekli"),
  tone: z.string().min(1, "Konuşma tarzı seçimi gerekli"),
  responseLength: z.string().min(1, "Yanıt uzunluğu seçimi gerekli"),
  userVerification: z.string().min(1, "Kullanıcı doğrulama seçimi gerekli"),
  serviceType: z.string().min(1, "Hizmet türü seçimi gerekli"),
  taskDescription: z.string().min(1, "Görev tanımı gerekli"),
  tools: z.object({
    websiteIntegration: z.boolean(),
    emailNotifications: z.boolean(),
    whatsappIntegration: z.boolean(),
    calendarBooking: z.boolean(),
    socialMediaMonitoring: z.boolean(),
    crmIntegration: z.boolean(),
    analyticsReporting: z.boolean(),
    multiLanguageSupport: z.boolean(),
  }),
  integrations: z.object({
    whatsapp: z.boolean(),
    instagram: z.boolean(),
    telegram: z.boolean(),
    slack: z.boolean(),
    zapier: z.boolean(),
    shopify: z.boolean(),
    woocommerce: z.boolean(),
    hubspot: z.boolean(),
  }),
});

export type AgentWizardData = z.infer<typeof agentWizardSchema>;

export const insertToolsSettingsSchema = createInsertSchema(toolsSettings).pick({
  userId: true,
  agentId: true,
  toolKey: true,
  enabled: true,
});

export const insertIntegrationsConnectionSchema = createInsertSchema(integrationsConnections).pick({
  userId: true,
  provider: true,
  status: true,
  meta: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  agentId: true,
  threadId: true,
  channel: true,
  status: true,
  meta: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  sender: true,
  content: true,
  attachments: true,
});

export const insertPlaybookSchema = createInsertSchema(playbooks).pick({
  agentId: true,
  config: true,
});

export const insertPlaybookBackupSchema = createInsertSchema(playbookBackups).pick({
  agentId: true,
  userId: true,
  playbookIds: true,
});

// Type exports
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

export type InsertTrainingRequest = z.infer<typeof insertTrainingRequestSchema>;
export type TrainingRequest = typeof trainingRequests.$inferSelect;

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export type InsertToolsSettings = z.infer<typeof insertToolsSettingsSchema>;
export type ToolsSettings = typeof toolsSettings.$inferSelect;

export type InsertIntegrationsConnection = z.infer<typeof insertIntegrationsConnectionSchema>;
export type IntegrationsConnection = typeof integrationsConnections.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type GlobalEmployeeSettings = typeof globalEmployeeSettings.$inferSelect;

// Google Calendar bağlantıları tablosu
export const userGoogleCalendars = pgTable("user_google_calendars", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: 'cascade' }),
  googleEmail: text("google_email").notNull(),
  googleAccessToken: text("google_access_token").notNull(), // Encrypted
  googleRefreshToken: text("google_refresh_token").notNull(), // Encrypted
  calendarId: text("calendar_id").notNull().default('primary'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: Bir user-agent kombinasyonu sadece bir kez olabilir
  uniqueUserAgent: unique("unique_user_agent").on(table.userId, table.agentId),
}));

// Calendar işlem logları tablosu  
export const calendarOperations = pgTable("calendar_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  operationType: text("operation_type").notNull(), // 'create_event', 'check_availability'
  googleEventId: text("google_event_id"),
  inputData: jsonb("input_data"),
  resultData: jsonb("result_data"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Insert schemas
export const insertUserGoogleCalendarSchema = createInsertSchema(userGoogleCalendars).pick({
  userId: true,
  agentId: true,
  googleEmail: true,
  googleAccessToken: true,
  googleRefreshToken: true,
  calendarId: true,
  isActive: true,
});

export const insertCalendarOperationSchema = createInsertSchema(calendarOperations).pick({
  userId: true,
  agentId: true,
  operationType: true,
  googleEventId: true,
  inputData: true,
  resultData: true,
  success: true,
  errorMessage: true,
});

// Account deletion schedule table
export const accountDeletions = pgTable("account_deletion_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
  deletionDate: timestamp("deletion_date", { withTimezone: true }).notNull(), // 30 days from scheduledAt
  reason: text("reason"), // Optional deletion reason
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'cancelled', 'completed'
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// User status tracking table
export const userStatus = pgTable("user_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Error tracking table - Agent level errors
export const agentErrors = pgTable("agent_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull(),
  userId: uuid("user_id").notNull(),
  errorType: text("error_type").notNull(), // 'api_error', 'dialogue_error', 'timeout', 'integration_error'
  errorCode: text("error_code"), // HTTP status, custom error codes
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  context: jsonb("context").default({}), // Additional context (user input, conversation id, etc.)
  severity: text("severity").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// System health metrics table
export const systemHealthMetrics = pgTable("system_health_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull(),
  userId: uuid("user_id").notNull(),
  metricType: text("metric_type").notNull(), // 'response_time', 'success_rate', 'uptime', 'request_count'
  value: text("value").notNull(), // JSON value to handle different metric types
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  period: text("period").notNull().default('hour'), // 'minute', 'hour', 'day', 'week'
});

// Agent activity logs table
export const agentActivityLogs = pgTable("agent_activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull(),
  userId: uuid("user_id").notNull(),
  conversationId: uuid("conversation_id"),
  activityType: text("activity_type").notNull(), // 'message_received', 'message_sent', 'error_occurred', 'tool_used'
  status: text("status").notNull().default('success'), // 'success', 'failed', 'timeout'
  duration: integer("duration"), // Response time in milliseconds
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// User notification settings table
export const userNotificationSettings = pgTable("user_notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  marketingEmails: boolean("marketing_emails").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Insert schemas for error tracking
export const insertAgentErrorSchema = createInsertSchema(agentErrors).pick({
  agentId: true,
  userId: true,
  errorType: true,
  errorCode: true,
  errorMessage: true,
  stackTrace: true,
  context: true,
  severity: true,
});

export const insertSystemHealthMetricSchema = createInsertSchema(systemHealthMetrics).pick({
  agentId: true,
  userId: true,
  metricType: true,
  value: true,
  period: true,
});

export const insertAgentActivityLogSchema = createInsertSchema(agentActivityLogs).pick({
  agentId: true,
  userId: true,
  conversationId: true,
  activityType: true,
  status: true,
  duration: true,
  metadata: true,
});

// Insert schemas for account deletion system
export const insertAccountDeletionSchema = createInsertSchema(accountDeletions).pick({
  userId: true,
  deletionDate: true,
  reason: true,
});

export const insertUserStatusSchema = createInsertSchema(userStatus).pick({
  userId: true,
  isActive: true,
  deactivatedAt: true,
  lastActiveAt: true,
});

// Insert schema for notification settings
export const insertUserNotificationSettingsSchema = createInsertSchema(userNotificationSettings).pick({
  userId: true,
  emailNotifications: true,
  marketingEmails: true,
});

// Update schema for notification settings (allows partial updates)
export const updateUserNotificationSettingsSchema = createInsertSchema(userNotificationSettings).pick({
  emailNotifications: true,
  marketingEmails: true,
}).partial();

// Type exports for error tracking
export type InsertAgentError = z.infer<typeof insertAgentErrorSchema>;
export type AgentError = typeof agentErrors.$inferSelect;
export type InsertSystemHealthMetric = z.infer<typeof insertSystemHealthMetricSchema>;
export type SystemHealthMetric = typeof systemHealthMetrics.$inferSelect;
export type InsertAgentActivityLog = z.infer<typeof insertAgentActivityLogSchema>;
export type AgentActivityLog = typeof agentActivityLogs.$inferSelect;

// Type exports for account deletion system
export type InsertAccountDeletion = z.infer<typeof insertAccountDeletionSchema>;
export type AccountDeletion = typeof accountDeletions.$inferSelect;
export type InsertUserStatus = z.infer<typeof insertUserStatusSchema>;
export type UserStatus = typeof userStatus.$inferSelect;

// Type exports
export type InsertUserNotificationSettings = z.infer<typeof insertUserNotificationSettingsSchema>;
export type UpdateUserNotificationSettings = z.infer<typeof updateUserNotificationSettingsSchema>;
export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect;

export type InsertUserGoogleCalendar = z.infer<typeof insertUserGoogleCalendarSchema>;
export type UserGoogleCalendar = typeof userGoogleCalendars.$inferSelect;
export type InsertCalendarOperation = z.infer<typeof insertCalendarOperationSchema>;
export type CalendarOperation = typeof calendarOperations.$inferSelect;

// ==========================================
// AGENT WIZARD TABLES (NEW SYSTEM)
// ==========================================

// Agent wizard sessions - tracks the 10-step wizard progress
export const agentWizardSessions = pgTable("agent_wizard_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  
  // Step 1: Business Name & Industry (Required)
  businessName: text("business_name"),
  industry: text("industry"),
  
  // Step 2: Address Info
  address: text("address"),
  addressData: jsonb("address_data").default({}), // Google Places data
  timezone: text("timezone"),
  
  // Step 3: Working Hours & Holidays (Required)
  workingHours: jsonb("working_hours").default({}),
  holidaysConfig: jsonb("holidays_config").default({}),
  
  // Step 4: Social Media & Website
  website: text("website"),
  socialMedia: jsonb("social_media").default({}), // {instagram, facebook, twitter, etc}
  socialDataStatus: jsonb("social_data_status").default({}), // scraping status
  
  // Step 5: FAQ
  faqRaw: text("faq_raw"), // User input
  faqOptimized: text("faq_optimized"), // AI optimized
  
  // Step 6: Product/Service Description (Required)
  productServiceRaw: text("product_service_raw"), // User input
  productServiceOptimized: text("product_service_optimized"), // AI optimized
  
  // Step 7: Extra Training Files
  trainingFilesCount: integer("training_files_count").default(0),
  filesIndexStatus: text("files_index_status").default("pending"), // pending, processing, completed, error
  
  // Step 8: Employee Name & Role (Required)
  employeeName: text("employee_name"),
  employeeRole: text("employee_role"),
  employeeRoleOptimized: text("employee_role_optimized"), // AI optimized
  
  // Step 9: Personality & Tone (Required)
  personality: jsonb("personality").default({}), // tone, verbosity, temperature, etc
  
  // Step 10: Tools
  selectedTools: jsonb("selected_tools").default({}),
  
  // Session management
  currentStep: integer("current_step").default(1), // 1-10, 11 for approval
  status: text("status").default("draft"), // draft, building, completed, error
  buildProgress: jsonb("build_progress").default({}), // progress tracking during creation
  
  // Final result
  createdAgentId: uuid("created_agent_id"), // Links to agents table when complete
  openaiAssistantId: text("openai_assistant_id"), // OpenAI Assistant ID
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Agent wizard files - manages uploaded training files
export const agentWizardFiles = pgTable("agent_wizard_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  wizardSessionId: uuid("wizard_session_id").notNull().references(() => agentWizardSessions.id, { onDelete: 'cascade' }),
  
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(), // pdf, docx, txt, etc
  filePath: text("file_path").notNull(), // storage path
  
  // Processing status
  status: text("status").default("uploaded"), // uploaded, processing, indexed, error
  indexingProgress: decimal("indexing_progress", { precision: 5, scale: 2 }).default("0"), // 0.00 to 100.00
  errorMessage: text("error_message"),
  
  // Embedding/search data
  chunkCount: integer("chunk_count"),
  embeddingStatus: text("embedding_status").default("pending"), // pending, processing, completed, error
  vectorStoreId: text("vector_store_id"), // OpenAI vector store ID
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Agent wizard events - tracks progress and actions
export const agentWizardEvents = pgTable("agent_wizard_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  wizardSessionId: uuid("wizard_session_id").notNull().references(() => agentWizardSessions.id, { onDelete: 'cascade' }),
  
  eventType: text("event_type").notNull(), // step_completed, file_uploaded, social_scraped, agent_created, error
  stepNumber: integer("step_number"), // 1-10 for step events
  eventData: jsonb("event_data").default({}), // additional data for the event
  
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Insert schemas for the new wizard tables
export const insertAgentWizardSessionSchema = createInsertSchema(agentWizardSessions).pick({
  userId: true,
  businessName: true,
  industry: true,
  address: true,
  addressData: true,
  timezone: true,
  workingHours: true,
  holidaysConfig: true,
  website: true,
  socialMedia: true,
  socialDataStatus: true,
  faqRaw: true,
  faqOptimized: true,
  productServiceRaw: true,
  productServiceOptimized: true,
  trainingFilesCount: true,
  filesIndexStatus: true,
  employeeName: true,
  employeeRole: true,
  employeeRoleOptimized: true,
  personality: true,
  selectedTools: true,
  currentStep: true,
  status: true,
  buildProgress: true,
  createdAgentId: true,
  openaiAssistantId: true,
});

export const insertAgentWizardFileSchema = createInsertSchema(agentWizardFiles).pick({
  wizardSessionId: true,
  fileName: true,
  originalName: true,
  fileSize: true,
  fileType: true,
  filePath: true,
  status: true,
  indexingProgress: true,
  errorMessage: true,
  chunkCount: true,
  embeddingStatus: true,
  vectorStoreId: true,
});

export const insertAgentWizardEventSchema = createInsertSchema(agentWizardEvents).pick({
  wizardSessionId: true,
  eventType: true,
  stepNumber: true,
  eventData: true,
  success: true,
  errorMessage: true,
});

// New wizard validation schemas (step by step)
export const wizardStep1Schema = z.object({
  businessName: z.string().min(1, "İşletme adı gerekli").max(60, "İşletme adı çok uzun"),
  industry: z.string().min(1, "Sektör seçimi gerekli"),
});

export const wizardStep2Schema = z.object({
  address: z.string().optional(),
  addressData: z.object({
    placeId: z.string(),
    formattedAddress: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    components: z.record(z.string()),
  }).optional(),
  timezone: z.string().optional(),
});

export const wizardStep3Schema = z.object({
  workingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  }),
  holidaysConfig: z.object({
    nationalHolidays: z.boolean().default(true),
    religiousHolidays: z.boolean().default(true),
    customHolidays: z.array(z.object({
      name: z.string(),
      date: z.string(), // ISO date format
      recurring: z.boolean().default(false),
    })).default([]),
  }),
});

export const wizardStep4Schema = z.object({
  website: z.string().url().optional().or(z.literal("")),
  socialMedia: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(), 
    twitter: z.string().optional(),
    tiktok: z.string().optional(),
    youtube: z.string().optional(),
    linkedin: z.string().optional(),
  }),
});

export const wizardStep5Schema = z.object({
  faqRaw: z.string().optional(),
});

export const wizardStep6Schema = z.object({
  productServiceRaw: z.string().min(1, "Ürün/hizmet açıklaması gerekli"),
});

export const wizardStep7Schema = z.object({
  // File uploads handled separately via API
  trainingFilesCount: z.number().min(0),
});

export const wizardStep8Schema = z.object({
  employeeName: z.string().min(1, "Çalışan adı gerekli").max(50, "Çalışan adı çok uzun"),
  employeeRole: z.string().min(1, "Görev tanımı gerekli"),
});

export const wizardStep9Schema = z.object({
  personality: z.object({
    tone: z.enum(["sevecen", "profesyonel", "arkadas_canlisi", "konuskan", "ozel"]),
    formality: z.number().min(1).max(5), // 1: Very casual, 5: Very formal
    creativity: z.number().min(0.1).max(2.0), // OpenAI temperature
    responseLength: z.enum(["kisa", "orta", "uzun"]),
    useEmojis: z.boolean().default(false),
    customInstructions: z.string().optional(),
  }),
});

export const wizardStep10Schema = z.object({
  selectedTools: z.object({
    googleCalendar: z.boolean().default(false),
    gmail: z.boolean().default(false),
    webSearch: z.boolean().default(false),
    fileSearch: z.boolean().default(false),
    productCatalog: z.boolean().default(false),
    paymentLinks: z.boolean().default(false),
    humanHandoff: z.boolean().default(false),
  }),
});

// Type exports for wizard tables
export type AgentWizardSession = typeof agentWizardSessions.$inferSelect;
export type InsertAgentWizardSession = z.infer<typeof insertAgentWizardSessionSchema>;
export type AgentWizardFile = typeof agentWizardFiles.$inferSelect;
export type InsertAgentWizardFile = z.infer<typeof insertAgentWizardFileSchema>;
export type AgentWizardEvent = typeof agentWizardEvents.$inferSelect;
export type InsertAgentWizardEvent = z.infer<typeof insertAgentWizardEventSchema>;

// Step validation types
export type WizardStep1Data = z.infer<typeof wizardStep1Schema>;
export type WizardStep2Data = z.infer<typeof wizardStep2Schema>;
export type WizardStep3Data = z.infer<typeof wizardStep3Schema>;
export type WizardStep4Data = z.infer<typeof wizardStep4Schema>;
export type WizardStep5Data = z.infer<typeof wizardStep5Schema>;
export type WizardStep6Data = z.infer<typeof wizardStep6Schema>;
export type WizardStep7Data = z.infer<typeof wizardStep7Schema>;
export type WizardStep8Data = z.infer<typeof wizardStep8Schema>;
export type WizardStep9Data = z.infer<typeof wizardStep9Schema>;
export type WizardStep10Data = z.infer<typeof wizardStep10Schema>;
