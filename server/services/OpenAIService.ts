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
    const workingHours = agentData.workingHours ? this.formatWorkingHours(agentData.workingHours) : 'Belirtilmemiş';
    const tools = this.formatTools(agentData.tools);
    const integrations = this.formatIntegrations(agentData.integrations);
    const holidays = this.formatHolidays(agentData.holidays);
    const socialMedia = this.formatSocialMedia(agentData.socialMedia);

    return `
İşletme Bilgileri:
- İşletme Adı: ${agentData.business_name || agentData.name}
- Sektör: ${agentData.sector || 'Belirtilmemiş'}
- Lokasyon: ${agentData.location || 'Belirtilmemiş'}
- Adres: ${agentData.address || 'Belirtilmemiş'}
- Website: ${agentData.website || 'Yok'}
- Hizmet Türü: ${agentData.serviceType || 'Belirtilmemiş'}
- Görev Tanımı: ${agentData.taskDescription || 'Belirtilmemiş'}
- Hizmet Açıklaması: ${agentData.description || 'Belirtilmemiş'}
- Ürünler/Hizmetler: ${agentData.products || 'Belirtilmemiş'}

Çalışma Saatleri:
${workingHours}

Tatiller: ${holidays}

SSS: ${agentData.faq || 'Belirtilmemiş'}

Aktif Araçlar: ${tools}
Aktif Entegrasyonlar: ${integrations}

Sosyal Medya:
${socialMedia}

Bu işletme için kapsamlı bir AI asistan talimatı oluştur. Asistan:
1. Müşteri sorularına profesyonel şekilde yanıt versin
2. İşletme hakkında doğru bilgi versin  
3. Çalışma saatlerini kontrol etsin
4. Randevu talepleri için yönlendirme yapsin
5. Ürün/hizmet bilgilerini paylaşsın
6. Dostane ve yardımsever olsun
7. Türkçe konuşsun
${(agentData.tools && (agentData.tools as any).webSearchEnabled) ? `8. Web Arama Özelliği: Güncel bilgiler, fiyatlar, haberler veya genel bilgiler gerektiğinde web'de arama yapabilir. Bu özelliği şu durumlarda kullan:
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
   * Format holidays for display
   */
  private formatHolidays(holidays: any): string {
    if (!holidays) return 'Belirtilmemiş';
    
    // If it's already a string, return it
    if (typeof holidays === 'string') return holidays;
    
    // If it's an object, format it nicely
    if (typeof holidays === 'object') {
      const parts: string[] = [];
      
      if (holidays.national?.enabled) {
        parts.push('Resmi tatiller kapalı');
      }
      if (holidays.religious?.enabled) {
        parts.push('Dini bayramlar kapalı');
      }
      if (holidays.custom && Array.isArray(holidays.custom) && holidays.custom.length > 0) {
        const customDates = holidays.custom.map((h: any) => h.date || h.name).join(', ');
        parts.push(`Özel tatiller: ${customDates}`);
      }
      
      return parts.length > 0 ? parts.join(', ') : 'Belirtilmemiş';
    }
    
    return 'Belirtilmemiş';
  }

  /**
   * Format social media for display
   */
  private formatSocialMedia(socialMedia: any): string {
    if (!socialMedia || typeof socialMedia !== 'object') return 'Yok';
    
    const platforms = Object.entries(socialMedia)
      .filter(([key, value]) => value && typeof value === 'string' && value.trim() !== '')
      .map(([key, value]) => {
        const platformNames: Record<string, string> = {
          instagram: 'Instagram',
          facebook: 'Facebook',
          twitter: 'Twitter',
          tiktok: 'TikTok',
          youtube: 'YouTube',
          linkedin: 'LinkedIn'
        };
        return `${platformNames[key] || key}: ${value}`;
      });
    
    return platforms.length > 0 ? platforms.join('\n') : 'Yok';
  }

  /**
   * Delete an OpenAI Assistant
   */
  async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting OpenAI Assistant: ${assistantId}`);
      
      // Delete the assistant from OpenAI
      await this.openai.beta.assistants.delete(assistantId);
      
      console.log(`✅ Successfully deleted OpenAI Assistant: ${assistantId}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error deleting OpenAI Assistant ${assistantId}:`, error);
      
      // If assistant doesn't exist, consider it "successfully deleted"
      if (error.status === 404 || error.code === 'not_found') {
        console.log(`🤷 Assistant ${assistantId} not found, considering as deleted`);
        return true;
      }
      
      // For other errors, log but don't fail the agent deletion
      console.error(`⚠️  Warning: Could not delete OpenAI Assistant ${assistantId}, but continuing with agent deletion`);
      return false;
    }
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
    };
    
    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    // Assuming roughly 50/50 input/output ratio
    return (tokens / 1000) * ((modelPricing.input + modelPricing.output) / 2);
  }

  /**
   * Upload yasaklikelimeler.txt file to OpenAI for file search
   */
  async uploadProfanityFilter(): Promise<string | null> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'yasaklikelimeler.txt');
      
      if (!fs.existsSync(filePath)) {
        console.warn('yasaklikelimeler.txt not found, skipping upload');
        return null;
      }
      
      // Use createReadStream with filename for better upload
      const file = await this.openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'assistants'
      });
      
      console.log(`🛡️ Yasaklı kelimeler dosyası yüklendi - File ID: ${file.id}`);
      return file.id;
    } catch (error: any) {
      console.error('Yasaklı kelimeler dosyası yüklenirken hata:', error.message);
      return null;
    }
  }

  /**
   * Create OpenAI Assistant for existing agent
   */
  async createAssistantForAgent(agentData: Agent): Promise<string | null> {
    try {
      console.log(`🤖 Creating OpenAI Assistant for agent: ${agentData.name}`);
      
      // Generate instructions using modular approach
      const instructions = this.buildCompleteInstructions(agentData);
      
      // Upload profanity filter file
      const profanityFileId = await this.uploadProfanityFilter();
      
      if (!profanityFileId) {
        console.error('❌ Failed to upload profanity filter, cannot create assistant');
        return null;
      }

      // Define tools for the assistant
      const tools: any[] = [
        { type: "file_search" }
      ];

      // Create vector store for profanity filtering
      let vectorStore;
      try {
        // Debug OpenAI beta API availability
        console.log(`🔧 Debug: this.openai.beta exists:`, !!this.openai.beta);
        console.log(`🔧 Debug: this.openai.beta.vectorStores exists:`, !!(this.openai.beta as any)?.vectorStores);
        console.log(`🔧 Debug: this.openai.beta.vectorStores.create exists:`, !!(this.openai.beta as any)?.vectorStores?.create);
        
        if (!(this.openai.beta as any)?.vectorStores?.create) {
          throw new Error('OpenAI beta vectorStores API not available');
        }
        
        vectorStore = await (this.openai.beta as any).vectorStores.create({
          name: `banned-words-${agentData.name}`,
          file_ids: [profanityFileId]
        });
        console.log(`✅ Vector store created: ${vectorStore.id}`);
      } catch (vectorError: any) {
        console.error(`❌ Vector store creation failed: ${vectorError.message}`);
        console.error(`❌ Vector store error stack:`, vectorError.stack);
        vectorStore = { id: 'fallback-no-vector-store' };
      }

      const temperature = agentData.temperature ? parseFloat(agentData.temperature) : 0.8;

      // Assistant creation parameters
      const assistantParams: any = {
        name: agentData.name,
        instructions: instructions,
        model: agentData.openaiModel || "gpt-4o-mini",
        tools: tools,
        temperature: temperature
      };

      // Add vector store if created successfully
      if (vectorStore.id !== 'fallback-no-vector-store') {
        assistantParams.tool_resources = {
          file_search: {
            vector_store_ids: [vectorStore.id]
          }
        };
      }

      // Create the assistant
      const assistant = await this.openai.beta.assistants.create(assistantParams);
      
      console.log(`✅ OpenAI Assistant created successfully: ${assistant.id}`);
      
      // Track analytics
      aiAnalytics.trackUsage({
        model: OPENAI_MODEL,
        tokens: 0, // Assistant creation doesn't return token usage
        cost: 0,
        timestamp: new Date(),
        type: 'custom',
        cached: false
      });

      return assistant.id;
    } catch (error: any) {
      console.error(`❌ Failed to create OpenAI Assistant for ${agentData.name}:`, error);
      const customError = ErrorHandler.classifyError(error);
      throw new Error(customError.userMessage);
    }
  }

  /**
   * Get AI usage analytics
   */
  getUsageAnalytics(hours: number = 24) {
    return aiAnalytics.getUsageStats(hours);
  }

  /**
   * Build core business info section of instructions
   */
  private buildCoreInfoSection(agentData: Agent): string {
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

Sosyal Medya:
${JSON.stringify(agentData.socialMedia, null, 2)}
`;
  }

  /**
   * Build personality section of instructions
   */
  private buildPersonalitySection(agentData: Agent): string {
    const personality = agentData.personality as any || {};
    return `
Kişilik ve İletişim Tarzı:
- Ton: ${personality.tone || 'Profesyonel ve dostane'}
- Formallik: ${personality.formality || 'Orta seviye'}
- Yaratıcılık: ${personality.creativity || 'Dengeli'}
- Yanıt Uzunluğu: ${personality.responseLength || 'Orta'}
- Emoji Kullanımı: ${personality.emojiUsage ? 'Evet' : 'Hayır'}
${personality.customInstructions ? `- Özel Talimatlar: ${personality.customInstructions}` : ''}
`;
  }

  /**
   * Build working hours section of instructions
   */
  private buildWorkingHoursSection(agentData: Agent): string {
    const workingHours = agentData.workingHours || {};
    return `
Çalışma Saatleri:
${this.formatWorkingHours(workingHours)}

Tatiller: ${agentData.holidays || 'Belirtilmemiş'}
`;
  }

  /**
   * Build tools configuration section of instructions
   */
  private buildToolsSection(agentData: Agent): string {
    const tools = this.formatTools(agentData.tools);
    const integrations = this.formatIntegrations(agentData.integrations);
    const webSearchEnabled = (agentData.tools as any)?.webSearchEnabled || (agentData.tools as any)?.web_search;
    
    return `
Aktif Araçlar: ${tools}
Aktif Entegrasyonlar: ${integrations}
${webSearchEnabled ? `
Web Arama Özelliği: Güncel bilgiler, fiyatlar, haberler veya genel bilgiler gerektiğinde web'de arama yapabilir. Bu özelliği şu durumlarda kullan:
- Güncel fiyat bilgileri sorulduğunda
- Son dakika haberleri istendiğinde  
- Genel bilgiler veya açıklamalar gerektiğinde
- Rakip analizi yapılırken
- Ürün karşılaştırmaları için` : ''}
`;
  }

  /**
   * Build FAQ and products section of instructions
   */
  private buildFAQSection(agentData: Agent): string {
    return `
Ürünler/Hizmetler: ${agentData.products || 'Belirtilmemiş'}

SSS (Sıkça Sorulan Sorular): ${agentData.faq || 'Belirtilmemiş'}
`;
  }

  /**
   * Build security protocol section of instructions
   */
  private buildSecuritySection(): string {
    return `

🚨 ZORUNLU GÜVENLİK PROTOKOLÜ:
1. HER kullanıcı mesajı geldiğinde ÖNCE yasaklı kelimeler dosyasında file search yap
2. Bu kontrolü yapmadan ASLA yanıt verme
3. Yasaklı kelime tespit edilirse: "Mesajınızda uygunsuz içerik tespit edildi. Lütfen nezaket kurallarına uygun bir şekilde yazınız."
4. Sadece temizse normal yanıt ver`;
  }

  /**
   * Build complete instructions from all sections
   */
  private buildCompleteInstructions(agentData: Agent): string {
    return `${this.buildCoreInfoSection(agentData)}
${this.buildPersonalitySection(agentData)}
${this.buildWorkingHoursSection(agentData)}
${this.buildToolsSection(agentData)}
${this.buildFAQSection(agentData)}

Asistan Görevleri:
1. Müşteri sorularına profesyonel şekilde yanıt ver
2. İşletme hakkında doğru bilgi ver  
3. Çalışma saatlerini kontrol et
4. Randevu talepleri için yönlendirme yap
5. Ürün/hizmet bilgilerini paylaş
6. Dostane ve yardımsever ol
7. Türkçe konuş${this.buildSecuritySection()}`;
  }

  /**
   * Update specific section of assistant instructions
   */
  async updateAssistantPartial(
    assistantId: string, 
    agentData: Agent,
    section?: 'personality' | 'working_hours' | 'tools' | 'faq' | 'core_info' | 'all'
  ): Promise<boolean> {
    try {
      console.log(`🔄 Partial update for section: ${section || 'all'}`);
      
      let instructions: string;
      
      if (section === 'all' || !section) {
        instructions = this.buildCompleteInstructions(agentData);
      } else {
        const currentAssistant = await this.openai.beta.assistants.retrieve(assistantId);
        let currentInstructions = currentAssistant.instructions || '';
        
        const sectionBuilders: Record<string, () => string> = {
          'personality': () => this.buildPersonalitySection(agentData),
          'working_hours': () => this.buildWorkingHoursSection(agentData),
          'tools': () => this.buildToolsSection(agentData),
          'faq': () => this.buildFAQSection(agentData),
          'core_info': () => this.buildCoreInfoSection(agentData)
        };
        
        const sectionMarkers: Record<string, { start: string, end: string }> = {
          'personality': { start: 'Kişilik ve İletişim Tarzı:', end: '\n\nÇalışma Saatleri:' },
          'working_hours': { start: 'Çalışma Saatleri:', end: '\n\nAktif Araçlar:' },
          'tools': { start: 'Aktif Araçlar:', end: '\n\nÜrünler/Hizmetler:' },
          'faq': { start: 'Ürünler/Hizmetler:', end: '\n\nAsistan Görevleri:' },
          'core_info': { start: 'İşletme Bilgileri:', end: '\n\nKişilik ve İletişim Tarzı:' }
        };
        
        const newSectionContent = sectionBuilders[section]();
        const markers = sectionMarkers[section];
        
        const startIndex = currentInstructions.indexOf(markers.start);
        const endIndex = currentInstructions.indexOf(markers.end);
        
        if (startIndex !== -1 && endIndex !== -1) {
          instructions = currentInstructions.substring(0, startIndex) + 
                        newSectionContent + 
                        currentInstructions.substring(endIndex);
          console.log(`✅ Replaced section: ${section}`);
        } else {
          console.log(`⚠️ Section markers not found, rebuilding complete instructions`);
          instructions = this.buildCompleteInstructions(agentData);
        }
      }
      
      const temperature = agentData.temperature ? parseFloat(agentData.temperature) : 0.8;
      
      const updateParams: any = {
        name: agentData.name,
        instructions: instructions,
        model: agentData.openaiModel || "gpt-4o-mini",
        temperature: temperature
      };

      const updatedAssistant = await this.openai.beta.assistants.update(assistantId, updateParams);
      
      console.log(`✅ OpenAI Assistant updated successfully: ${updatedAssistant.id}`);
      
      cacheManager.delete(`playbook_${agentData.id}`);
      
      aiAnalytics.trackUsage({
        model: OPENAI_MODEL,
        tokens: 0,
        cost: 0,
        timestamp: new Date(),
        type: 'custom',
        cached: false
      });

      return true;
    } catch (error: any) {
      console.error(`❌ Failed to update OpenAI Assistant ${assistantId}:`, error);
      return false;
    }
  }

  /**
   * Update existing OpenAI Assistant (full update)
   */
  async updateAssistant(assistantId: string, agentData: Agent): Promise<boolean> {
    return this.updateAssistantPartial(assistantId, agentData, 'all');
  }

  /**
   * Validate OpenAI API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
export const openaiService = new OpenAIService();