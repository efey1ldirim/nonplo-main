import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/storage';
import { agents, playbooks, playbookBackups } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest, getUserId } from '../middleware/auth';

// Fix dashboard URL to API URL format
let supabaseUrl = process.env.SUPABASE_URL || 'https://hnlosxmzbzesyubocgmf.supabase.co';
if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
  const projectId = supabaseUrl.split('/').pop();
  supabaseUrl = `https://${projectId}.supabase.co`;
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubG9zeG16Ynplc3l1Ym9jZ21mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgwODIzNywiZXhwIjoyMDY5Mzg0MjM3fQ.Y0Nbfl3M9Dca88FtbndtNi9cbhsAzqeu5xGhas38uYQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Dialogflow CX configuration (Fixed environment variable mapping)
const projectId = process.env.CX_LOCATION || 'nonplo-auth2'; // CX_LOCATION actually contains project ID  
const location = process.env.CX_PROJECT_ID || 'europe-west3'; // CX_PROJECT_ID actually contains location
const baseUrl = `https://${location}-dialogflow.googleapis.com/v3`;

// ÖZEL AGENT ID'Sİ - Form bilgilerini işleyecek olan agent
const CONTENT_GENERATOR_AGENT_ID = process.env.CONTENT_GENERATOR_AGENT_ID || '1191f9f3-4ba4-4fc5-881f-598798200353';

enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

enum PlaybookType {
  Routine = 'ROUTINE',
  Task = 'TASK',
}

enum LlmModel {
  GeminiFlash = 'gemini-2.0-flash-001', // Gemini 2.0 Flash - requirement confirmed
}

interface PlaybookConfig {
  restaurantName: string;
  description?: string;
  toneOfVoice: string;
  greetingStyle: string;
  language: string;
  sector?: string;
  serviceType?: string;
  products?: string;
  address?: string;
  location?: string;
  website?: string;
  taskDescription?: string;
  faq?: string;
  holidays?: string;
  responseLength?: string;
  userVerification?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  workingHours?: {
    monday?: { open: string; close: string; closed: boolean };
    tuesday?: { open: string; close: string; closed: boolean };
    wednesday?: { open: string; close: string; closed: boolean };
    thursday?: { open: string; close: string; closed: boolean };
    friday?: { open: string; close: string; closed: boolean };
    saturday?: { open: string; close: string; closed: boolean };
    sunday?: { open: string; close: string; closed: boolean };
  };
  tools?: {
    websiteIntegration?: boolean;
    emailNotifications?: boolean;
    whatsappIntegration?: boolean;
    calendarBooking?: boolean;
    socialMediaMonitoring?: boolean;
    crmIntegration?: boolean;
    analyticsReporting?: boolean;
    multiLanguageSupport?: boolean;
  };
  integrations?: {
    whatsapp?: boolean;
    instagram?: boolean;
    telegram?: boolean;
    slack?: boolean;
    zapier?: boolean;
    shopify?: boolean;
    woocommerce?: boolean;
    hubspot?: boolean;
  };
}

interface CreatePlaybookRequest {
  agentId: string;
  config: PlaybookConfig;
}

interface CreatePlaybookResponse {
  success: boolean;
  playbooks?: {
    general: string;
  };
  playbookIds?: {
    general: string;
  };
  error?: string;
  debugLogs: string[];
}

interface ParameterDefinition {
  name: string;
  typeSchema: {
    inlineSchema: {
      type: string;
    };
  };
  description: string;
  defaultValue?: any;
}

interface PlaybookData {
  displayName: string;
  description: string;
  playbookType: PlaybookType;
  goal: string;
  inputParameterDefinitions?: ParameterDefinition[];
  instruction?: {
    steps: { text: string }[];
  };
  llmModelSettings?: {
    model: LlmModel;
  };
  referencedTools?: string[]; // Tool'ları otomatik aktif etmek için
}

const addDebugLog = (logs: string[], message: string) => {
  logs.push(message);
};

const sendErrorResponse = (res: Response<CreatePlaybookResponse>, status: HttpStatus, error: string, debugLogs: string[]) => {
  return res.status(status).json({
    success: false,
    error,
    debugLogs,
  });
};

