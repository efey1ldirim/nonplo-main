import type { Request, Response } from "express";
import { SessionsClient } from "@google-cloud/dialogflow-cx";
import { storage } from '../database/storage';
import { CalendarService } from '../services/CalendarService';

const defaultProjectId = process.env.CX_LOCATION || "nonplo-auth2";
const defaultLocation = process.env.CX_PROJECT_ID || "europe-west3";

// Initialize Dialogflow CX Sessions Client
let sessionsClient: SessionsClient | null = null;

try {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson);
    
    sessionsClient = new SessionsClient({
      projectId: defaultProjectId,
      apiEndpoint: `${defaultLocation}-dialogflow.googleapis.com`,
      credentials: credentials,
    });
    
    // Dialogflow CX client initialized successfully
  } else {
    // GOOGLE_APPLICATION_CREDENTIALS_JSON not found
  }
} catch (error) {
  // Dialogflow CX client initialization failed
  sessionsClient = null;
}

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
  NoResponse = "Dialogflow'dan yanıt alınamadı",
  ServerError = "Sunucu hatası",
  InvalidMethod = "Yalnızca POST istekleri desteklenir",
  InvalidContentType = "Content-Type application/json olmalı",
  InvalidToken = "Geçerli bir Bearer token gerekli",
}

interface ChatRequest {
  agentId: string;
  message: string;
  sessionId?: string;
  languageCode?: string;
  projectId?: string;
  location?: string;
  playbookId: string;
  userId?: string; // Replit sisteminde userId parameter olarak geliyor
}

interface ChatResponse {
  success: boolean;
  response?: {
    text: string;
    sessionId: string;
    responseId?: string;
    intent?: string;
    parameters?: Record<string, any>;
  };
  error?: string;
  debugLogs?: string[];
}

