import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { eq, and, desc, asc, sql, inArray, gt } from "drizzle-orm";
import axios from "axios";
import {
  agents,
  conversations,
  messages,
  newsletterSubscribers,
  trainingRequests,
  toolsSettings,
  integrationsConnections,
  toolsSpecialRequests,
  globalEmployeeSettings,
  playbooks,
  playbookBackups,
  agentErrors,
  systemHealthMetrics,
  agentActivityLogs,
  accountDeletions,
  userStatus,
  type Agent,
  type InsertAgent,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type NewsletterSubscriber,
  type InsertNewsletterSubscriber,
  type TrainingRequest,
  type InsertTrainingRequest,
  type ToolsSettings,
  type InsertToolsSettings,
  type IntegrationsConnection,
  type InsertIntegrationsConnection,
  type GlobalEmployeeSettings,
  userGoogleCalendars,
  calendarOperations,
  userNotificationSettings,
  type UserGoogleCalendar,
  type InsertUserGoogleCalendar,
  type CalendarOperation,
  type InsertCalendarOperation,
  type UserNotificationSettings,
  type InsertUserNotificationSettings,
  type UpdateUserNotificationSettings,
  type AgentError,
  type InsertAgentError,
  type SystemHealthMetric,
  type InsertSystemHealthMetric,
  type AgentActivityLog,
  type InsertAgentActivityLog,
  type AccountDeletion,
  type InsertAccountDeletion,
  type UserStatus,
  type InsertUserStatus,
} from "@shared/schema";

// Pure Supabase connection only
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_DB_PASSWORD) {
  throw new Error("SUPABASE_URL and SUPABASE_DB_PASSWORD must be set for Supabase connection");
}

// Extract project reference from Supabase URL
const projectRef = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

// Force Supabase connection with debug
console.log('🔗 FORCING Supabase connection:', connectionString.split('@')[1]?.split(':')[0]);
const client = postgres(connectionString, {
  ssl: 'require', // Supabase requires SSL
  max: 1, // Limit connections
});

const db = drizzle(client);



// Export db for use in other modules
export { db };

// Dialogflow CX configuration for deletion (Fixed values)
const projectId = 'nonplo-auth2';     // Correct Google Cloud project ID
const location = 'europe-west3';      // Correct Google Cloud location

// Google Cloud access token helper for deletion
async function getAccessToken(): Promise<string> {
  try {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set');
    }

    const credentials = JSON.parse(credentialsJson);
    const { GoogleAuth } = await import('google-auth-library');

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();

    if (!accessTokenResponse.token) {
      throw new Error('Failed to get access token');
    }

    return accessTokenResponse.token;
  } catch (error: any) {
    throw new Error(`Google Cloud authentication failed: ${error.message}`);
  }
}