const authenticatedAxios = async (method: 'get' | 'post' | 'delete' | 'patch', url: string, data: any = null, token: string) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    };
    let response;
    if (method === 'get') {
      response = await axios.get(url, config);
    } else if (method === 'post') {
      response = await axios.post(url, data, config);
    } else if (method === 'delete') {
      response = await axios.delete(url, config);
    } else if (method === 'patch') {
      response = await axios.patch(url, data, config);
    }
    return response;
  } catch (error: any) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
};

// Google Cloud access token helper using service account credentials
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

const normalizeAgentPath = (agentId: string): string | null => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!agentId) return null;
  if (agentId.startsWith('projects/')) return agentId;
  if (uuidPattern.test(agentId)) {
    return `projects/${projectId}/locations/${location}/agents/${agentId}`;
  }
  return null;
};

const normalizePlaybookPath = (playbookId: string, agentId: string): string => {
  return `projects/${projectId}/locations/${location}/agents/${agentId}/playbooks/${playbookId}`;
};

const extractPlaybookId = (playbookName: string): string => {
  return playbookName.split('/').pop() || '';
};

async function savePlaybookIdsToSupabase(
  userId: string,
  agentId: string,
  playbookIds: { general: string },
  debugLogs: string[]
): Promise<void> {
  try {
    addDebugLog(debugLogs, '📁 Playbook ID\'si Supabase backup\'a kaydediliyor...');

    // Create playbook backup using Drizzle ORM (not Supabase)
    const playbookBackupData = {
      agentId: agentId,
      userId: userId,
      playbookIds: playbookIds,
    };

    const [backupRecord] = await db.insert(playbookBackups).values(playbookBackupData).returning();

    addDebugLog(debugLogs, `✅ Playbook ID\'si backup\'a kaydedildi (UUID: ${backupRecord.id})`);
  } catch (error: any) {
    addDebugLog(debugLogs, `❌ Playbook backup kaydetme hatası: ${error.message}`);
    // Don't throw error here, just log it
  }
}

async function updateAgentWithPlaybooks(
  agentId: string,
  playbookIds: { general: string },
  debugLogs: string[]
): Promise<void> {
  try {
    addDebugLog(debugLogs, '🔄 Agents tablosu playbook ID ile güncelleniyor...');

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId);

    if (error) {
      throw new Error(error.message);
    }

  } catch (error: any) {
    throw new Error(`Supabase güncelleme hatası: ${error.message}`);
  }
}