interface AgentData {
  id: string;
  userId: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface PlaybookData {
  playbookId: string;
  config: any;
  instructions: any;
}

// Utils
function generateSessionId(userId: string, agentId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId.substring(0, 8)}-${agentId.substring(0, 8)}-${timestamp}-${random}`;
}

function parseDialogflowResponse(response: any, sessionId: string) {
  const text =
    response.queryResult?.responseMessages?.find((msg: any) => msg.text)?.text?.text?.[0] ||
    "Üzgünüm, yanıt alınamadı.";
  return {
    text,
    sessionId,
    responseId: response.responseId || "",
    intent: response.queryResult?.intent?.displayName || "",
    parameters: response.queryResult?.parameters
      ? JSON.parse(JSON.stringify(response.queryResult.parameters))
      : {},
  };
}

const validateUUID = (id: string | undefined, name: string): string | null => {
  if (!id || !UUID_REGEX.test(id)) {
    return `${name} ${ErrorMessage.InvalidUUID}`;
  }
  return null;
};

const sendErrorResponse = (res: Response, status: HttpStatus, error: string, debugLogs?: string[], isDebug: boolean = false) => {
  return res.status(status).json({
    success: false,
    error,
    ...(isDebug && debugLogs && { debugLogs }),
  });
};

// Agent ID mapping: Database IDs → Dialogflow CX Agent IDs
const agentIdMapping: { [key: string]: string } = {
  'c265cbda-9a0a-4aa9-afdb-8b455a27af40': '131a7f30-ff42-48d9-94be-9e35e17dbf4e', // W5
  '936c9bd9-4b17-4343-9c17-77dfb67ae844': '4d4f4382-41fa-4a05-bc30-d2288416b8eb', // W4  
  '2844202e-aa4b-4120-a6cf-8ec5b3e896ef': 'd7d67b27-183f-45f9-8d9f-e6c28d274699', // W3
  '0c97036d-deac-4cb8-b63e-25f1c224c1d3': 'dabdb1ba-6cd9-4ffd-b6a8-f0f8810a9c03', // W2
};

const fetchAgentAndPlaybookData = async (agentId: string, playbookId: string, userId: string): Promise<{agentData: AgentData | null, playbookData: PlaybookData | null, dialogflowCxAgentId: string | null}> => {
  try {
    // Fetch agent data using storage interface
    const allAgents = await storage.getAgentsByUserId(userId);
    const agentData = allAgents.find((agent: any) => agent.id === agentId);
    


    if (!agentData) {
      return { agentData: null, playbookData: null, dialogflowCxAgentId: null };
    }

    // Get the Dialogflow CX agent ID from the agent data
    let dialogflowCxAgentId = agentData.dialogflowCxAgentId;

    // Fetch playbook data for this agent
    let playbookData = null;
    try {
      // First try to get playbook by agent ID
      const playbook = await storage.getPlaybookByAgentId(agentId);
      if (playbook) {
        playbookData = {
          playbookId: playbook.id,
          config: playbook.config,
          instructions: playbook.config?.conversationFlow || playbook.config?.instruction || null
        } as PlaybookData;

        
        // Also try to get Dialogflow CX agent ID from playbook config if not in agent data
        if (!dialogflowCxAgentId && playbook.config?.dialogflowCxAgentId) {
          dialogflowCxAgentId = playbook.config.dialogflowCxAgentId;

        }
      } else {
        // Try playbook backup if no direct playbook found
        const playbookBackup = await storage.getPlaybookBackupByAgentId(agentId, userId);
        if (playbookBackup && playbookBackup.playbookIds) {
          playbookData = {
            playbookId: playbookBackup.id,
            config: playbookBackup.playbookIds,
            instructions: "Playbook backup data available"
          } as PlaybookData;
  
        }
      }
    } catch (playbookError) {
      // Playbook fetch failed, continue without it
    }

    // Map database fields to AgentData interface
    const mappedAgentData: AgentData = {
      id: agentData.id,
      userId: agentData.userId,
      name: agentData.name,
      role: agentData.role,
      isActive: agentData.is_active // Map snake_case to camelCase
    };

    return { 
      agentData: mappedAgentData, 
      playbookData: playbookData,
      dialogflowCxAgentId: dialogflowCxAgentId
    };
  } catch (error) {
    return { agentData: null, playbookData: null, dialogflowCxAgentId: null };
  }
};

const createSessionPath = (projectId: string, location: string, agentId: string, sessionId: string) => {
  if (!sessionsClient) {
    return `projects/${projectId}/locations/${location}/agents/${agentId}/sessions/${sessionId}`;
  }
  return sessionsClient.projectLocationAgentSessionPath(
    projectId,
    location,
    agentId,
    sessionId
  );
};

const createDetectIntentRequest = (sessionPath: string, message: string, languageCode: string) => {
  return {
    session: sessionPath,
    queryInput: {
      text: {
        text: message.trim(),
      },
      languageCode,
    },
  };
};

export async function chatWithCxAgent(
  req: Request,
  res: Response
) {
  const debugLogs: string[] = [];
  const isDebug = process.env.NODE_ENV === 'development';
  
  try {
    if (req.method !== "POST") {
      return sendErrorResponse(res, HttpStatus.MethodNotAllowed, ErrorMessage.InvalidMethod, debugLogs, isDebug);
    }

    const body: ChatRequest = req.body;
    const { agentId, message, sessionId, languageCode = "tr", projectId, location, playbookId, userId } = body;

    // Validation
    const agentIdError = validateUUID(agentId, "agentId");
    
    // Skip playbook validation if it's the default fallback UUID
    const playbookIdError = playbookId === '00000000-0000-0000-0000-000000000000' ? null : validateUUID(playbookId, "playbookId");
    
    if (agentIdError || playbookIdError || typeof message !== "string" || message.trim() === "") {
      return sendErrorResponse(res, HttpStatus.BadRequest, agentIdError || playbookIdError || ErrorMessage.EmptyMessage, debugLogs, isDebug);
    }

    if (!userId) {
      return sendErrorResponse(res, HttpStatus.BadRequest, "userId gerekli", debugLogs, isDebug);
    }



    // Fetch agent and playbook data
    const { agentData, playbookData, dialogflowCxAgentId } = await fetchAgentAndPlaybookData(agentId, playbookId, userId);
    


    if (!agentData) {
      return sendErrorResponse(res, HttpStatus.NotFound, ErrorMessage.AgentNotFound, debugLogs, isDebug);
    }


    
    // Check if agent is active
    if (!agentData.isActive) {

      return sendErrorResponse(res, HttpStatus.BadRequest, "Bu AI asistanı şu anda devre dışı. Lütfen agent ayarlarından aktif hale getirin.", debugLogs, isDebug);
    }
    

    


    // Use the Dialogflow CX agent ID from database (primary) or fallback to hardcoded mapping
    let dialogflowAgentId = dialogflowCxAgentId || agentIdMapping[agentId];
    
    // If still no mapping found, this agent hasn't been properly integrated with Dialogflow CX
    if (!dialogflowAgentId) {
      return sendErrorResponse(res, HttpStatus.NotFound, `Agent ${agentData.name} için Dialogflow CX mapping bulunamadı. Playbook oluşturulmamış olabilir.`, debugLogs, isDebug);
    }

    // Prepare Dialogflow CX session
    const finalProjectId = projectId || defaultProjectId;
    const finalLocation = location || defaultLocation;
    const finalSessionId = sessionId || generateSessionId(userId, agentId);
    
    // Debug logging for sessionId tracking (temporary)
    console.log(`🔍 Chat Debug - SessionId received: ${sessionId}, Final SessionId: ${finalSessionId}`);

    const sessionPath = createSessionPath(finalProjectId, finalLocation, dialogflowAgentId, finalSessionId);
    const detectIntentRequest = createDetectIntentRequest(sessionPath, message, languageCode);

    if (!sessionsClient) {
      return sendErrorResponse(res, HttpStatus.InternalServerError, "Dialogflow CX client mevcut değil", debugLogs, isDebug);
    }

    // Call Dialogflow CX
    const [dialogflowResponse] = await sessionsClient.detectIntent(detectIntentRequest);

    if (!dialogflowResponse) {
      return sendErrorResponse(res, HttpStatus.InternalServerError, ErrorMessage.NoResponse, debugLogs, isDebug);
    }

    const cleanedResponse = parseDialogflowResponse(dialogflowResponse, finalSessionId);
    
    // Calendar Tool Detection
    const intentName = dialogflowResponse.queryResult?.intent?.displayName || '';
    
    if (intentName.startsWith('calendar.')) {
      
      try {
        const calendarService = new CalendarService();
        let calendarResult;
        
        switch (intentName) {
          case 'calendar.create_event':
            const parameters = dialogflowResponse.queryResult?.parameters as any || {};
            const eventData = {
              title: parameters['event-title'] || 'Randevu',
              startTime: parameters['start-time'],
              endTime: parameters['end-time'],
              description: parameters['description'] || '',
              attendees: parameters['attendees'] || []
            };
            
            if (!eventData.startTime || !eventData.endTime) {
              calendarResult = {
                success: false,
                message: 'Randevu oluşturmak için başlangıç ve bitiş zamanı gerekli.'
              };
            } else {
              calendarResult = await calendarService.createEvent(userId, agentId, eventData);
            }
            
            debugLogs.push(`📅 Calendar create result: ${calendarResult.success}`);
            break;
            
          case 'calendar.check_availability':
            const params = dialogflowResponse.queryResult?.parameters as any || {};
            const startTime = params['start-time'];
            const endTime = params['end-time'];
            
            if (!startTime || !endTime) {
              calendarResult = {
                success: false,
                message: 'Müsaitlik kontrolü için başlangıç ve bitiş zamanı gerekli.'
              };
            } else {
              const availability = await calendarService.checkAvailability(userId, agentId, startTime, endTime);
              calendarResult = {
                success: true,
                message: availability.isAvailable 
                  ? 'Bu saatte müsaitsiniz! Randevu oluşturayım mı?' 
                  : 'Bu saatte başka randevunuz var. Farklı bir saat önerebilir miyim?',
                data: availability
              };
            }
            

            break;
            
          default:
            calendarResult = {
              success: false,
              message: 'Bu calendar işlemi henüz desteklenmiyor.'
            };
        }
        
        // Save calendar messages to database
        try {
          
          let conversation = await storage.findConversationBySessionId(userId, agentId, finalSessionId);
          if (!conversation) {
            const newConversation = {
              userId: userId,
              agentId: agentId,
              channel: 'web',
              status: 'open',
              meta: { sessionId: finalSessionId }
            };
            conversation = await storage.createConversation(newConversation);
          }

          // Save user message
          await storage.createMessage({
            conversationId: conversation.id,
            sender: 'user',
            content: message.trim()
          });

          // Save calendar response
          await storage.createMessage({
            conversationId: conversation.id,
            sender: 'agent',
            content: calendarResult.message
          });

          await storage.updateConversation(conversation.id, {});
        } catch (dbError: any) {
          // Ignore database errors
        }

        // Calendar tool result'ını response'a ekle
        return res.status(HttpStatus.Ok).json({
          success: true,
          response: {
            ...cleanedResponse,
            text: calendarResult.message,
            calendarResult: calendarResult
          },
          ...(isDebug && { debugLogs }),
        });
        
      } catch (calendarError: any) {

        
        const errorMessage = calendarError.message.includes('not connected') 
          ? 'Google Calendar bağlantısı bulunamadı. Lütfen ayarlardan Google Calendar\'ı bağlayın.'
          : 'Calendar işlemi sırasında bir hata oluştu.';
        
        // Save calendar error messages to database too
        try {
          let conversation = await storage.findConversationBySessionId(userId, agentId, finalSessionId);
          if (!conversation) {
            const newConversation = {
              userId: userId,
              agentId: agentId,
              channel: 'web',
              status: 'open',
              meta: { sessionId: finalSessionId }
            };
            conversation = await storage.createConversation(newConversation);
          }

          await storage.createMessage({
            conversationId: conversation.id,
            sender: 'user',
            content: message.trim()
          });

          await storage.createMessage({
            conversationId: conversation.id,
            sender: 'agent',
            content: errorMessage
          });

          await storage.updateConversation(conversation.id, {});
        } catch (dbError: any) {
          // Ignore error logging
        }

        return res.status(HttpStatus.Ok).json({
          success: true,
          response: {
            ...cleanedResponse,
            text: errorMessage
          },
          ...(isDebug && { debugLogs }),
        });
      }
    }

    // Save messages to database
    try {
      
      // Create or find conversation by sessionId
      let conversation = await storage.findConversationBySessionId(userId, agentId, finalSessionId);
      console.log(`🔍 Conversation found: ${conversation ? 'YES' : 'NO'}, SessionId: ${finalSessionId}`);
      if (!conversation) {
        const newConversation = {
          userId: userId,
          agentId: agentId,
          channel: 'web',
          status: 'open',
          meta: { sessionId: finalSessionId }
        };
        conversation = await storage.createConversation(newConversation);
        console.log(`🔍 New conversation created with SessionId: ${finalSessionId}`);
      }

      // Save user message
      const userMessage = {
        conversationId: conversation.id,
        sender: 'user',
        content: message.trim()
      };
      await storage.createMessage(userMessage);

      // Save agent response
      const agentMessage = {
        conversationId: conversation.id,
        sender: 'agent',
        content: cleanedResponse.text
      };
      await storage.createMessage(agentMessage);

      // Update conversation 
      await storage.updateConversation(conversation.id, {});

    } catch (dbError: any) {
      // Don't fail the whole request, just log the error
    }

    return res.status(HttpStatus.Ok).json({
      success: true,
      response: cleanedResponse,
      ...(isDebug && { debugLogs }),
    });

  } catch (err: any) {
    return sendErrorResponse(res, HttpStatus.InternalServerError, `${ErrorMessage.ServerError}: ${err.message}`, debugLogs, isDebug);
  }
}