import { Request, Response } from 'express';
import OpenAI from 'openai';
import { storage } from '../database/storage';
import { CalendarService } from '../services/CalendarService';
import { webSearch, validateWebSearchQuery } from '../tools/webSearch';
import { v4 as uuidv4 } from 'uuid';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatRequest {
  assistantId: string;
  message: string;
  threadId?: string;
  agentId: string;
}

const MAX_ATTEMPTS = 40;
const SLEEP_POLL_MS = 900;
const SLEEP_TOOL_MS = 600;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeParse<T = any>(json: string | undefined): T | {} {
  if (!json) return {};
  try { return JSON.parse(json) as T; } catch { return {}; }
}

// Language detection function
const detectLanguage = (text: string): string => {
  const lowerText = text.toLowerCase();

  // Turkish words and characters
  const turkishWords = ['nedir', 'nasıl', 'ne', 'hakkında', 'için', 'ile', 'dan', 'den', 'lar', 'ler', 'ın', 'in', 'un', 'ün', 'ım', 'im', 'um', 'üm'];
  const turkishChars = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü'];

  // English words
  const englishWords = ['what', 'how', 'about', 'with', 'from', 'the', 'and', 'for', 'are', 'is', 'can', 'will', 'would'];

  let turkishScore = 0;
  let englishScore = 0;

  // Turkish character check
  turkishChars.forEach(char => {
    if (lowerText.includes(char)) turkishScore += 2;
  });

  // Word check
  turkishWords.forEach(word => {
    if (lowerText.includes(word)) turkishScore += 1;
  });

  englishWords.forEach(word => {
    if (lowerText.includes(word)) englishScore += 1;
  });

  return turkishScore > englishScore ? 'tr' : 'en';
};