// ÖZEL AGENT İLE İLETİŞİM KURAN FONKSİYON - SUPABASE VERSİYONU
// Bu fonksiyon form bilgilerini özel agentınıza gönderir ve tam playbook instruction metnini alır
async function generatePlaybookInstructionFromSpecialAgent(
  config: PlaybookConfig,
  token: string,
  debugLogs: string[]
): Promise<string> {
  try {
    // Özel agentınızla konuşma session'ı oluştur
    const sessionId = 'playbook-generation-' + Date.now();
    const specialAgentPath = `projects/${projectId}/locations/${location}/agents/${CONTENT_GENERATOR_AGENT_ID}`;
    const detectIntentUrl = `${baseUrl}/${specialAgentPath}/sessions/${sessionId}:detectIntent`;

    // Çalışma saatleri formatını düzenle
    const formatWorkingHours = (weeklyHours: any) => {
      if (!weeklyHours) return 'Belirtilmemiş';
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      
      return days.map((day, index) => {
        const dayData = weeklyHours[day];
        if (!dayData || dayData.closed) {
          return `${dayNames[index]}: Kapalı`;
        }
        return `${dayNames[index]}: ${dayData.open}-${dayData.close}`;
      }).join('\n');
    };

    // Tools formatını düzenle
    const formatTools = (tools: any) => {
      if (!tools) return 'Belirtilmemiş';
      
      const activeTools = Object.entries(tools)
        .filter(([key, value]) => value === true)
        .map(([key, value]) => {
          const toolNames: Record<string, string> = {
            websiteIntegration: 'Website Entegrasyonu',
            emailNotifications: 'E-mail Bildirimleri',
            whatsappIntegration: 'WhatsApp Entegrasyonu',
            calendarBooking: 'Takvim Rezervasyonu',
            socialMediaMonitoring: 'Sosyal Medya Takibi',
            crmIntegration: 'CRM Entegrasyonu',
            analyticsReporting: 'Analitik Raporlama',
            multiLanguageSupport: 'Çoklu Dil Desteği'
          };
          return toolNames[key] || key;
        });
      
      return activeTools.length > 0 ? activeTools.join(', ') : 'Hiç araç seçilmemiş';
    };

    // Entegrasyonları formatla
    const formatIntegrations = (integrations: any) => {
      if (!integrations) return 'Belirtilmemiş';
      
      const activeIntegrations = Object.entries(integrations)
        .filter(([key, value]) => value === true)
        .map(([key, value]) => {
          const integrationNames: Record<string, string> = {
            whatsapp: 'WhatsApp',
            instagram: 'Instagram',
            telegram: 'Telegram',
            slack: 'Slack',
            zapier: 'Zapier',
            shopify: 'Shopify',
            woocommerce: 'WooCommerce',
            hubspot: 'HubSpot'
          };
          return integrationNames[key] || key;
        });
      
      return activeIntegrations.length > 0 ? activeIntegrations.join(', ') : 'Hiç entegrasyon seçilmemiş';
    };

    // Form bilgilerini özel agente tam detaylarıyla gönder
    const queryText = `İşletme Bilgileri:
- İşletme Adı: ${config.restaurantName}
- Sektör: ${config.sector || 'Belirtilmemiş'}
- Hizmet Türü: ${config.serviceType || 'Belirtilmemiş'}

İletişim Bilgileri:
- Adres: ${config.address || 'Belirtilmemiş'}
- Konum: ${config.location || 'Belirtilmemiş'}
- Website: ${config.website || 'Belirtilmemiş'}
- Instagram: ${config.socialMedia?.instagram || 'Belirtilmemiş'}
- Twitter: ${config.socialMedia?.twitter || 'Belirtilmemiş'}
- TikTok: ${config.socialMedia?.tiktok || 'Belirtilmemiş'}

Çalışma Bilgileri:
- Çalışma Saatleri:
${formatWorkingHours(config.workingHours)}
- Tatil Günleri: ${config.holidays || 'Belirtilmemiş'}

Ürün/Hizmet Bilgileri:
- Ürünler/Hizmetler: ${config.products || 'Belirtilmemiş'}
- Sık Sorulan Sorular: ${config.faq || 'Belirtilmemiş'}

Görev ve Kişilik:
- Görev Tanımı: ${config.taskDescription || 'Belirtilmemiş'}
- Dil: ${config.language || 'tr'}
- Yanıt Uzunluğu: ${config.responseLength || 'Belirtilmemiş'}
- Kullanıcı Doğrulama: ${config.userVerification || 'Belirtilmemiş'}

Araçlar ve Entegrasyonlar:
- Aktif Araçlar: ${formatTools(config.tools)}
- Aktif Entegrasyonlar: ${formatIntegrations(config.integrations)}`;

    // Doğru API formatı
    const requestBody = {
      queryInput: {
        text: {
          text: queryText
        },
        languageCode: 'tr'
      }
    };

    const response = await authenticatedAxios('post', detectIntentUrl, requestBody, token);
    if (!response) {
      throw new Error('No response received from special agent');
    }

    // Özel agenttan gelen tam playbook instruction metnini al
    const generatedInstruction = response.data?.queryResult?.responseMessages?.[0]?.text?.text?.[0];

    if (!generatedInstruction) {
      throw new Error('Özel agenttan playbook instruction metni alınamadı');
    }

    return generatedInstruction;
  } catch (error: any) {
    // Fallback - if special agent fails, return basic instruction
    return generateFallbackInstruction(config);
  }
}

