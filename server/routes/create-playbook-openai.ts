import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../database/storage';
import { agents, playbooks, playbookBackups } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest, getUserId } from '../middleware/auth';
import { openaiService } from '../services/OpenAIService';

// Fix dashboard URL to API URL format
let supabaseUrl = process.env.SUPABASE_URL || 'https://hnlosxmzbzesyubocgmf.supabase.co';
if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
  const projectId = supabaseUrl.split('/').pop();
  supabaseUrl = `https://${projectId}.supabase.co`;
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubG9zeG16Ynplc3l1Ym9jZ21mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgwODIzNywiZXhwIjoyMDY5Mzg0MjM3fQ.Y0Nbfl3M9Dca88FtbndtNi9cbhsAzqeu5xGhas38uYQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log(`🤖 Playbook Creation using OpenAI instead of Dialogflow CX`);

enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  InternalServerError = 500,
}

interface PlaybookConfig {
  businessName: string;
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

const addDebugLog = (logs: string[], message: string) => {
  logs.push(message);
};

// Generate comprehensive OpenAI-powered playbook
async function generateOpenAIPlaybook(
  agentData: any,
  config: PlaybookConfig,
  debugLogs: string[]
): Promise<string> {
  try {
    addDebugLog(debugLogs, '🤖 Starting OpenAI playbook generation...');
    
    const prompt = buildComprehensivePlaybookPrompt(agentData, config);
    
    const response = await openaiService.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sen uzman bir AI asistan eğitmeni sistemsin. Verilen işletme bilgilerine göre kapsamlı, profesyonel ve kullanıcı dostu AI asistan talimatları oluşturursun. Türkçe yanıt ver ve en az 1000 kelimelik detaylı talimat hazırla."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const instructions = response.choices[0].message.content || '';
    addDebugLog(debugLogs, `✅ OpenAI playbook generated: ${instructions.length} characters`);
    
    return instructions;
  } catch (error: any) {
    addDebugLog(debugLogs, `❌ OpenAI playbook generation failed: ${error.message}`);
    throw new Error(`Playbook generation error: ${error.message}`);
  }
}

// Build comprehensive prompt for OpenAI playbook generation
function buildComprehensivePlaybookPrompt(agentData: any, config: PlaybookConfig): string {
  const workingHours = formatWorkingHours(config.workingHours);
  const tools = formatTools(config.tools);
  const integrations = formatIntegrations(config.integrations);
  const socialMedia = formatSocialMedia(config.socialMedia);

  return `
İşletme Bilgileri:
- İşletme Adı: ${config.businessName}
- Açıklama: ${config.description || 'Belirtilmemiş'}
- Sektör: ${config.sector || 'Belirtilmemiş'}
- Hizmet Türü: ${config.serviceType || 'Belirtilmemiş'}
- Lokasyon: ${config.location || 'Belirtilmemiş'}
- Adres: ${config.address || 'Belirtilmemiş'}
- Website: ${config.website || 'Yok'}
- Görev Tanımı: ${config.taskDescription || 'Belirtilmemiş'}
- Ürünler/Hizmetler: ${config.products || 'Belirtilmemiş'}

Çalışma Detayları:
${workingHours}

Tatiller: ${config.holidays || 'Belirtilmemiş'}

SSS: ${config.faq || 'Belirtilmemiş'}

Kişilik ve Tarz:
- Konuşma Tarzı: ${config.toneOfVoice}
- Karşılama Stili: ${config.greetingStyle}
- Dil: ${config.language}
- Yanıt Uzunluğu: ${config.responseLength || 'Orta'}
- Kullanıcı Doğrulama: ${config.userVerification || 'Standart'}

Aktif Araçlar: ${tools}
Aktif Entegrasyonlar: ${integrations}
Sosyal Medya: ${socialMedia}

Bu işletme için kapsamlı bir AI asistan talimatı oluştur. Asistan:

1. GENEL DAVRANIŞLAR:
   - Müşteri sorularına profesyonel ve dostane şekilde yanıt versin
   - İşletme hakkında doğru ve güncel bilgi paylaşsın
   - Türkçe konuşsun ve nazik bir dil kullansın
   - Müşteri memnuniyetini öncelikli tutsun

2. İŞLETME BİLGİLERİ:
   - Çalışma saatlerini kontrol etsin ve müşterileri bilgilendirsin
   - Ürün/hizmet bilgilerini detaylı şekilde açıklayabilsin
   - Fiyat ve kampanya sorularına yönlendirme yapabilsin
   - Lokasyon ve ulaşım bilgilerini verebilsin

3. RANDEVU VE İLETİŞİM:
   - Randevu talepleri için uygun zaman dilimlerini önersin
   - İletişim bilgilerini doğru şekilde paylaşsın
   - Acil durumlar için alternatif iletişim yolları önersin

4. PROBLEM ÇÖZME:
   - Müşteri şikayetlerini anlayışla karşılasın
   - Çözüm önerileri sunsun
   - Gerektiğinde yetkili kişilere yönlendirme yapsın

5. SATIŞ DESTEGI:
   - Müşteri ihtiyaçlarını anlayıp uygun ürün/hizmet önersin
   - Cross-selling ve up-selling fırsatlarını değerlendirsin
   - Satış sürecinde müşteriyi bilgilendirsin

Bu talimatları kullanarak, müşterilerle etkili ve verimli iletişim kurabilen, işletmenin değerlerini yansıtan ve müşteri deneyimini geliştiren bir AI asistan ol.

En az 1000 kelimelik detaylı talimat hazırla.
`;
}

// Helper functions for formatting
function formatWorkingHours(weeklyHours: any): string {
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
}

function formatTools(tools: any): string {
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
}

function formatIntegrations(integrations: any): string {
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
}

function formatSocialMedia(socialMedia: any): string {
  if (!socialMedia) return 'Belirtilmemiş';
  
  const platforms = [];
  if (socialMedia.instagram) platforms.push(`Instagram: @${socialMedia.instagram}`);
  if (socialMedia.twitter) platforms.push(`Twitter: @${socialMedia.twitter}`);
  if (socialMedia.tiktok) platforms.push(`TikTok: @${socialMedia.tiktok}`);
  
  return platforms.length > 0 ? platforms.join(', ') : 'Sosyal medya hesabı yok';
}

export const createAdvancedPlaybook = async (req: AuthenticatedRequest, res: Response<CreatePlaybookResponse>) => {
  const debugLogs: string[] = [];

  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(HttpStatus.Unauthorized).json({
        success: false,
        error: 'Token doğrulama başarısız',
        debugLogs,
      });
    }

