import OpenAI from "openai";
import { Agent, AgentWizardData } from "../../shared/schema";

const OPENAI_MODEL = "gpt-4o-mini";

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

      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
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

      return response.choices[0].message.content || "";
    } catch (error: any) {
      console.error("OpenAI playbook generation error:", error);
      throw new Error(`Playbook oluşturulurken hata: ${error.message}`);
    }
  }

  /**
   * Handle chat with agent using OpenAI
   */
  async chatWithAgent(
    agentInstructions: string,
    userMessage: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<string> {
    try {
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
        model: OPENAI_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 1000
      });

      return response.choices[0].message.content || "Üzgünüm, şu anda yanıt veremiyorum.";
    } catch (error: any) {
      console.error("OpenAI chat error:", error);
      throw new Error(`Sohbet hatası: ${error.message}`);
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
          multiLanguageSupport: 'Çoklu Dil Desteği'
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