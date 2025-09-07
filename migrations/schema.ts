import { pgTable, uuid, text, timestamp, boolean, jsonb, unique, foreignKey, integer, varchar, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	agentId: uuid("agent_id").notNull(),
	channel: text().notNull(),
	status: text().default('pending').notNull(),
	lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	unread: boolean().default(true).notNull(),
	meta: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const globalEmployeeSettings = pgTable("global_employee_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	singleton: boolean().default(true).notNull(),
	settings: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("global_employee_settings_singleton_unique").on(table.singleton),
]);

export const integrationsConnections = pgTable("integrations_connections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	status: text().default('disconnected').notNull(),
	meta: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const agents = pgTable("agents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	role: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	businessName: text("business_name"),
	description: text(),
	sector: text(),
	location: text(),
	address: text(),
	website: text(),
	socialMedia: jsonb("social_media").default({}),
	workingHours: jsonb("working_hours").default({}),
	holidays: text(),
	faq: text(),
	products: text(),
	personality: jsonb().default({}),
	serviceType: text("service_type"),
	taskDescription: text("task_description"),
	tools: jsonb().default({}),
	integrations: jsonb().default({}),
	messageHistoryFile: text("message_history_file"),
	dialogflowAgentId: text("dialogflow_agent_id"),
	serviceDescription: text("service_description"),
	dialogflowCxAgentId: text("dialogflow_cx_agent_id"),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	subscribedAt: timestamp("subscribed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	unique("newsletter_subscribers_email_unique").on(table.email),
]);

export const toolsSettings = pgTable("tools_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	toolKey: text("tool_key").notNull(),
	enabled: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const toolsSpecialRequests = pgTable("tools_special_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	email: text().notNull(),
	requested: text().notNull(),
	details: text(),
	filePath: text("file_path"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const trainingRequests = pgTable("training_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userEmail: text("user_email").notNull(),
	userName: text("user_name"),
	topic: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const playbookBackups = pgTable("playbook_backups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id"),
	userId: uuid("user_id").notNull(),
	playbookIds: jsonb("playbook_ids"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "playbook_backups_agent_id_agents_id_fk"
		}).onDelete("cascade"),
]);

export const playbooks = pgTable("playbooks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id"),
	config: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "playbooks_agent_id_agents_id_fk"
		}).onDelete("cascade"),
]);

export const userGoogleCalendars = pgTable("user_google_calendars", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	agentId: uuid("agent_id").notNull(),
	googleEmail: text("google_email").notNull(),
	googleAccessToken: text("google_access_token").notNull(),
	googleRefreshToken: text("google_refresh_token").notNull(),
	calendarId: text("calendar_id").default('primary').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "user_google_calendars_agent_id_agents_id_fk"
		}).onDelete("cascade"),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	sender: text().notNull(),
	content: text(),
	attachments: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const calendarOperations = pgTable("calendar_operations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	agentId: uuid("agent_id").notNull(),
	operationType: text("operation_type").notNull(),
	googleEventId: text("google_event_id"),
	inputData: jsonb("input_data"),
	resultData: jsonb("result_data"),
	success: boolean().notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const userNotificationSettings = pgTable("user_notification_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	emailNotifications: boolean("email_notifications").default(true).notNull(),
	marketingEmails: boolean("marketing_emails").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_notification_settings_user_id_unique").on(table.userId),
]);

export const agentErrors = pgTable("agent_errors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	userId: uuid("user_id").notNull(),
	errorType: text("error_type").notNull(),
	errorCode: text("error_code"),
	errorMessage: text("error_message").notNull(),
	stackTrace: text("stack_trace"),
	context: jsonb().default({}),
	severity: text().default('medium').notNull(),
	resolved: boolean().default(false).notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	resolvedBy: uuid("resolved_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const systemHealthMetrics = pgTable("system_health_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	userId: uuid("user_id").notNull(),
	metricType: text("metric_type").notNull(),
	value: text().notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	period: text().default('hour').notNull(),
});

export const agentActivityLogs = pgTable("agent_activity_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	userId: uuid("user_id").notNull(),
	conversationId: uuid("conversation_id"),
	activityType: text("activity_type").notNull(),
	status: text().default('success').notNull(),
	duration: integer(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const emailJobs = pgTable("email_jobs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	to: varchar().notNull(),
	template: json().notNull(),
	variables: json().default({}),
	status: varchar().default('pending'),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	errorMessage: text("error_message"),
});

export const userStatus = pgTable("user_status", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	deactivatedAt: timestamp("deactivated_at", { withTimezone: true, mode: 'string' }),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_status_user_id_unique").on(table.userId),
]);

export const accountDeletionRequests = pgTable("account_deletion_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletionDate: timestamp("deletion_date", { withTimezone: true, mode: 'string' }).notNull(),
	reason: text(),
	status: text().default('scheduled').notNull(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