    const { agentId, config } = req.body as CreatePlaybookRequest;
    
    if (!agentId || !config) {
      return res.status(HttpStatus.BadRequest).json({
        success: false,
        error: 'Agent ID ve config gerekli',
        debugLogs,
      });
    }

    addDebugLog(debugLogs, `🚀 Starting OpenAI playbook creation for agent: ${agentId}`);

    // Get agent data from database
    const [agentData] = await db.select().from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
      .limit(1);

    if (!agentData) {
      return res.status(HttpStatus.BadRequest).json({
        success: false,
        error: 'Agent bulunamadı',
        debugLogs,
      });
    }

    addDebugLog(debugLogs, `✅ Agent found: ${agentData.name}`);

    // Generate OpenAI-powered playbook
    let playbookInstructions = '';
    try {
      playbookInstructions = await generateOpenAIPlaybook(agentData, config, debugLogs);
      addDebugLog(debugLogs, '✅ OpenAI playbook generated successfully');
    } catch (playbookError: any) {
      addDebugLog(debugLogs, `❌ OpenAI playbook generation failed: ${playbookError.message}`);
      return res.status(HttpStatus.InternalServerError).json({
        success: false,
        error: `Playbook oluşturulamadı: ${playbookError.message}`,
        debugLogs,
      });
    }

    // Update agent with new OpenAI instructions
    try {
      await db.update(agents).set({
        openaiInstructions: playbookInstructions,
        updatedAt: new Date()
      }).where(eq(agents.id, agentId));

      addDebugLog(debugLogs, '✅ Agent updated with new OpenAI instructions');
    } catch (updateError: any) {
      addDebugLog(debugLogs, `❌ Failed to update agent: ${updateError.message}`);
    }

    // Create or update playbook in database
    try {
      // Check if playbook already exists
      const [existingPlaybook] = await db.select().from(playbooks)
        .where(eq(playbooks.agentId, agentId))
        .limit(1);

      const playbookConfig = {
        ...config,
        openaiInstructions: playbookInstructions,
        openaiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        status: 'active'
      };

      if (existingPlaybook) {
        // Update existing playbook
        await db.update(playbooks).set({
          config: playbookConfig
        }).where(eq(playbooks.agentId, agentId));
        
        addDebugLog(debugLogs, '✅ Existing playbook updated');
      } else {
        // Create new playbook
        await db.insert(playbooks).values({
          agentId: agentId,
          config: playbookConfig
        });
        
        addDebugLog(debugLogs, '✅ New playbook created');
      }
    } catch (dbError: any) {
      addDebugLog(debugLogs, `⚠ Playbook database operation failed: ${dbError.message}`);
    }

    // Create backup for recovery
    try {
      await db.insert(playbookBackups).values({
        agentId: agentId,
        userId: userId,
        playbookIds: { general: agentId } // Using agentId as playbook reference
      });
      
      addDebugLog(debugLogs, '✅ Playbook backup created');
    } catch (backupError: any) {
      addDebugLog(debugLogs, `⚠ Backup creation failed: ${backupError.message}`);
    }

    return res.status(HttpStatus.Ok).json({
      success: true,
      playbooks: {
        general: playbookInstructions
      },
      playbookIds: {
        general: agentId
      },
      debugLogs,
    });

  } catch (error: any) {
    console.error("OpenAI Playbook creation error:", error);
    addDebugLog(debugLogs, `❌ Fatal error: ${error.message}`);
    
    return res.status(HttpStatus.InternalServerError).json({
      success: false,
      error: error.message || 'Playbook oluşturulurken hata oluştu',
      debugLogs,
    });
  }
};