import type { Request, Response } from "express";
import { storage } from '../database/storage';
import { openaiService } from '../services/OpenAIService';
import { db } from '../database/storage';
import { agents, conversations, messages } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { containsProfanity, getProfanityMessage } from '../utils/profanity-filter';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  MethodNotAllowed = 405,
  InternalServerError = 500,
}

enum ErrorMessage {
  InvalidUUID = "geçerli UUID formatında olmalı",
  EmptyMessage = "message boş olmamalı",
  AgentNotFound = "Agent bulunamadı",
  NoAccess = "Bu agent'a erişim yetkiniz yok",
  NoResponse = "OpenAI'dan yanıt alınamadı",
  ServerError = "Sunucu hatası",
  InvalidMethod = "Yalnızca POST istekleri desteklenir",
  InvalidContentType = "Content-Type application/json olmalı",
  InvalidToken = "Geçerli bir Bearer token gerekli",
  OpenAINotConfigured = "OpenAI yapılandırılmamış",
}

interface ChatRequest {
  agentId: string;
  message: string;
  sessionId?: string;
  languageCode?: string;
  userId?: string;
}

interface ChatResponse {
  success: boolean;
  response?: {
    text: string;
    sessionId: string;
    responseId?: string;
    model?: string;
    usage?: any;
  };
  error?: string;
  debugLogs?: string[];
}

const addDebugLog = (logs: string[], message: string, isDebug = false) => {
  if (isDebug) {
    logs.push(message);
  }
};

const sendErrorResponse = (
  res: Response<ChatResponse>, 
  status: HttpStatus, 
  message: string, 
  debugLogs: string[], 
  isDebug = false
): Response<ChatResponse> => {
  addDebugLog(debugLogs, `Error: ${message}`, isDebug);
  return res.status(status).json({
    success: false,
    error: message,
    debugLogs: isDebug ? debugLogs : undefined,
  });
};

const generateSessionId = (userId: string, agentId: string): string => {
  return `${userId}-${agentId}-${Date.now()}`;
};

// Get conversation history for context
async function getConversationHistory(
  conversationId: string, 
  limit: number = 10
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  try {
    const messageHistory = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Reverse to get chronological order and format for OpenAI
    return messageHistory.reverse().map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content || ''
    }));
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

// Store message in database
async function storeMessage(
  conversationId: string,
  sender: string,
  content: string
): Promise<void> {
  try {
    await db.insert(messages).values({
      conversationId,
      sender,
      content
    });
  } catch (error) {
    console.error('Error storing message:', error);
  }
}

// Get or create conversation
async function getOrCreateConversation(
  userId: string,
  agentId: string,
  sessionId: string
): Promise<string> {
  try {
    // Try to find existing conversation by session or recent conversation
    const [existingConversation] = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId),
        eq(conversations.agentId, agentId)
      ))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);

    if (existingConversation) {
      // Update last message time
      await db.update(conversations).set({
        updatedAt: new Date(),
        lastMessageAt: new Date()
      }).where(eq(conversations.id, existingConversation.id));
      
      return existingConversation.id;
    }

    // Create new conversation
    const [newConversation] = await db.insert(conversations).values({
      userId,
      agentId,
      channel: 'web',
      status: 'active',
      meta: { sessionId }
    }).returning();

    return newConversation.id;
  } catch (error) {
    console.error('Error managing conversation:', error);
    throw error;
  }
}

