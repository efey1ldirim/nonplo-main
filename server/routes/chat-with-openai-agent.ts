import type { Request, Response } from "express";
import { storage } from '../database/storage';
import { openaiService } from '../services/OpenAIService';
import { db } from '../database/db';
import { agents, conversations, messages } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { containsProfanity, getProfanityMessage } from '../utils/profanity-filter';
import OpenAI from 'openai';

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
    return messageHistory.reverse().map((msg: any) => ({
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

// Get or create OpenAI thread for conversation
async function getOrCreateThread(
  conversationId: string,
  assistantId: string,
  debugLogs: string[],
  isDebug: boolean
): Promise<string> {
  try {
    // Check if conversation already has a thread ID in meta
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (conversation && conversation.meta && (conversation.meta as any).threadId) {
      addDebugLog(debugLogs, `🔄 Using existing thread: ${(conversation.meta as any).threadId}`, isDebug);
      return (conversation.meta as any).threadId;
    }

    // Create new OpenAI thread
    addDebugLog(debugLogs, '🆕 Creating new OpenAI thread...', isDebug);
    const thread = await openaiService.openai.beta.threads.create();
    
    // Update conversation with thread ID
    const updatedMeta = { ...(conversation?.meta || {}), threadId: thread.id };
    await db.update(conversations).set({
      meta: updatedMeta,
      updatedAt: new Date()
    }).where(eq(conversations.id, conversationId));

    addDebugLog(debugLogs, `✅ Created new thread: ${thread.id}`, isDebug);
    return thread.id;
  } catch (error) {
    console.error('Error managing OpenAI thread:', error);
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

    // Profanity check disabled - now handled by OpenAI Assistant file search
    // if (containsProfanity(message)) {
    //   return sendErrorResponse(res, HttpStatus.BadRequest, getProfanityMessage(), debugLogs, isDebug);
    // }

    addDebugLog(debugLogs, `🤖 Starting OpenAI chat for agent: ${agentId}`, isDebug);

    // Get agent data and verify access
    const [agentData] = await db.select().from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
      .limit(1);

    if (!agentData) {
      return sendErrorResponse(res, HttpStatus.NotFound, ErrorMessage.AgentNotFound, debugLogs, isDebug);
    }

    if (!agentData.openaiAssistantId) {
      return sendErrorResponse(res, HttpStatus.BadRequest, "Agent OpenAI Assistant ID eksik", debugLogs, isDebug);
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

    // Chat with OpenAI Assistant API (uses file search for profanity filtering)
    let openaiResponse = '';
    let responseMetadata: any = {};

    try {
      addDebugLog(debugLogs, '🔄 Using OpenAI Assistant API with file search...', isDebug);
      
      // Create or get existing thread for this conversation
      const threadId = await getOrCreateThread(conversationId, agentData.openaiAssistantId, debugLogs, isDebug);
      addDebugLog(debugLogs, `🧵 Thread ID: ${threadId}`, isDebug);

      // Add user message to thread
      await openaiService.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });
      addDebugLog(debugLogs, '📝 User message added to thread', isDebug);

      // Run the assistant
      const run = await openaiService.openai.beta.threads.runs.create(threadId, {
        assistant_id: agentData.openaiAssistantId
      });
      addDebugLog(debugLogs, `🏃 Run started: ${run.id}`, isDebug);

      // Wait for completion
      let currentRun = run;
      let attempts = 0;
      const maxAttempts = 30;

      while (["queued", "in_progress"].includes(currentRun.status) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        currentRun = await openaiService.openai.beta.threads.runs.retrieve(threadId, run.id);
        addDebugLog(debugLogs, `⏳ Run status (${attempts}/${maxAttempts}): ${currentRun.status}`, isDebug);
      }

      if (currentRun.status !== "completed") {
        throw new Error(`Assistant run failed with status: ${currentRun.status}`);
      }

      // Get the assistant's response
      const messagesResponse = await openaiService.openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 1
      });

      const lastMessage = messagesResponse.data[0];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
        openaiResponse = lastMessage.content[0].text.value;
      } else {
        throw new Error('No valid assistant response found');
      }

      responseMetadata = {
        model: 'gpt-4o-mini',
        usage: currentRun.usage || {}
      };

      addDebugLog(debugLogs, `✅ Assistant response received: ${openaiResponse.length} characters`, isDebug);
    } catch (openaiError: any) {
      addDebugLog(debugLogs, `❌ OpenAI Assistant error: ${openaiError.message}`, isDebug);
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