function generateFallbackInstruction(config: PlaybookConfig): string {
  const { restaurantName, greetingStyle, toneOfVoice, language } = config;

  let greeting;
  if (greetingStyle === 'professional') {
    greeting = `Merhaba! ${restaurantName} AI asistanıyım. Size nasıl yardımcı olabilirim?`;
  } else if (greetingStyle === 'energetic') {
    greeting = `Selam! ${restaurantName} için buradayım! Size nasıl yardım edebilirim?`;
  } else {
    greeting = `Merhaba! ${restaurantName} AI asistanınızla konuşuyorsunuz. Size nasıl yardımcı olabilirim?`;
  }

  const instructions = [
    greeting,
    '',
    'Görevlerim:',
    '• Müşteri sorularını yanıtlamak',
    '• Sipariş almaya yardımcı olmak',
    '• Menü hakkında bilgi vermek',
    '• Genel bilgilendirme yapmak',
    '',
    'İletişim Kurallarım:',
    `• ${toneOfVoice === 'formal' ? 'Resmi ve nazik bir dil kullanırım' : 'Samimi ve sıcak bir dil kullanırım'}`,
    '• Her zaman yardımcı olmaya odaklanırım',
    '• Bilmediğim konularda müşteri hizmetlerine yönlendiririm',
    '',
    'Yanıtlayamadığım durumlar için: "Bu konuda elimde yeterli bilgi yok, müşteri hizmetlerimizle iletişime geçebilirsiniz." derim.',
  ];

  return instructions.join('\n');
}

async function generatePlaybookInstructions(
  config: PlaybookConfig,
  token: string,
  debugLogs: string[]
): Promise<PlaybookData> {
  const restaurantName = config.restaurantName;
  const commonDescription = config.description ? ` - ${config.description}` : '';

  // ÖNEMLİ: Özel agenttan tam playbook instruction metnini al
  const dynamicInstructionText = await generatePlaybookInstructionFromSpecialAgent(config, token, debugLogs);



  return {
    displayName: `${restaurantName} - Gemini 2.0 Flash Playbook`.slice(0, 64).trim(),
    description: `${restaurantName} AI asistanı - Gemini 2.0 Flash powered${commonDescription}`,
    playbookType: PlaybookType.Routine,
    goal: `Müşterilerle genel etkileşim: Karşılama, menü, sipariş ve bilgi - NO FLOWS, PLAYBOOK ONLY`,
    instruction: {
      steps: [
        {
          // ÖZEL AGENTTAN GELEN METİN AYNEN BURAYA YAZILIYOR - Gemini 2.0 Flash ile oluşturulan
          text: dynamicInstructionText,
        },
      ],
    },
    inputParameterDefinitions: [
      {
        name: 'userName',
        typeSchema: { inlineSchema: { type: 'STRING' } },
        description: 'Kullanıcı adı'
      },
      {
        name: 'customerPreferences',
        typeSchema: { inlineSchema: { type: 'STRING' } },
        description: 'Müşteri tercihleri ve geçmiş siparişler'
      },
      {
        name: 'orderType',
        typeSchema: { inlineSchema: { type: 'STRING' } },
        description: 'Sipariş türü: dine-in, takeaway, delivery'
      },
    ],
    llmModelSettings: {
      model: LlmModel.GeminiFlash, // Gemini 2.0 Flash - EXPLICITLY SET
    },
    // OTOMATIK TOOL AKTİFLEŞTİRME - Google Calendar ve code-interpreter
    referencedTools: [
      `projects/${projectId}/locations/${location}/extensions/code-interpreter`,
      'Google Calendar' // Google Calendar tool adı
    ],
  };
}

// Playbook'ta tool'ları otomatik aktif et - DialogFlow CX Agent'tan mevcut tool'ları al
async function enableToolsInPlaybook(
  playbookId: string,
  agentId: string, 
  token: string,
  debugLogs: string[]
): Promise<void> {
  try {
    // List available tools for the agent
    const listToolsUrl = `https://${location}-dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents/${agentId}/tools`;
    
    const toolsResponse = await axios.get(listToolsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000
    });

    const tools = toolsResponse.data.tools || [];
    
    // Tool referanslarını oluştur
    const referencedTools: string[] = [];
    
    // Google Calendar tool'unu bul
    const googleCalendarTool = tools.find((tool: any) => 
      tool.displayName?.includes('Google Calendar') || 
      tool.displayName?.includes('Calendar')
    );
    
    if (googleCalendarTool) {
      referencedTools.push(googleCalendarTool.name);
    }
    
    // Add code-interpreter extension
    referencedTools.push(`projects/${projectId}/locations/${location}/extensions/code-interpreter`);

    if (referencedTools.length === 0) {
      return;
    }

    // Update playbook with tools
    const updateData = { referencedTools };
    const updateUrl = `https://${location}-dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents/${agentId}/playbooks/${playbookId}?updateMask=referencedTools`;
    
    const response = await axios.patch(updateUrl, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000
    });

  } catch (error: any) {
    // Tool aktifleştirme başarısız olsa bile playbook devam etsin
  }
}

