import OpenAI from "openai";
import { Agent, AgentWizardData } from "../../shared/schema";
import { ErrorHandler } from "../utils/errorHandler";
import { cacheManager } from "../performance/cacheManager";
import crypto from "crypto";

const OPENAI_MODEL = "gpt-4o-mini";
const PLAYBOOK_MODEL = "gpt-4o-mini";
const CHAT_MODEL = "gpt-4o-mini";

// AI Analytics tracking
interface AIUsageMetric {
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
  type: 'playbook' | 'chat' | 'custom';
  cached: boolean;
}

class AIAnalytics {
  private metrics: AIUsageMetric[] = [];
  
  trackUsage(metric: AIUsageMetric) {
    this.metrics.push(metric);
    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }
  
  getUsageStats(hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    return {
      totalRequests: recentMetrics.length,
      totalTokens: recentMetrics.reduce((sum, m) => sum + m.tokens, 0),
      totalCost: recentMetrics.reduce((sum, m) => sum + m.cost, 0),
      cacheHitRate: recentMetrics.length > 0 ? 
        Math.round((recentMetrics.filter(m => m.cached).length / recentMetrics.length) * 100) : 0,
      byModel: recentMetrics.reduce((acc, m) => {
        if (!acc[m.model]) acc[m.model] = { requests: 0, tokens: 0, cost: 0 };
        acc[m.model].requests++;
        acc[m.model].tokens += m.tokens;
        acc[m.model].cost += m.cost;
        return acc;
      }, {} as Record<string, {requests: number, tokens: number, cost: number}>)
    };
  }
}

const aiAnalytics = new AIAnalytics();

export class OpenAIService {
  public openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  /**
   * Generate agent instructions (playbook) based on agent data
   */
  async generateAgentPlaybook(agentData: Agent, wizardData?: AgentWizardData): Promise<string> {
    try {
      const prompt = this.buildPlaybookPrompt(agentData, wizardData);
      const promptHash = crypto.createHash('md5').update(prompt).digest('hex');
      
      // Check cache first
      const cached = cacheManager.getCachedAIResponse(promptHash, PLAYBOOK_MODEL);
      if (cached) {
        console.log(`🧠 Cache hit for playbook generation`);
        aiAnalytics.trackUsage({
          model: PLAYBOOK_MODEL,
          tokens: 0, // Cached response
          cost: 0,
          timestamp: new Date(),
          type: 'playbook',
          cached: true
        });
        return cached;
      }

      const response = await this.openai.chat.completions.create({
        model: PLAYBOOK_MODEL,
        messages: [
          {
            role: "system",
            content: "Sen Türkiye'deki işletmeler için AI asistan talimatları oluşturan uzman bir sistemsin. Verilen işletme bilgilerine göre ayrıntılı, profesyonel ve kullanıcı dostu asistan talimatları oluştur. Türkçe yanıt ver."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const result = response.choices[0].message.content || "";
      const tokens = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens, PLAYBOOK_MODEL);
      
      // Cache the result
      cacheManager.cacheAIResponse(promptHash, result, PLAYBOOK_MODEL, 60 * 60 * 1000); // 1 hour cache
      
      // Track analytics
      aiAnalytics.trackUsage({
        model: PLAYBOOK_MODEL,
        tokens,
        cost,
        timestamp: new Date(),
        type: 'playbook',
        cached: false
      });
      
      console.log(`🧠 Generated playbook: ${tokens} tokens, $${cost.toFixed(4)}`);
      return result;
    } catch (error: any) {
      console.error("OpenAI playbook generation error:", error);
      const customError = ErrorHandler.classifyError(error);
      throw new Error(customError.userMessage);
    }
  }

  /**
   * Handle chat with agent using OpenAI
   */
  async chatWithAgent(
    agentInstructions: string,
    userMessage: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
    conversationId?: string
  ): Promise<string> {
    try {
      const messageHash = crypto.createHash('md5').update(userMessage + agentInstructions).digest('hex');
      
      // Check cache for similar conversations (optional for chat)
      if (conversationId) {
        const cached = cacheManager.getCachedAIChatResponse(conversationId, messageHash);
        if (cached) {
          console.log(`🧠 Cache hit for chat response`);
          aiAnalytics.trackUsage({
            model: CHAT_MODEL,
            tokens: 0,
            cost: 0,
            timestamp: new Date(),
            type: 'chat',
            cached: true
          });
          return cached;
        }
      }

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: agentInstructions
        },
        ...conversationHistory,
        {
          role: "user", 
          content: userMessage
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 1000
      });

      const result = response.choices[0].message.content || "Üzgünüm, şu anda yanıt veremiyorum.";
      const tokens = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens, CHAT_MODEL);
      
      // Cache chat response (shorter TTL)
      if (conversationId) {
        cacheManager.cacheAIChatResponse(conversationId, messageHash, result, 5 * 60 * 1000); // 5 minutes
      }
      
      // Track analytics
      aiAnalytics.trackUsage({
        model: CHAT_MODEL,
        tokens,
        cost,
        timestamp: new Date(),
        type: 'chat',
        cached: false
      });
      
      console.log(`🧠 Chat response: ${tokens} tokens, $${cost.toFixed(4)}`);
      return result;
    } catch (error: any) {
      console.error("OpenAI chat error:", error);
      const customError = ErrorHandler.classifyError(error);
      throw new Error(customError.userMessage);
    }
  }