export const chatWithOpenAIAgent = async (req: Request, res: Response<ChatResponse>) => {
  const debugLogs: string[] = [];
  const isDebug = req.query.debug === 'true';

  try {
    // Method validation
    if (req.method !== 'POST') {
      return sendErrorResponse(res, HttpStatus.MethodNotAllowed, ErrorMessage.InvalidMethod, debugLogs, isDebug);
    }

    // Content-Type validation
    if (!req.headers['content-type']?.includes('application/json')) {
      return sendErrorResponse(res, HttpStatus.BadRequest, ErrorMessage.InvalidContentType, debugLogs, isDebug);
    }

    // Extract request data
    const { agentId, message, sessionId, languageCode = 'tr', userId } = req.body as ChatRequest;

    // Basic validation
    if (!agentId || !UUID_REGEX.test(agentId)) {
      return sendErrorResponse(res, HttpStatus.BadRequest, `agentId ${ErrorMessage.InvalidUUID}`, debugLogs, isDebug);
    }

    if (!message?.trim()) {
      return sendErrorResponse(res, HttpStatus.BadRequest, ErrorMessage.EmptyMessage, debugLogs, isDebug);
    }

    if (!userId) {
      return sendErrorResponse(res, HttpStatus.BadRequest, "userId gerekli", debugLogs, isDebug);
    }

    // Profanity check - critical security feature
    if (containsProfanity(message)) {
      return sendErrorResponse(res, HttpStatus.BadRequest, getProfanityMessage(), debugLogs, isDebug);
    }

    addDebugLog(debugLogs, `🤖 Starting OpenAI chat for agent: ${agentId}`, isDebug);

    // Get agent data and verify access
    const [agentData] = await db.select().from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
      .limit(1);

    if (!agentData) {
      return sendErrorResponse(res, HttpStatus.NotFound, ErrorMessage.AgentNotFound, debugLogs, isDebug);
    }

    if (!agentData.openaiInstructions) {
      return sendErrorResponse(res, HttpStatus.BadRequest, "Agent OpenAI talimatları eksik", debugLogs, isDebug);
    }

    addDebugLog(debugLogs, `✅ Agent found: ${agentData.name}`, isDebug);

    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId(userId, agentId);
    addDebugLog(debugLogs, `📱 Using session ID: ${finalSessionId}`, isDebug);

    // Get or create conversation
    const conversationId = await getOrCreateConversation(userId, agentId, finalSessionId);
    addDebugLog(debugLogs, `💬 Conversation ID: ${conversationId}`, isDebug);

    // Get conversation history for context
    const conversationHistory = await getConversationHistory(conversationId, 10);
    addDebugLog(debugLogs, `📚 Retrieved ${conversationHistory.length} previous messages`, isDebug);

    // Store user message
    await storeMessage(conversationId, 'user', message);

    // Chat with OpenAI
    let openaiResponse = '';
    let responseMetadata: any = {};

    try {
      addDebugLog(debugLogs, '🔄 Sending request to OpenAI...', isDebug);
      
      openaiResponse = await openaiService.chatWithAgent(
        agentData.openaiInstructions,
        message,
        conversationHistory
      );

      responseMetadata = {
        model: agentData.openaiModel || 'gpt-4o-mini',
        usage: { /* OpenAI usage info could be added here */ }
      };

      addDebugLog(debugLogs, `✅ OpenAI response received: ${openaiResponse.length} characters`, isDebug);
    } catch (openaiError: any) {
      addDebugLog(debugLogs, `❌ OpenAI error: ${openaiError.message}`, isDebug);
      return sendErrorResponse(res, HttpStatus.InternalServerError, `${ErrorMessage.NoResponse}: ${openaiError.message}`, debugLogs, isDebug);
    }

    if (!openaiResponse.trim()) {
      return sendErrorResponse(res, HttpStatus.InternalServerError, ErrorMessage.NoResponse, debugLogs, isDebug);
    }

    // Store assistant response
    await storeMessage(conversationId, 'assistant', openaiResponse);

    addDebugLog(debugLogs, '✅ Chat completed successfully', isDebug);

    // Return successful response
    return res.status(HttpStatus.Ok).json({
      success: true,
      response: {
        text: openaiResponse,
        sessionId: finalSessionId,
        responseId: `openai-${Date.now()}`,
        model: responseMetadata.model,
        usage: responseMetadata.usage
      },
      debugLogs: isDebug ? debugLogs : undefined,
    });

  } catch (error: any) {
    console.error("OpenAI Chat Error:", error);
    addDebugLog(debugLogs, `❌ Fatal error: ${error.message}`, isDebug);

    return sendErrorResponse(res, HttpStatus.InternalServerError, ErrorMessage.ServerError, debugLogs, isDebug);
  }
};