// Google Calendar Tools
const GCAL_TOOLS: OpenAI.Beta.Assistants.AssistantTool[] = [
    {
        type: "function",
        function: {
            name: "gcal_list_events",
            description: "List upcoming events from the user Google Calendar (primary).",
            parameters: {
                type: "object",
                properties: {
                    timeMin: { type: "string", description: "ISO8601 start (optional)" },
                    timeMax: { type: "string", description: "ISO8601 end (optional)" },
                    maxResults: { type: "number", description: "Max events to return (default 10)" },
                    q: { type: "string", description: "Free text query (optional)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "gcal_create_event",
            description: "Create an event in the user primary Google Calendar. IMPORTANT: Always confirm the details with the user before creating the event. Ask for confirmation like 'Shall I create this appointment for you?' and wait for user approval.",
            parameters: {
                type: "object",
                properties: {
                    summary: { type: "string", description: "Event title" },
                    description: { type: "string", description: "Event description (optional)" },
                    startISO: { type: "string", description: "Event start in ISO8601" },
                    endISO: { type: "string", description: "Event end in ISO8601" },
                    location: { type: "string", description: "Location (optional)" },
                    attendees: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: { email: { type: "string" } },
                            required: ["email"]
                        },
                        description: "Event attendees (optional)"
                    }
                },
                required: ["summary", "startISO", "endISO"]
            }
        }
    }
];

// Calendar service instance
const calendarService = new CalendarService();

export const chatWithAgent = async (req: any, res: Response) => {
  console.log('💬 Chat API request received');
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not defined');
    }

    const { assistantId, message, threadId, agentId }: ChatRequest = req.body;
    const userId = req.user?.id; // Get userId from authenticated request
    
    if (!assistantId || !message || !userId || !agentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Assistant ID, message, user ID and agent ID required' 
      });
    }

    console.log(`💬 Chat request - Agent: ${agentId}, Assistant: ${assistantId.slice(0, 20)}...`);

    // Get agent details
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agent not found' 
      });
    }

    // Language detection
    const detectedLanguage = detectLanguage(message);
    console.log(`🌍 Detected language: ${detectedLanguage}`);

    // Add language instruction to message
    const languageInstruction = detectedLanguage === 'tr'
      ? '\n\n[Sistem: Bu soruyu Türkçe yanıtla.]'
      : '\n\n[System: Please respond in English.]';

    const finalMessage = message + languageInstruction;

    // Thread management
    let currentThreadId = threadId;
    let conversation = null;

    if (currentThreadId) {
      // Get existing conversation
      conversation = await storage.getConversationByThreadId(currentThreadId);
    }

    if (!currentThreadId) {
      // Create new OpenAI thread
      const newThread = await openai.beta.threads.create();
      currentThreadId = newThread.id;
      console.log(`🧵 New thread created: ${currentThreadId}`);

      // Create conversation in database
      conversation = await storage.createConversation({
        userId,
        agentId,
        threadId: currentThreadId,
        channel: 'web',
        status: 'active',
        meta: {
          agentName: agent.name,
          assistantId: assistantId
        }
      });
      console.log(`💾 Conversation created: ${conversation.id}`);
    }

    // Store user message in database
    if (conversation) {
      await storage.createMessage({
        conversationId: conversation.id,
        sender: 'user',
        content: message,
        attachments: []
      });
      console.log('💾 User message stored in database');
    }

    // Add user message to OpenAI thread
    await openai.beta.threads.messages.create(currentThreadId!, {
      role: 'user',
      content: finalMessage,
    });
    console.log('📤 User message added to OpenAI thread');

    // Define tools - including Google Calendar tools
    const tools: any[] = [
      // Code interpreter tool
      { type: 'code_interpreter' },
      // File search tool  
      { type: 'file_search' },
      // Google Calendar tools
      ...GCAL_TOOLS
    ];

    // Start OpenAI run
    let run = await openai.beta.threads.runs.create(currentThreadId!, {
      assistant_id: assistantId,
      tools: tools.length > 0 ? tools : undefined,
    });
    console.log(`🏃 OpenAI run started: ${run.id}`);

    // Tool-calling loop
    for (let attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
      if (!currentThreadId || !run.id) {
        throw new Error(`Invalid IDs: threadId=${currentThreadId}, runId=${run.id}`);
      }

      try {
        run = await openai.beta.threads.runs.retrieve(run.id, { thread_id: currentThreadId });
        console.log(`🔄 Run status (attempt ${attempts}): ${run.status}`);
      } catch (retrieveError: any) {
        console.log(`❌ OpenAI retrieve error: ${retrieveError.message}`);
        // Fallback to REST API
        const response = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        if (!response.ok) throw new Error(`REST API failed: ${response.status}`);
        run = await response.json();
      }

      // Handle tool calls if needed
      if (run.status === 'requires_action') {
        const action = run.required_action?.submit_tool_outputs;
        const toolCalls = action?.tool_calls || [];
        console.log(`🔧 Tool calls required: ${toolCalls.length}`);

        const toolOutputs: { tool_call_id: string; output: string }[] = [];

        for (const toolCall of toolCalls) {
          const fnName = toolCall.function.name;
          const args = safeParse<any>(toolCall.function.arguments);

          console.log(`🔧 Tool call: ${fnName}`);

          // Handle Google Calendar tools
          let result: any = {};
          
          try {
            switch (fnName) {
              case 'gcal_list_events':
                console.log('📅 Executing gcal_list_events with args:', args);
                const eventsList = await calendarService.listEvents(
                  userId,
                  agentId,
                  args.timeMin,
                  args.timeMax,
                  args.maxResults || 10,
                  args.q
                );
                result = {
                  success: true,
                  events: eventsList.events,
                  message: `Found ${eventsList.events?.length || 0} events`
                };
                break;
                
              case 'gcal_create_event':
                console.log('📅 Executing gcal_create_event with args:', args);
                const createResult = await calendarService.createEvent(userId, agentId, {
                  title: args.summary,
                  startTime: args.startISO,
                  endTime: args.endISO,
                  description: args.description,
                  attendees: args.attendees?.map((a: any) => a.email) || []
                });
                result = createResult;
                break;
                
              case 'web_search':
                console.log('🔍 Executing web_search with args:', args);
                
                // Validate the search query
                const validation = validateWebSearchQuery(args.query);
                if (!validation.valid) {
                  result = {
                    success: false,
                    error: validation.error,
                    message: `Web search failed: ${validation.error}`
                  };
                  break;
                }
                
                const searchResult = await webSearch({
                  query: args.query,
                  maxResults: args.max_results || 3,
                  language: args.language || 'tr'
                });
                
                result = {
                  success: true,
                  summary: searchResult.summary,
                  sources: searchResult.sources,
                  message: `Web search completed for: ${args.query}`
                };
                break;
                
              default:
                result = { 
                  success: false,
                  message: `Unknown tool: ${fnName}` 
                };
            }
          } catch (error: any) {
            console.error(`❌ Tool execution error for ${fnName}:`, error);
            result = { 
              success: false, 
              error: error.message || 'Tool execution failed',
              message: `Failed to execute ${fnName}: ${error.message || 'Unknown error'}`
            };
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(result)
          });
        }

        await openai.beta.threads.runs.submitToolOutputs(run.id, {
          thread_id: currentThreadId,
          tool_outputs: toolOutputs,
        });

        await sleep(SLEEP_TOOL_MS);
        continue;
      }

      if (run.status === 'completed') break;
      if (['failed', 'cancelled', 'expired'].includes(run.status ?? '')) {
        throw new Error(`Run ${run.status}`);
      }

      await sleep(SLEEP_POLL_MS);
      if (attempts === MAX_ATTEMPTS && run.status !== 'completed') {
        throw new Error(`Response timeout: run.status=${run.status}`);
      }
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(currentThreadId!);
    const assistantMessage = messages.data
      .filter(msg => msg.role === 'assistant')
      .sort((a, b) => new Date(b.created_at * 1000).getTime() - new Date(a.created_at * 1000).getTime())[0];

    let response = 'No response from assistant';
    if (assistantMessage?.content[0]?.type === 'text') {
      response = assistantMessage.content[0].text.value;
    }

    // Store assistant response in database
    if (conversation) {
      await storage.createMessage({
        conversationId: conversation.id,
        sender: 'agent',
        content: response,
        attachments: []
      });
      console.log('💾 Assistant response stored in database');

      // Update conversation last message time
      await storage.updateConversationLastMessage(conversation.id);
    }

    console.log('✅ Chat completed successfully');

    return res.status(200).json({
      success: true,
      response,
      threadId: currentThreadId,
      conversationId: conversation?.id,
      agentName: agent.name,
      detectedLanguage
    });

  } catch (error: any) {
    console.error('❌ Chat error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Chat failed'
    });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const userId = req.user?.id;

    if (!userId || !agentId) {
      return res.status(400).json({ error: 'User ID and Agent ID required' });
    }

    const conversations = await storage.getConversationsByAgent(userId, agentId);
    
    return res.status(200).json({
      success: true,
      conversations
    });

  } catch (error: any) {
    console.error('Error getting chat history:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get chat history'
    });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!userId || !conversationId) {
      return res.status(400).json({ error: 'User ID and Conversation ID required' });
    }

    const messages = await storage.getMessagesByConversation(conversationId);
    
    return res.status(200).json({
      success: true,
      messages
    });

  } catch (error: any) {
    console.error('Error getting messages:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get messages'
    });
  }
};