  /**
   * Generate agent configuration based on wizard data
   */
  async generateAgentConfig(wizardData: AgentWizardData): Promise<{
    name: string;
    role: string;
    description: string;
    instructions: string;
  }> {
    try {
      const prompt = `
Aşağıdaki işletme bilgilerine göre bir AI asistan konfigürasyonu oluştur:

İşletme Bilgileri:
- Sektör: ${wizardData.sector}
- İşletme Adı: ${wizardData.businessName}
- Lokasyon: ${wizardData.location || 'Belirtilmemiş'}
- Adres: ${wizardData.address}
- Hizmet Türü: ${wizardData.serviceType}
- Görev Tanımı: ${wizardData.taskDescription}
- Ürünler/Hizmetler: ${wizardData.products}
- Website: ${wizardData.website || 'Yok'}

Çalışma Saatleri:
${this.formatWorkingHours(wizardData.weeklyHours)}

Sosyal Medya:
- Instagram: ${wizardData.instagramUsername || 'Yok'}
- Twitter: ${wizardData.twitterUsername || 'Yok'}
- TikTok: ${wizardData.tiktokUsername || 'Yok'}

Kişilik:
- Konuşma Tarzı: ${wizardData.tone}
- Yanıt Uzunluğu: ${wizardData.responseLength}
- Kullanıcı Doğrulama: ${wizardData.userVerification}

SSS: ${wizardData.faq}

JSON formatında şu bilgileri döndür:
{
  "name": "Asistan adı",
  "role": "Asistan rolü",
  "description": "Kısa açıklama",
  "instructions": "Detaylı asistan talimatları"
}
`;

      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "Sen AI asistan konfigürasyonları oluşturan uzman bir sistemsin. JSON formatında yanıt ver."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const config = JSON.parse(response.choices[0].message.content || "{}");
      return {
        name: config.name || `${wizardData.businessName} Asistanı`,
        role: config.role || "Müşteri Hizmetleri Asistanı",
        description: config.description || `${wizardData.businessName} için AI asistan`,
        instructions: config.instructions || "Müşterilere yardımcı olan profesyonel bir asistanım."
      };
    } catch (error: any) {
      console.error("OpenAI agent config generation error:", error);
      throw new Error(`Agent konfigürasyonu oluşturulurken hata: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for playbook generation
   */
  private buildPlaybookPrompt(agentData: Agent, wizardData?: AgentWizardData): string {
    const workingHours = wizardData?.weeklyHours ? this.formatWorkingHours(wizardData.weeklyHours) : 'Belirtilmemiş';
    const tools = this.formatTools(agentData.tools);
    const integrations = this.formatIntegrations(agentData.integrations);

    return `
İşletme Bilgileri:
- İşletme Adı: ${agentData.business_name || agentData.name}
- Sektör: ${agentData.sector || 'Belirtilmemiş'}
- Lokasyon: ${agentData.location || 'Belirtilmemiş'}
- Adres: ${agentData.address || 'Belirtilmemiş'}
- Website: ${agentData.website || 'Yok'}
- Hizmet Türü: ${agentData.serviceType || 'Belirtilmemiş'}
- Görev Tanımı: ${agentData.taskDescription || 'Belirtilmemiş'}
- Hizmet Açıklaması: ${agentData.serviceDescription || 'Belirtilmemiş'}
- Ürünler/Hizmetler: ${agentData.products || 'Belirtilmemiş'}

Çalışma Saatleri:
${workingHours}

Tatiller: ${agentData.holidays || 'Belirtilmemiş'}

SSS: ${agentData.faq || 'Belirtilmemiş'}

Aktif Araçlar: ${tools}
Aktif Entegrasyonlar: ${integrations}

Sosyal Medya:
${JSON.stringify(agentData.socialMedia, null, 2)}

Bu işletme için kapsamlı bir AI asistan talimatı oluştur. Asistan:
1. Müşteri sorularına profesyonel şekilde yanıt versin
2. İşletme hakkında doğru bilgi versin  
3. Çalışma saatlerini kontrol etsin
4. Randevu talepleri için yönlendirme yapsin
5. Ürün/hizmet bilgilerini paylaşsın
6. Dostane ve yardımsever olsun
7. Türkçe konuşsun
${agentData.tools?.webSearch || agentData.tools?.web_search ? `8. Web Arama Özelliği: Güncel bilgiler, fiyatlar, haberler veya genel bilgiler gerektiğinde web'de arama yapabilir. Bu özelliği şu durumlarda kullan:
   - Güncel fiyat bilgileri sorulduğunda
   - Son dakika haberleri istendiğinde  
   - Genel bilgiler veya açıklamalar gerektiğinde
   - Rakip analizi yapılırken
   - Ürün karşılaştırmaları için` : ''}

En az 500 kelimelik ayrıntılı talimat oluştur.
`;
  }

  /**
   * Format working hours for display
   */
  private formatWorkingHours(weeklyHours: any): string {
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

  /**
   * Format tools for display
   */
  private formatTools(tools: any): string {
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
          multiLanguageSupport: 'Çoklu Dil Desteği',
          webSearch: 'Web Arama',
          web_search: 'Web Arama' // Support both naming conventions
        };
        return toolNames[key] || key;
      });
    
    return activeTools.length > 0 ? activeTools.join(', ') : 'Hiç araç seçilmemiş';
  }

  /**
   * Format integrations for display
   */
  private formatIntegrations(integrations: any): string {
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

  /**
   * Calculate cost based on tokens and model
   */
  private calculateCost(tokens: number, model: string): number {
    // OpenAI pricing (approximate, as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // per 1K tokens
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4': { input: 0.03, output: 0.06 }
    };\n    
    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];\n    // Assuming roughly 50/50 input/output ratio\n    return (tokens / 1000) * ((modelPricing.input + modelPricing.output) / 2);\n  }\n\n  /**\n   * Get AI usage analytics\n   */\n  getUsageAnalytics(hours: number = 24) {\n    return aiAnalytics.getUsageStats(hours);\n  }\n\n  /**\n   * Validate OpenAI API key\n   */\n  async validateApiKey(): Promise<boolean> {\n    try {\n      await this.openai.models.list();\n      return true;\n    } catch (error) {\n      return false;\n    }\n  }
}

// Create singleton instance
export const openaiService = new OpenAIService();