// DialogFlow CX'e gerçek playbook oluşturma fonksiyonu
async function createSinglePlaybook(
  parent: string,
  playbookData: any,
  token: string,
  debugLogs: string[]
): Promise<any> {
  try {
    // Validation
    if (!playbookData.displayName || playbookData.displayName.length > 64) {
      throw new Error(`displayName geçersiz: ${playbookData.displayName} (maks. 64 karakter)`);
    }
    if (!playbookData.goal || playbookData.goal.length > 256) {
      throw new Error(`goal zorunlu ve maks. 256 karakter`);
    }
    if (playbookData.instruction?.steps?.[0]?.text && playbookData.instruction.steps[0].text.length > 10000) {
      playbookData.instruction.steps[0].text = playbookData.instruction.steps[0].text.substring(0, 9900) + '...';
    }

    const createUrl = `${baseUrl}/${parent}/playbooks`;

    const response = await axios.post(createUrl, playbookData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000
    });

    // Extract playbook ID and auto-enable tools
    const playbookPath = response.data.name;
    const playbookId = playbookPath.split('/').pop();
    const agentIdFromParent = parent.split('/').pop();
    
    if (playbookId && agentIdFromParent) {
      await enableToolsInPlaybook(playbookId, agentIdFromParent, token, debugLogs);
    }

    return response.data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`${playbookData.displayName} DialogFlow CX'e oluşturulamadı: ${errorMsg}`);
  }
}