// List all CX agents
async function listAllCXAgents(): Promise<any[]> {
  try {
    const accessToken = await getAccessToken();
    const listUrl = `https://${location}-dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents`;
    
    const response = await axios.get(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    
    return response.data?.agents || [];
  } catch (error: any) {
    console.error(`❌ CX agent listeleme hatası: ${error.message}`);
    return [];
  }
}

// Delete agent from DialogFlow CX by ID
async function deleteDialogFlowCXAgent(dialogflowCxAgentId: string): Promise<boolean> {
  try {


    const accessToken = await getAccessToken();


    const deleteUrl = `https://${location}-dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents/${dialogflowCxAgentId}`;



    const response = await axios.delete(deleteUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });


    return true;
  } catch (error: any) {
    console.error(`❌ Dialogflow CX agent silme hatası: ${error.message}`);
    if (error.response?.data) {
      console.error(`API Error Details: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Find and delete CX agent by name (for orphaned agents)
async function findAndDeleteCXAgentByName(agentName: string): Promise<boolean> {
  try {
    const cxAgents = await listAllCXAgents();
    
    // Find matching agent by name (fuzzy match)
    const matchingAgent = cxAgents.find(agent => {
      const displayName = agent.displayName || '';
      // Match exact name or name + " AI Asistanı"
      return displayName === agentName || 
             displayName === `${agentName} AI Asistanı` ||
             displayName.includes(agentName);
    });
    
    if (matchingAgent) {
      const agentId = matchingAgent.name?.split('/').pop();
      const deleted = await deleteDialogFlowCXAgent(agentId);
      return deleted;
    } else {
      return false;
    }
  } catch (error: any) {
    console.error(`❌ CX agent arama/silme hatası: ${error.message}`);
    return false;
  }
}

export interface IStorage {
  // Agents
  getAgentsByUserId(userId: string): Promise<Agent[]>;
  getAllAgents(): Promise<Agent[]>;
  getAgentById(id: string, userId: string): Promise<Agent | undefined>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  createAgentFromWizard(userId: string, wizardData: any): Promise<Agent>;
  updateAgent(id: string, userId: string, updates: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: string, userId: string): Promise<void>;

  // Conversations
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  getConversationsByAgentId(userId: string, agentId: string, limit?: number): Promise<any[]>;
  getConversationsByAgent(userId: string, agentId: string): Promise<Conversation[]>;
  getConversationByThreadId(threadId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, userId: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  updateConversationLastMessage(conversationId: string): Promise<void>;

  // Messages
  getMessagesByConversationId(conversationId: string, userId: string): Promise<Message[]>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Newsletter
  subscribeToNewsletter(email: string): Promise<NewsletterSubscriber>;

  // Training requests
  createTrainingRequest(request: InsertTrainingRequest): Promise<TrainingRequest>;

  // Tools settings
  getToolsSettingsByUserId(userId: string): Promise<ToolsSettings[]>;
  upsertToolsSetting(setting: InsertToolsSettings): Promise<ToolsSettings>;

  // Integrations
  getIntegrationsByUserId(userId: string): Promise<IntegrationsConnection[]>;
  upsertIntegration(integration: InsertIntegrationsConnection): Promise<IntegrationsConnection>;

  // Global settings
  getGlobalEmployeeSettings(): Promise<GlobalEmployeeSettings | undefined>;
  updateGlobalEmployeeSettings(settings: Record<string, any>): Promise<GlobalEmployeeSettings>;

  // Playbooks
  getPlaybookByAgentId(agentId: string): Promise<any>;
  getPlaybookBackupByAgentId(agentId: string, userId: string): Promise<any>;

  // Google Calendar
  createGoogleCalendarConnection(data: InsertUserGoogleCalendar): Promise<UserGoogleCalendar>;
  getGoogleCalendarByUserAgent(userId: string, agentId: string): Promise<UserGoogleCalendar | null>;
  getAllGoogleCalendarConnections(): Promise<UserGoogleCalendar[]>;
  updateGoogleCalendarTokens(userId: string, agentId: string, accessToken: string, refreshToken?: string): Promise<void>;
  disconnectGoogleCalendar(userId: string, agentId: string): Promise<void>;
  logCalendarOperation(data: InsertCalendarOperation): Promise<CalendarOperation>;

  // Dashboard Stats
  getDashboardStats(userId: string): Promise<{
    activeAgents: number;
    totalMessages: number;
    totalInteractions: number;
    weeklyMessageCounts: number[];
  }>;
  getCalendarOperationsByUser(userId: string, limit?: number): Promise<CalendarOperation[]>;

  // Notification Settings
  getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null>;
  createUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings>;
  updateUserNotificationSettings(userId: string, updates: UpdateUserNotificationSettings): Promise<UserNotificationSettings>;
  upsertUserNotificationSettings(userId: string, settings: UpdateUserNotificationSettings): Promise<UserNotificationSettings>;

  // User Account Deletion
  deleteUserAccount(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Agents
  async getAgentsByUserId(userId: string): Promise<Agent[]> {
    // Debug and use Drizzle ORM properly
    try {
      console.log(`🔍 Fetching agents for user: ${userId}`);
      const results = await db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.createdAt));
      console.log(`📊 Found ${results.length} agents for user ${userId}`);
      return results;
    } catch (error) {
      console.error('Database agents fetch error:', error);
      // Fallback: return empty array instead of crashing
      return [];
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    const result = await db.select().from(agents);
    
    return result;
  }

  async getAgentById(id: string, userId: string): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(and(eq(agents.id, id), eq(agents.userId, userId)));
    return result[0];
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id));
    return result[0];
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await db.insert(agents).values(agent).returning();
    return result[0];
  }

  async createAgentFromWizard(userId: string, wizardData: any): Promise<Agent> {
    // Transform wizard data to agent data
    const agentData: InsertAgent = {
      userId,
      name: wizardData.businessName,
      role: `${wizardData.sector} ${wizardData.serviceType || 'Müşteri Hizmetleri'} Uzmanı`,
      business_name: wizardData.businessName,
      description: wizardData.taskDescription,
      sector: wizardData.sector,
      location: wizardData.location,
      address: wizardData.address,
      website: wizardData.website,
      socialMedia: {
        instagram: wizardData.instagramUsername,
        twitter: wizardData.twitterUsername,
        tiktok: wizardData.tiktokUsername,
      },
      workingHours: wizardData.weeklyHours,
      holidays: wizardData.holidays,
      faq: wizardData.faq,
      products: wizardData.products,
      personality: {
        tone: wizardData.tone,
        responseLength: wizardData.responseLength,
        userVerification: wizardData.userVerification,
      },
      serviceType: wizardData.serviceType,
      taskDescription: wizardData.taskDescription,
      tools: wizardData.tools,
      integrations: wizardData.integrations,
      messageHistoryFile: wizardData.messageHistoryFile,
      isActive: true,
    };

    const result = await db.insert(agents).values(agentData).returning();
    return result[0];
  }

  async updateAgent(id: string, userId: string, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    console.log(`📝 Storage updateAgent - ID: ${id}, UserID: ${userId}`);
    console.log("📝 Updates:", JSON.stringify(updates, null, 2));
    
    const result = await db.update(agents)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))
      .returning();
    
    const updatedAgent = result[0];
    console.log(`📝 Storage updateAgent result:`, updatedAgent ? {
      id: updatedAgent.id,
      name: updatedAgent.name,
      is_active: updatedAgent.is_active
    } : 'No agent found');
    
    return updatedAgent;
  }

  async deleteAgent(id: string, userId: string): Promise<void> {

    
    // First get the agent to check if it has a Dialogflow CX agent ID
    const agent = await this.getAgentById(id, userId);
    
    if (!agent) {
      return; // Don't throw error, just return - agent was already deleted
    }

    // Check for CX agent ID in both agent table and playbook config
    let cxAgentId = agent.dialogflowCxAgentId;
    
    // If no CX agent ID in agent table, check playbook config
    if (!cxAgentId) {
      try {
        const playbook = await this.getPlaybookByAgentId(id);
        if (playbook?.config?.dialogflowCxAgentId) {
          cxAgentId = playbook.config.dialogflowCxAgentId;
        }
      } catch (playbookError: any) {
        // Ignore playbook errors
      }
    }

    // Try to delete from Dialogflow CX if we found an agent ID
    let cxDeleted = false;
    
    if (cxAgentId) {
      try {
        cxDeleted = await deleteDialogFlowCXAgent(cxAgentId);
      } catch (cxError: any) {
        // Ignore CX deletion errors
      }
      
      // If ID-based deletion failed, try name-based deletion as fallback
      if (!cxDeleted) {
        try {
          cxDeleted = await findAndDeleteCXAgentByName(agent.name);
        } catch (cxError: any) {
          // Ignore CX deletion errors
        }
      }
    } else {
      cxDeleted = true; // Mark as successful since there's nothing to delete in CX
    }

    // Delete from database (this will also cascade delete related playbooks)
    await db.delete(agents).where(and(eq(agents.id, id), eq(agents.userId, userId)));
  }

  // Conversations
  async getConversations(userId: string) {
    try {
      const conversationsResult = await db
        .select({
          id: conversations.id,
          user_id: conversations.userId,
          agent_id: conversations.agentId,
          channel: conversations.channel,
          status: conversations.status,
          last_message_at: conversations.lastMessageAt,
          unread: conversations.unread,
          meta: conversations.meta,
          created_at: conversations.createdAt,
          updated_at: conversations.updatedAt,
          agent_name: agents.name,
          agent_role: agents.role
        })
        .from(conversations)
        .leftJoin(agents, eq(conversations.agentId, agents.id))
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.lastMessageAt));

      return conversationsResult;
    } catch (error) {
      console.error("Error getting conversations:", error);
      return [];
    }
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async getConversationsByAgentId(userId: string, agentId: string, limit = 5): Promise<any[]> {
    try {
      const conversationsResult = await db
        .select({
          id: conversations.id,
          user_id: conversations.userId,
          agent_id: conversations.agentId,
          channel: conversations.channel,
          status: conversations.status,
          last_message_at: conversations.lastMessageAt,
          unread: conversations.unread,
          meta: conversations.meta,
          created_at: conversations.createdAt,
          updated_at: conversations.updatedAt,
        })
        .from(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.agentId, agentId)))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit);

      // Get latest message for each conversation
      const conversationsWithMessages = await Promise.all(
        conversationsResult.map(async (conv) => {
          const latestMessage = await db
            .select({
              id: messages.id,
              content: messages.content,
              sender: messages.sender,
              created_at: messages.createdAt,
            })
            .from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);

          return {
            ...conv,
            latest_message: latestMessage[0] || null,
          };
        })
      );

      return conversationsWithMessages;
    } catch (error) {
      console.error("Error getting conversations by agent ID:", error);
      return [];
    }
  }

  async getConversationById(conversationId: string) {
    try {
      const result = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error("Error getting conversation by id:", error);
      return null;
    }
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const result = await db.update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async findConversationByUserAndAgent(userId: string, agentId: string): Promise<Conversation | undefined> {
    const result = await db.select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.agentId, agentId)))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    return result[0];
  }

  async findConversationBySessionId(userId: string, agentId: string, sessionId: string): Promise<Conversation | undefined> {
    // Get ALL conversations for this user and agent, then filter by sessionId
    const result = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId), 
        eq(conversations.agentId, agentId)
      ));
    
    // Filter by sessionId in meta field manually since JSONB comparison is complex
    const filteredResult = result.filter(conv => {
      const meta = conv.meta as any;
      return meta && meta.sessionId === sessionId;
    });
    
    return filteredResult[0];
  }

  async getConversationsByAgent(userId: string, agentId: string): Promise<Conversation[]> {
    const result = await db.select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.agentId, agentId)))
      .orderBy(desc(conversations.lastMessageAt));
    return result;
  }

  async getConversationByThreadId(threadId: string): Promise<Conversation | undefined> {
    const result = await db.select()
      .from(conversations)
      .where(eq(conversations.threadId, threadId))
      .limit(1);
    return result[0];
  }

  async updateConversationLastMessage(conversationId: string): Promise<void> {
    await db.update(conversations)
      .set({ 
        lastMessageAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(conversations.id, conversationId));
  }

  // Messages
  async getMessagesByConversation(conversationId: string) {
    try {
      const messagesResult = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));

      return messagesResult;
    } catch (error) {
      console.error("Error getting messages:", error);
      return [];
    }
  }

  async getMessagesByConversationId(conversationId: string, userId: string): Promise<Message[]> {
    const result = await db.select()
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.userId, userId), eq(messages.conversationId, conversationId)));
    return result.map(r => r.messages);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const result = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
    return result;
  }

  // Newsletter
  async subscribeToNewsletter(email: string): Promise<NewsletterSubscriber> {
    const result = await db.insert(newsletterSubscribers).values({ email }).returning();
    return result[0];
  }

  // Training requests
  async createTrainingRequest(request: InsertTrainingRequest): Promise<TrainingRequest> {
    const result = await db.insert(trainingRequests).values(request).returning();
    return result[0];
  }

  // Tools settings
  async getToolsSettingsByUserId(userId: string): Promise<ToolsSettings[]> {
    return await db.select().from(toolsSettings).where(eq(toolsSettings.userId, userId));
  }

  async upsertToolsSetting(setting: InsertToolsSettings): Promise<ToolsSettings> {
    const result = await db.insert(toolsSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: [toolsSettings.userId, toolsSettings.toolKey],
        set: { enabled: setting.enabled, updatedAt: new Date() }
      })
      .returning();
    return result[0];
  }

  // Integrations
  async getIntegrationsByUserId(userId: string): Promise<IntegrationsConnection[]> {
    return await db.select().from(integrationsConnections).where(eq(integrationsConnections.userId, userId));
  }

  async upsertIntegration(integration: InsertIntegrationsConnection): Promise<IntegrationsConnection> {
    const result = await db.insert(integrationsConnections)
      .values(integration)
      .onConflictDoUpdate({
        target: [integrationsConnections.userId, integrationsConnections.provider],
        set: { status: integration.status, meta: integration.meta, updatedAt: new Date() }
      })
      .returning();
    return result[0];
  }

  // Global settings
  async getGlobalEmployeeSettings(): Promise<GlobalEmployeeSettings | undefined> {
    const result = await db.select().from(globalEmployeeSettings).limit(1);
    return result[0];
  }

  async updateGlobalEmployeeSettings(settings: Record<string, any>): Promise<GlobalEmployeeSettings> {
    const result = await db.insert(globalEmployeeSettings)
      .values({ settings })
      .onConflictDoUpdate({
        target: globalEmployeeSettings.singleton,
        set: { settings, updatedAt: new Date() }
      })
      .returning();
    return result[0];
  }

  // Playbooks
  async getPlaybookByAgentId(agentId: string): Promise<any> {
    const result = await db.select().from(playbooks).where(eq(playbooks.agentId, agentId)).limit(1);
    return result[0];
  }

  async getPlaybookBackupByAgentId(agentId: string, userId: string): Promise<any> {
    const result = await db.select().from(playbookBackups)
      .where(and(eq(playbookBackups.agentId, agentId), eq(playbookBackups.userId, userId)))
      .limit(1);
    return result[0];
  }

  // Google Calendar implementations
  async createGoogleCalendarConnection(data: InsertUserGoogleCalendar): Promise<UserGoogleCalendar> {
    const [calendar] = await db.insert(userGoogleCalendars).values(data).returning();
    return calendar;
  }

  async getGoogleCalendarByUserAgent(userId: string, agentId: string): Promise<UserGoogleCalendar | null> {

    
    const [calendar] = await db
      .select()
      .from(userGoogleCalendars)
      .where(
        and(
          eq(userGoogleCalendars.userId, userId),
          eq(userGoogleCalendars.agentId, agentId),
          eq(userGoogleCalendars.isActive, true)
        )
      );
    

    
    return calendar || null;
  }

  async getAllGoogleCalendarConnections(): Promise<UserGoogleCalendar[]> {

    
    const calendars = await db
      .select()
      .from(userGoogleCalendars);
    

    
    return calendars;
  }

  async updateGoogleCalendarTokens(userId: string, agentId: string, accessToken: string, refreshToken?: string): Promise<void> {
    const updateData: any = {
      googleAccessToken: accessToken,
      updatedAt: new Date(),
    };
    
    if (refreshToken) {
      updateData.googleRefreshToken = refreshToken;
    }

    await db
      .update(userGoogleCalendars)
      .set(updateData)
      .where(
        and(
          eq(userGoogleCalendars.userId, userId),
          eq(userGoogleCalendars.agentId, agentId)
        )
      );
  }

  async disconnectGoogleCalendar(userId: string, agentId: string): Promise<void> {
    await db
      .update(userGoogleCalendars)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(userGoogleCalendars.userId, userId),
          eq(userGoogleCalendars.agentId, agentId)
        )
      );
  }

  async logCalendarOperation(data: InsertCalendarOperation): Promise<CalendarOperation> {
    const [operation] = await db.insert(calendarOperations).values(data).returning();
    return operation;
  }

  async getCalendarOperationsByUser(userId: string, limit = 50): Promise<CalendarOperation[]> {
    return await db
      .select()
      .from(calendarOperations)
      .where(eq(calendarOperations.userId, userId))
      .orderBy(calendarOperations.createdAt)
      .limit(limit);
  }

  // Notification Settings implementations
  async getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null> {
    const [settings] = await db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));
    return settings || null;
  }

  async createUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings> {
    const [result] = await db.insert(userNotificationSettings).values(settings).returning();
    return result;
  }

  async updateUserNotificationSettings(userId: string, updates: UpdateUserNotificationSettings): Promise<UserNotificationSettings> {
    const [result] = await db
      .update(userNotificationSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userNotificationSettings.userId, userId))
      .returning();
    return result;
  }

  async upsertUserNotificationSettings(userId: string, settings: UpdateUserNotificationSettings): Promise<UserNotificationSettings> {
    const [result] = await db
      .insert(userNotificationSettings)
      .values({ userId, ...settings })
      .onConflictDoUpdate({
        target: userNotificationSettings.userId,
        set: { ...settings, updatedAt: new Date() }
      })
      .returning();
    return result;
  }

  // Dashboard Stats implementation
  async getDashboardStats(userId: string): Promise<{
    activeAgents: number;
    totalMessages: number;
    totalConversations: number;
    weeklyMessageCounts: number[];
  }> {
    try {
      // Optimize with parallel queries instead of sequential
      const [activeAgentsResult, conversationsResult] = await Promise.all([
        // Count active agents in single query
        db.select({ count: sql<number>`count(*)` })
          .from(agents)
          .where(and(eq(agents.userId, userId), eq(agents.is_active, true))),
        
        // Get all conversations for the user
        db.select({ id: conversations.id })
          .from(conversations)
          .where(eq(conversations.userId, userId))
      ]);

      const activeAgents = activeAgentsResult[0]?.count || 0;
      const totalConversations = conversationsResult.length;
      const conversationIds = conversationsResult.map(conv => conv.id);

      if (conversationIds.length === 0) {
        return {
          activeAgents,
          totalMessages: 0,
          totalConversations: 0,
          weeklyMessageCounts: [0, 0, 0, 0, 0, 0, 0]
        };
      }

      // Get all user messages in a single optimized query
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const allUserMessages = await db.select({
        createdAt: messages.createdAt,
        sender: messages.sender
      })
      .from(messages)
      .where(and(
        inArray(messages.conversationId, conversationIds),
        eq(messages.sender, 'user')
      ));

      const totalMessages = allUserMessages.length;

      // Calculate weekly message counts efficiently
      const weeklyMessageCounts: number[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);
        
        const dayMessages = allUserMessages.filter(message => {
          const messageDate = new Date(message.createdAt);
          return messageDate >= targetDate && messageDate < nextDate;
        }).length;
        
        weeklyMessageCounts.push(dayMessages);
      }

      return {
        activeAgents,
        totalMessages,
        totalConversations,
        weeklyMessageCounts
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      // Return default values in case of error
      return {
        activeAgents: 0,
        totalMessages: 0,
        totalConversations: 0,
        weeklyMessageCounts: [0, 0, 0, 0, 0, 0, 0]
      };
    }
  }

  async getAverageResponseTime(agentId: string, userId: string, hours = 24): Promise<number> {
    // Get agent conversations
    const agentConversations = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.agentId, agentId),
        eq(conversations.userId, userId)
      ));

    const conversationIds = agentConversations.map(c => c.id);
    if (conversationIds.length === 0) return 0;

    // Get all messages from the last 24 hours
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    let allMessages: Message[] = [];
    
    for (const conversationId of conversationIds) {
      const messages = await this.getMessagesByConversationId(conversationId, userId);
      allMessages = allMessages.concat(messages.filter(m => 
        new Date(m.createdAt) >= cutoffTime
      ));
    }

    // Sort messages by time
    allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calculate response times: find user messages followed by bot messages
    const responseTimes: number[] = [];
    
    for (let i = 0; i < allMessages.length - 1; i++) {
      const currentMessage = allMessages[i];
      const nextMessage = allMessages[i + 1];
      
      if (currentMessage.sender === 'user' && nextMessage.sender === 'agent') {
        const userTime = new Date(currentMessage.createdAt).getTime();
        const botTime = new Date(nextMessage.createdAt).getTime();
        const responseTime = botTime - userTime; // in milliseconds
        
        // Only include reasonable response times (0-60 seconds)
        if (responseTime > 0 && responseTime <= 60000) {
          responseTimes.push(responseTime);
        }
      }
    }

    if (responseTimes.length === 0) return 0;

    // Calculate average response time in milliseconds
    const averageMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    
    return Math.round(averageMs); // Return in milliseconds
  }

  // ============ ERROR TRACKING METHODS ============

  // Agent Error tracking
  async logAgentError(error: InsertAgentError): Promise<AgentError> {
    const [result] = await db.insert(agentErrors).values(error).returning();
    return result;
  }

  async getAgentErrors(agentId: string, limit = 50): Promise<AgentError[]> {
    return await db
      .select()
      .from(agentErrors)
      .where(eq(agentErrors.agentId, agentId))
      .orderBy(desc(agentErrors.createdAt))
      .limit(limit);
  }

  async getAgentErrorStats(agentId: string, hours = 24): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  }> {
    const errors = await db
      .select()
      .from(agentErrors)
      .where(eq(agentErrors.agentId, agentId));

    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let unresolvedErrors = 0;

    errors.forEach(error => {
      if (!error.resolved) unresolvedErrors++;
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      unresolvedErrors,
      errorsByType,
      errorsBySeverity,
    };
  }

  // System Health Metrics
  async recordHealthMetric(metric: InsertSystemHealthMetric): Promise<SystemHealthMetric> {
    const [result] = await db.insert(systemHealthMetrics).values(metric).returning();
    return result;
  }

  async getHealthMetrics(agentId: string, metricType?: string, limit = 100): Promise<SystemHealthMetric[]> {
    let query = db
      .select()
      .from(systemHealthMetrics)
      .where(eq(systemHealthMetrics.agentId, agentId));

    if (metricType) {
      query = query.where(
        and(
          eq(systemHealthMetrics.agentId, agentId),
          eq(systemHealthMetrics.metricType, metricType)
        )
      );
    }

    return await query
      .orderBy(desc(systemHealthMetrics.timestamp))
      .limit(limit);
  }

  // Agent Activity Logs
  async logAgentActivity(activity: InsertAgentActivityLog): Promise<AgentActivityLog> {
    const [result] = await db.insert(agentActivityLogs).values(activity).returning();
    return result;
  }

  async getAgentActivityLogs(agentId: string, limit = 100): Promise<AgentActivityLog[]> {
    return await db
      .select()
      .from(agentActivityLogs)
      .where(eq(agentActivityLogs.agentId, agentId))
      .orderBy(desc(agentActivityLogs.createdAt))
      .limit(limit);
  }

  async getAgentPerformanceStats(agentId: string, hours = 24): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    successRate: number;
  }> {
    const activities = await db
      .select()
      .from(agentActivityLogs)
      .where(eq(agentActivityLogs.agentId, agentId));

    const totalRequests = activities.length;
    const successfulRequests = activities.filter(a => a.status === 'success').length;
    const failedRequests = activities.filter(a => a.status === 'failed').length;
    
    const responseTimes = activities
      .filter(a => a.duration !== null)
      .map(a => a.duration!);
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      successRate,
    };
  }

  // Get daily message counts for a specific agent (last 7 days)
  async getAgentDailyMessageCounts(agentId: string, userId: string): Promise<number[]> {
    try {
      console.log(`🔍 Getting daily message counts for agent: ${agentId}, user: ${userId}`);
      
      // Get agent conversations
      const agentConversations = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.agentId, agentId),
            eq(conversations.userId, userId)
          )
        );

      console.log(`📊 Found ${agentConversations.length} conversations for agent`);
      const conversationIds = agentConversations.map(conv => conv.id);
      
      // Get all messages from these conversations
      let allMessages: Message[] = [];
      for (const conversationId of conversationIds) {
        const messages = await this.getMessagesByConversationId(conversationId, userId);
        allMessages = allMessages.concat(messages);
        console.log(`💬 Conversation ${conversationId}: ${messages.length} messages`);
      }

      console.log(`📈 Total messages found: ${allMessages.length}`);

      // Calculate daily message counts (last 7 days)
      const dailyCounts: number[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);
        
        const dayMessages = allMessages.filter(message => {
          const messageDate = new Date(message.createdAt);
          const isInDateRange = messageDate >= targetDate && messageDate < nextDate;
          const isUserMessage = message.sender === 'user'; // Only count user messages
          return isInDateRange && isUserMessage;
        }).length;
        
        console.log(`📅 ${targetDate.toDateString()}: ${dayMessages} user messages`);
        dailyCounts.push(dayMessages);
      }
      
      console.log(`📊 Final daily counts:`, dailyCounts);
      return dailyCounts;
    } catch (error) {
      console.error("Error getting agent daily message counts:", error);
      return [0, 0, 0, 0, 0, 0, 0];
    }
  }

  // Account deletion system implementation
  
  // Schedule account deletion (30-day grace period)
  async scheduleAccountDeletion(userId: string, reason?: string): Promise<AccountDeletion> {
    try {
      // Cancel any existing scheduled deletion first
      await this.cancelAccountDeletion(userId).catch(() => {
        // Ignore error if no existing deletion
      });
      
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30); // 30 days from now
      
      // First, deactivate user status
      await this.deactivateUser(userId);
      
      // Create deletion schedule
      const [deletion] = await db.insert(accountDeletions).values({
        userId,
        deletionDate,
        reason,
        status: 'scheduled'
      }).returning();
      
      return deletion;
    } catch (error: any) {
      console.error('Schedule account deletion error:', error);
      throw new Error(`Failed to schedule account deletion: ${error.message}`);
    }
  }
  
  // Cancel scheduled deletion and reactivate account
  async cancelAccountDeletion(userId: string): Promise<boolean> {
    try {
      // Update deletion status to cancelled
      const result = await db.update(accountDeletions)
        .set({ 
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(accountDeletions.userId, userId),
          eq(accountDeletions.status, 'scheduled')
        ))
        .returning({ id: accountDeletions.id });
      
      if (result.length === 0) {
        return false; // No scheduled deletion found
      }
      
      // Reactivate user
      await this.reactivateUser(userId);
      return true;
    } catch (error: any) {
      console.error('Cancel account deletion error:', error);
      throw new Error(`Failed to cancel account deletion: ${error.message}`);
    }
  }
  
  // Check if user has scheduled deletion
  async getScheduledDeletion(userId: string): Promise<AccountDeletion | null> {
    try {
      const [deletion] = await db.select()
        .from(accountDeletions)
        .where(and(
          eq(accountDeletions.userId, userId),
          eq(accountDeletions.status, 'scheduled')
        ))
        .limit(1);
      
      return deletion || null;
    } catch (error: any) {
      console.error('Error getting scheduled deletion:', error);
      return null;
    }
  }

  // Get recently cancelled deletion (within last 5 minutes) for notification purposes
  async getRecentlyCancelledDeletion(userId: string): Promise<AccountDeletion | null> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      const [deletion] = await db.select()
        .from(accountDeletions)
        .where(and(
          eq(accountDeletions.userId, userId),
          eq(accountDeletions.status, 'cancelled'),
          gt(accountDeletions.cancelledAt, fiveMinutesAgo)
        ))
        .orderBy(desc(accountDeletions.cancelledAt))
        .limit(1);
        
      return deletion || null;
    } catch (error: any) {
      console.error('Error getting recently cancelled deletion:', error);
      return null; // Don't throw, just return null for notifications
    }
  }
  
  // Deactivate user (preserves data)
  async deactivateUser(userId: string): Promise<void> {
    try {
      // Update or create user status
      await db.insert(userStatus).values({
        userId,
        isActive: false,
        deactivatedAt: new Date(),
        lastActiveAt: new Date()
      })
      .onConflictDoUpdate({
        target: userStatus.userId,
        set: {
          isActive: false,
          deactivatedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Deactivate all user agents
      await db.update(agents)
        .set({ is_active: false, updatedAt: new Date() })
        .where(eq(agents.userId, userId));
    } catch (error: any) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }
  
  // Reactivate user
  async reactivateUser(userId: string): Promise<void> {
    try {
      // Update user status to active
      await db.update(userStatus)
        .set({ 
          isActive: true,
          deactivatedAt: null,
          lastActiveAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userStatus.userId, userId));
      
      // Reactivate all user agents
      await db.update(agents)
        .set({ is_active: true, updatedAt: new Date() })
        .where(eq(agents.userId, userId));
    } catch (error: any) {
      throw new Error(`Failed to reactivate user: ${error.message}`);
    }
  }
  
  // Get user status
  async getUserStatus(userId: string): Promise<UserStatus | null> {
    try {
      const [status] = await db.select()
        .from(userStatus)
        .where(eq(userStatus.userId, userId))
        .limit(1);
      
      return status || null;
    } catch (error: any) {
      console.error('Error getting user status:', error);
      return null;
    }
  }
  
  // Complete account deletion (actually delete data)
  async completeAccountDeletion(userId: string): Promise<void> {
    try {
      // Get all agents for this user first (for Dialogflow cleanup)
      const userAgents = await this.getAgentsByUserId(userId);
      
      // Delete each agent (this will also clean up Dialogflow CX agents)
      for (const agent of userAgents) {
        await this.deleteAgent(agent.id, userId);
      }
      
      // Delete all related data (order matters for foreign key constraints)
      await db.delete(calendarOperations).where(eq(calendarOperations.userId, userId));
      await db.delete(userGoogleCalendars).where(eq(userGoogleCalendars.userId, userId));
      await db.delete(conversations).where(eq(conversations.userId, userId));
      await db.delete(toolsSettings).where(eq(toolsSettings.userId, userId));
      await db.delete(integrationsConnections).where(eq(integrationsConnections.userId, userId));
      await db.delete(userNotificationSettings).where(eq(userNotificationSettings.userId, userId));
      await db.delete(playbookBackups).where(eq(playbookBackups.userId, userId));
      await db.delete(userStatus).where(eq(userStatus.userId, userId));
      
      // Mark deletion as completed
      await db.update(accountDeletions)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(accountDeletions.userId, userId),
          eq(accountDeletions.status, 'scheduled')
        ));
      
    } catch (error: any) {
      throw new Error(`Failed to complete account deletion: ${error.message}`);
    }
  }
}

export const storage = new DatabaseStorage();