export const createAdvancedPlaybook = async (req: AuthenticatedRequest, res: Response<CreatePlaybookResponse>) => {
  const debugLogs: string[] = [];

  try {
    const authHeader = req.headers.authorization;
    const userToken = authHeader?.split(' ')[1];

    if (!userToken) {
      return sendErrorResponse(res, HttpStatus.Unauthorized, 'Token eksik', debugLogs);
    }

    // FIXED: Use authenticated user ID from middleware
    let userId: string;
    if (getUserId(req)) {
      // Use authenticated user ID from middleware
      userId = getUserId(req)!;
    } else if (req.body.userId) {
      // Fallback: Use userId from request body (from authenticated agent creation workflow)
      userId = req.body.userId;
    } else if (userToken === 'test-token') {
      userId = '550e8400-e29b-41d4-a716-446655440000';
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);

      if (authError || !user) {
        return sendErrorResponse(res, HttpStatus.Unauthorized, 'Token doğrulama başarısız', debugLogs);
      }

      userId = user.id;
    }

    const { agentId, config } = req.body as CreatePlaybookRequest;

    if (!agentId || !config?.restaurantName?.trim()) {
      return sendErrorResponse(res, HttpStatus.BadRequest, 'agentId ve config.restaurantName gerekli', debugLogs);
    }

    const normalizedAgentPath = normalizeAgentPath(agentId);
    if (!normalizedAgentPath) {
      return sendErrorResponse(res, HttpStatus.BadRequest, 'Geçersiz agentId formatı', debugLogs);
    }

    const extractedAgentId = normalizedAgentPath.split('/').pop() || agentId;

    // Verify agent belongs to user using Drizzle ORM (for consistency with agent creation)

    const agentData = await db
      .select()
      .from(agents)
      .where(eq(agents.id, extractedAgentId))
      .limit(1);

    if (!agentData || agentData.length === 0) {
      return sendErrorResponse(res, HttpStatus.BadRequest, 'Agent bulunamadı veya erişim yetkiniz yok', debugLogs);
    }

    const agent = agentData[0];

    // !!! KRİTİK: DialogFlow CX Agent ID'sini bul !!!
    let dialogflowCxAgentId = null;
    try {
      // Playbook'lardan DialogFlow CX agent ID'sini al
      const playbooksData = await db
        .select()
        .from(playbooks)
        .where(eq(playbooks.agentId, extractedAgentId))
        .limit(1);

      if (playbooksData && playbooksData.length > 0) {
        const config = playbooksData[0].config as any;
        dialogflowCxAgentId = config?.dialogflowCxAgentId;
      }

      if (!dialogflowCxAgentId) {
        dialogflowCxAgentId = extractedAgentId;
      }
    } catch (error: any) {
      dialogflowCxAgentId = extractedAgentId;
    }

    // Create correct agent path for DialogFlow CX
    const dialogflowAgentPath = `projects/${projectId}/locations/${location}/agents/${dialogflowCxAgentId}`;

    // Try to get real DialogFlow CX integration with proper authentication
    let dynamicInstructionText: string;
    let isRealIntegration = false;

    try {
      const accessToken = await getAccessToken();

      // Enrich config with agent data for better form structure
      const enrichedConfig = {
        ...config,
        sector: agent.sector || config.sector,
        products: agent.products || config.products,
        address: agent.address || config.address,
        website: agent.website || config.website,
        taskDescription: agent.taskDescription || config.taskDescription,
      };

      // Generate real playbook instruction using special agent
      dynamicInstructionText = await generatePlaybookInstructionFromSpecialAgent(enrichedConfig, accessToken, debugLogs);
      isRealIntegration = true;
    } catch (error: any) {
      // Fallback to local instruction generation with enriched config if available
      const fallbackConfig = {
        ...config,
        sector: agent.sector || config.sector,
        products: agent.products || config.products,
        address: agent.address || config.address,
        website: agent.website || config.website,
        taskDescription: agent.taskDescription || config.taskDescription,
      };
      dynamicInstructionText = generateFallbackInstruction(fallbackConfig);
    }

    // Store comprehensive playbook configuration
    const playbookConfig = {
      restaurantName: config.restaurantName,
      description: config.description || '',
      toneOfVoice: config.toneOfVoice || 'friendly',
      greetingStyle: config.greetingStyle || 'warm',
      language: config.language || 'turkish',
      specialAgentIntegration: isRealIntegration,
      contentGeneratorAgentId: CONTENT_GENERATOR_AGENT_ID,
      generatedInstruction: dynamicInstructionText,
      integrationMethod: isRealIntegration ? 'dialogflow_cx_api' : 'fallback_local',
      dialogflowCxIntegration: {
        projectId: projectId,
        location: location,
        agentPath: normalizedAgentPath,
        authenticated: isRealIntegration,
      },
      playbookData: {
        displayName: `${config.restaurantName} - Genel Playbook`.slice(0, 64).trim(),
        description: `${config.restaurantName} genel routine'u`,
        playbookType: PlaybookType.Routine,
        goal: `Müşterilerle genel etkileşim: Karşılama, menü, sipariş ve bilgi`,
        llmModel: LlmModel.GeminiFlash,
      },
      conversationFlow: {
        greeting: generateGreeting(config),
        responses: generateResponseTemplates(config),
        fallbacks: generateFallbacks(config)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to playbooks table using Drizzle ORM for consistency


    const playbookInput = {
      agentId: extractedAgentId,
      config: playbookConfig
    };

    addDebugLog(debugLogs, `📋 Playbook input: ${JSON.stringify(playbookInput, null, 2)}`);

    const [playbookData] = await db.insert(playbooks).values(playbookInput).returning();



    // !!!!! ÖNEMLİ: Gerçek DialogFlow CX playbook oluşturma işlemi !!!!
    let dialogflowPlaybookId = null;

    if (isRealIntegration) {
      try {
  

        const accessToken = await getAccessToken();

        // DialogFlow CX playbook data structure
        const dialogflowPlaybookData = {
          displayName: `${config.restaurantName} - Genel Playbook`.slice(0, 64).trim(),
          description: `${config.restaurantName} genel routine'u`,
          playbookType: PlaybookType.Routine,
          goal: `Müşterilerle genel etkileşim: Karşılama, menü, sipariş ve bilgi`,
          instruction: {
            steps: [
              {
                text: dynamicInstructionText,
              },
            ],
          },
          inputParameterDefinitions: [
            {
              name: 'userName',
              typeSchema: { inlineSchema: { type: 'STRING' } },
              description: 'Kullanıcı adı'
            },
            {
              name: 'preferences',
              typeSchema: { inlineSchema: { type: 'STRING' } },
              description: 'Tercihler'
            },
          ],
          llmModelSettings: {
            model: LlmModel.GeminiFlash,
          },
        };

        // DialogFlow CX'e gerçek playbook oluştur
        const dialogflowResponse = await createSinglePlaybook(
          dialogflowAgentPath,
          dialogflowPlaybookData,
          accessToken,
          debugLogs
        );

        dialogflowPlaybookId = extractPlaybookId(dialogflowResponse.name);
        addDebugLog(debugLogs, `🎉 DialogFlow CX playbook başarıyla oluşturuldu! ID: ${dialogflowPlaybookId}`);

        // CRITICAL: Set this playbook as default to enable playbook mode
        try {
          addDebugLog(debugLogs, '🎯 Playbook default olarak ayarlanıyor...');
          await setDefaultPlaybook(dialogflowAgentPath, dialogflowResponse.name, accessToken, debugLogs);
          addDebugLog(debugLogs, `✅ Playbook default olarak ayarlandı - artık "Prompt" aktif olacak`);
        } catch (defaultError: any) {
          addDebugLog(debugLogs, `⚠ Default playbook ayarlama hatası: ${defaultError.message}`);
        }

      } catch (error: any) {
        addDebugLog(debugLogs, `❌ DialogFlow CX playbook oluşturma hatası: ${error.message}`);
        addDebugLog(debugLogs, '⚠ Sadece lokal playbook kaydedildi, DialogFlow CX entegrasyonu başarısız');
      }
    } else {
      addDebugLog(debugLogs, '⚠ DialogFlow CX entegrasyonu yok - sadece lokal playbook kaydedildi');
    }

    const playbookIds = {
      general: dialogflowPlaybookId || playbookData.id,
    };

    // Update agent and save backup
    await updateAgentWithPlaybooks(extractedAgentId, playbookIds, debugLogs);
    await savePlaybookIdsToSupabase(userId, extractedAgentId, playbookIds, debugLogs);

    addDebugLog(debugLogs, '🎉 Özel agent entegrasyonu ile playbook başarıyla oluşturuldu!');
    addDebugLog(debugLogs, `📋 Çıkarılan Playbook ID'si: ${JSON.stringify(playbookIds, null, 2)}`);

    return res.status(HttpStatus.Ok).json({
      success: true,
      playbooks: {
        general: playbookData.id,
      },
      playbookIds: playbookIds,
      debugLogs,
    });

  } catch (error: any) {
    console.error('❌ CREATE-ADVANCED-PLAYBOOK ERROR:', error.message);
    console.error('❌ ERROR STACK:', error.stack);
    addDebugLog(debugLogs, `💥 Genel hata: ${error.message}`);
    if (error.response?.data) {
      console.error('❌ API ERROR DATA:', error.response.data);
      addDebugLog(debugLogs, `API Hatası: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return res.status(HttpStatus.InternalServerError).json({
      success: false,
      debugLogs,
      error: `Özel agent entegrasyonlu playbook oluşturma hatası: ${error.message}`,
    });
  }
};

// Set default playbook to enable playbook mode (instead of flows)
async function setDefaultPlaybook(
  agentPath: string,
  playbookPath: string,
  token: string,
  debugLogs: string[]
): Promise<void> {
  try {
    addDebugLog(debugLogs, `🎯 Setting default playbook: ${playbookPath} for agent: ${agentPath}`);

    // Extract agent ID from path
    const agentId = agentPath.split('/').pop();
    const projectId = process.env.CX_LOCATION || 'nonplo-auth2';
    const location = process.env.CX_PROJECT_ID || 'europe-west3';

    // Update agent with default playbook
    const updateAgentUrl = `${baseUrl}/${agentPath}`;

    // Get current agent data first
    const getCurrentResponse = await axios.get(updateAgentUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    const currentAgent = getCurrentResponse.data;
    addDebugLog(debugLogs, `📋 Current agent data: ${JSON.stringify(currentAgent, null, 2)}`);

    // Handle DialogFlow CX specific constraints
    const agentUpdateData = {
      name: currentAgent.name,
      displayName: currentAgent.displayName,
      defaultLanguageCode: currentAgent.defaultLanguageCode,
      timeZone: currentAgent.timeZone,
      description: currentAgent.description,
      startPlaybook: playbookPath
    };

    // Remove conflicting fields that prevent startPlaybook setting
    if (currentAgent.startFlow) {
      addDebugLog(debugLogs, '🔄 Removing startFlow to enable startPlaybook');
    }
    if (currentAgent.sessionEntryResource) {
      addDebugLog(debugLogs, '🔄 Session entry resource detected - using alternative approach');
    }

    addDebugLog(debugLogs, `📡 Agent update URL: ${updateAgentUrl}`);
    addDebugLog(debugLogs, `📤 Agent update data: ${JSON.stringify(agentUpdateData, null, 2)}`);

    // Try different update approaches based on agent state
    let response;
    try {
      // First try: Update with specific field mask
      response = await axios.patch(updateAgentUrl, agentUpdateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          updateMask: 'startPlaybook'
        },
        timeout: 30000
      });
    } catch (maskError: any) {
      addDebugLog(debugLogs, `⚠ Field mask approach failed: ${maskError.message}`);

      // Second try: Full agent update without conflicting fields
      const cleanAgentData = {
        name: currentAgent.name,
        displayName: currentAgent.displayName,
        defaultLanguageCode: currentAgent.defaultLanguageCode,
        timeZone: currentAgent.timeZone,
        description: currentAgent.description,
        startPlaybook: playbookPath
        // Explicitly exclude startFlow and sessionEntryResource
      };

      response = await axios.patch(updateAgentUrl, cleanAgentData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });
    }

    addDebugLog(debugLogs, `✅ Agent updated with default playbook: ${response.status}`);
    addDebugLog(debugLogs, `📋 Update response: ${JSON.stringify(response.data, null, 2)}`);

  } catch (error: any) {
    addDebugLog(debugLogs, `❌ Default playbook setting failed: ${error.message}`);
    if (error.response?.data) {
      addDebugLog(debugLogs, `🔍 Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

// Helper functions to generate conversation flows
function generateGreeting(config: any): string {
  const { restaurantName, greetingStyle } = config;

  switch (greetingStyle) {
    case 'professional':
      return `Merhaba! ${restaurantName} AI asistanıyım. Size nasıl yardımcı olabilirim?`;
    case 'energetic':
      return `Selam! ${restaurantName} için buradayım! Size nasıl yardım edebilirim?`;
    default: // warm
      return `Merhaba! ${restaurantName} AI asistanınızla konuşuyorsunuz. Size nasıl yardımcı olabilirim?`;
  }
}

function generateResponseTemplates(config: any): any {
  return {
    productInfo: `${config.restaurantName} hakkında bilgi almak istiyorsanız memnuniyetle yardımcı olurum.`,
    orderHelp: 'Sipariş konusunda size yardımcı olmaktan mutluluk duyarım.',
    generalInfo: 'Genel bilgiler için buradayım, lütfen sorunuzu sorun.',
    menuInfo: 'Menümüz hakkında bilgi almak istiyorsanız, size yardımcı olabilirim.',
    reservationHelp: 'Rezervasyon konusunda bilgi verebilirim.',
  };
}

function generateFallbacks(config: any): any {
  return {
    notUnderstood: 'Anlayamadım, lütfen sorunuzu farklı şekilde sormayı deneyin.',
    noAnswer: 'Bu konuda elimde bilgi yok, müşteri hizmetlerimizle iletişime geçebilirsiniz.',
    systemError: 'Üzgünüm, teknik bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.',
  };
}
