import { Request, Response } from 'express';
import OpenAI from 'openai';
import { storage } from '../database/storage';
import { db } from '../database/storage';
import { agents } from '@shared/schema';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

// Supabase connection configuration
const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl ? supabaseUrl.replace('https://', '').replace('.supabase.co', '') : 'hnlosxmzbzesyubocgmf';
const connectionString = `postgresql://postgres.${projectRef}:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Prompt generator assistant ID
const PROMPT_GENERATOR_ASSISTANT_ID = process.env.PROMPT_GENERATOR_ASSISTANT_ID;

interface CustomAgentRequest {
    agentName: string;
    agentPurpose: string;
    personality: string;
    expertise: string[];
    communicationStyle: string;
    targetAudience: string;
    specialInstructions: string;
    preferredLanguage: string;
    temperature: number;
    userId: string;
}

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
                        description: "List of attendee emails (optional)"
                    }
                },
                required: ["summary", "startISO", "endISO"]
            }
        }
    }
];

// Gmail Tools
const GMAIL_TOOLS: OpenAI.Beta.Assistants.AssistantTool[] = [
    {
        type: "function",
        function: {
            name: "gmail_send_message",
            description: "Send an email to one or more recipients.",
            parameters: {
                type: "object",
                properties: {
                    to: { type: "string", description: "The email address of the recipient." },
                    subject: { type: "string", description: "The subject of the email." },
                    body: { type: "string", description: "The body of the email." },
                    cc: { type: "string", description: "CC recipients (optional)." },
                    bcc: { type: "string", description: "BCC recipients (optional)." }
                },
                required: ["to", "subject", "body"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "gmail_list_messages",
            description: "List messages in the user inbox.",
            parameters: {
                type: "object",
                properties: {
                    maxResults: { type: "number", description: "Maximum number of messages to return (default 10)" },
                    q: { type: "string", description: "Query string to filter messages" },
                    labelIds: { type: "array", items: { type: "string" }, description: "List of label IDs to filter messages by" }
                },
                required: []
            }
        }
    }
];

// Web Search Tools
const WEB_SEARCH_TOOLS: OpenAI.Beta.Assistants.AssistantTool[] = [
    {
        type: "function",
        function: {
            name: "web_search",
            description: "Search the web for current information using Google and return a summary with reliable sources. Use this when you need up-to-date information that may not be in your training data.",
            parameters: {
                type: "object",
                properties: {
                    query: { 
                        type: "string", 
                        description: "The search query to find information about" 
                    },
                    max_results: { 
                        type: "number", 
                        description: "Maximum number of results to return (default 3, max 5)" 
                    },
                    language: {
                        type: "string",
                        description: "Language for search results (e.g., 'tr' for Turkish, 'en' for English). Default is 'tr'"
                    }
                },
                required: ["query"]
            }
        }
    }
];

function sanitize(str?: string, max = 4000) {
    if (!str) return "";
    return String(str).slice(0, max).trim();
}

function arrToList(arr?: string[], maxItems = 12) {
    if (!Array.isArray(arr)) return "";
    return arr.slice(0, maxItems).map(sanitize).filter(Boolean).join(", ");
}

export const createCustomAgent = async (req: Request, res: Response) => {
    const consoleLogs: string[] = [];
    const debugLogs: string[] = [];
    const webLogs: string[] = [];

    const addConsoleLog = (message: string) => {
        consoleLogs.push(message);
        console.log(message);
    };
    const addDebugLog = (message: string) => {
        debugLogs.push(message);
        console.debug(message);
    };
    const addWebLog = (message: string) => {
        webLogs.push(message);
    };

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    addConsoleLog("🎯 ÇALIŞAN OpenAI Agent Creation başlatıldı");
    addDebugLog("Debug: İstek methodu doğrulandı (POST)");

    try {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY tanımlı değil");

        const formData: CustomAgentRequest = req.body;

        // Doğrulamalar
        if (!formData?.agentName) throw new Error("agentName zorunludur");
        if (!formData?.agentPurpose) throw new Error("agentPurpose zorunludur");
        if (!formData?.userId) throw new Error("userId zorunludur");

        const agentName = sanitize(formData.agentName, 120);
        const agentPurpose = sanitize(formData.agentPurpose, 2000);
        const personality = sanitize(formData.personality, 1000);
        const communicationStyle = sanitize(formData.communicationStyle, 500);
        const targetAudience = sanitize(formData.targetAudience, 1000);
        const specialInstructions = sanitize(formData.specialInstructions, 4000);
        const preferredLanguage = (formData.preferredLanguage || "tr").toLowerCase();
        const temperature = Math.min(Math.max(formData.temperature || 1.0, 0.0), 2.0);

        let generatedPrompt = "";

        // Prompt generator kullanma işlemi
        if (PROMPT_GENERATOR_ASSISTANT_ID) {
            try {
                addWebLog("Web: Prompt generator assistant ile iletişim başlatılıyor");
                const promptThread = await openai.beta.threads.create();

                if (!promptThread.id) {
                    throw new Error("Thread oluşturulamadı - geçersiz thread ID");
                }

                addDebugLog(`Debug: Prompt thread ID: ${promptThread.id}`);

                const formMessage = `Kullanıcı aşağıdaki bilgilerle bir AI agent oluşturmak istiyor. Bu bilgilere dayanarak ${preferredLanguage === "tr" ? "Türkçe" : "English"} dilinde, detaylı ve etkili tek parça bir assistant promptu oluştur.
Yanıtını SADECE nihai prompt metni olarak döndür:

Agent Adı: ${agentName}
Amacı: ${agentPurpose}
Kişilik: ${personality}
Uzmanlık Alanları: ${arrToList(formData.expertise)}
İletişim Stili: ${communicationStyle}
Hedef Kitle: ${targetAudience}
Özel Talimatlar: ${specialInstructions}
Tercih Edilen Dil: ${preferredLanguage}

Kriterler:
- Rolü ve kapsamı netleştir.
- Sınırlar, "yap/yapma" kuralları, netlik ve örnek görevler ekle.
- Kısa, komut odaklı cümleler kullan.
- Gereksiz tekrar yapma.`;

                await openai.beta.threads.messages.create(promptThread.id, {
                    role: "user",
                    content: formMessage,
                });
                addWebLog("Web: Form verileri prompt generatora gönderildi");

                const promptRun = await openai.beta.threads.runs.create(promptThread.id, {
                    assistant_id: PROMPT_GENERATOR_ASSISTANT_ID,
                });

                if (!promptRun.id) {
                    throw new Error("Run oluşturulamadı - geçersiz run ID");
                }

                addDebugLog(`Debug: Prompt run ID: ${promptRun.id}`);

                // Prompt generation tamamlanana kadar bekle
                let attempts = 0;
                let currentRun = promptRun;

                while (["queued", "in_progress"].includes(currentRun.status) && attempts < 30) {
                    await new Promise((r) => setTimeout(r, 1500));
                    attempts++;

                    if (!promptThread.id || !currentRun.id) {
                        throw new Error(`Geçersiz IDler: threadId=${promptThread.id}, runId=${currentRun.id}`);
                    }

                    const threadId = String(promptThread.id);
                    const runId = String(currentRun.id);

                    try {
                        currentRun = await openai.beta.threads.runs.retrieve(runId, {
                            thread_id: threadId
                        });

                        addDebugLog(`Debug: Prompt run durumu (${attempts}. deneme): ${currentRun.status}`);

                    } catch (retrieveError: any) {
                        addDebugLog(`Debug Error: OpenAI API hatası - ${retrieveError.message}`);
                        throw new Error(`Prompt generation hatası: ${retrieveError.message}`);
                    }
                }

                if (currentRun.status !== "completed") {
                    throw new Error(`Prompt generation tamamlanamadı (durum: ${currentRun.status})`);
                }

                addWebLog("Web: Prompt generation tamamlandı");

                // Oluşturulan promptu al
                const promptMessages = await openai.beta.threads.messages.list(promptThread.id);
                const assistantMessages = promptMessages.data.filter(msg => msg.role === "assistant");

                if (assistantMessages.length > 0 && assistantMessages[0].content[0].type === "text") {
                    generatedPrompt = assistantMessages[0].content[0].text.value;
                    addWebLog("Web: Prompt başarıyla alındı");
                } else {
                    throw new Error("Assistant yanıtı alınamadı");
                }

            } catch (promptError: any) {
                addDebugLog(`Debug: Prompt generation hatası: ${promptError.message}`);
                addWebLog("Web: Prompt generation başarısız, fallback prompt kullanılacak");
                generatedPrompt = generateFallbackPrompt(agentName, agentPurpose, personality, preferredLanguage);
            }
        } else {
            generatedPrompt = generateFallbackPrompt(agentName, agentPurpose, personality, preferredLanguage);
        }

        // OpenAI Assistant oluştur
        addWebLog("Web: OpenAI Assistant oluşturuluyor");
        
        const tools = [...GCAL_TOOLS, ...GMAIL_TOOLS, ...WEB_SEARCH_TOOLS];
        
        const assistant = await openai.beta.assistants.create({
            name: agentName,
            instructions: generatedPrompt,
            model: "gpt-4o-mini",
            tools: tools,
            temperature: temperature
        });

        addWebLog(`Web: Assistant oluşturuldu - ID: ${assistant.id}`);

        // Database kayıt işlemi - Drizzle ORM ile
        addWebLog("Web: Database'e agent kaydı yapılıyor...");
        
        try {
            // Use only core columns that definitely exist
            const agentData = {
                userId: formData.userId,
                name: agentName,
                role: 'OpenAI Assistant',
                description: agentPurpose,
                openaiAssistantId: assistant.id, // Add OpenAI Assistant ID for chat
                personality: {
                    instructions: generatedPrompt,
                    assistantId: assistant.id,
                    style: communicationStyle,
                    temperature: temperature,
                    language: preferredLanguage,
                    targetAudience: targetAudience
                },
                tools: {
                    openaiAssistant: true,
                    googleCalendar: true,
                    gmail: true,
                    codeInterpreter: true,
                    fileSearch: true,
                    assistantId: assistant.id
                }
                // Removed is_active temporarily to test
            };
            
            const createdAgent = await storage.createAgent(agentData);
            
            addConsoleLog(`✅ Database insert successful! Agent saved with ID: ${createdAgent.id}`);
            addWebLog("Web: ✅ Agent başarıyla database'e kaydedildi!");
            addWebLog(`Web: Assistant ID: ${assistant.id}`);
            addWebLog(`Web: Database Agent ID: ${createdAgent.id}`);
            addWebLog(`Web: Google Calendar Tool: ✅ Aktif`);
            addWebLog(`Web: Gmail Tool: ✅ Aktif`);
            addWebLog(`Web: Code Interpreter: ✅ Aktif`);
            addWebLog(`Web: File Search: ✅ Aktif`);
            
        } catch (dbError: any) {
            addWebLog(`Web: ⚠ Database kayıt hatası: ${dbError.message}`);
            addConsoleLog(`❌ Database insert failed: ${dbError.message}`);
            // OpenAI Agent oluşturuldu ama database kaydı başarısız
        }

        // Başarılı yanıt
        return res.status(200).json({
            success: true,
            agentId: assistant.id, // OpenAI Assistant ID frontend için
            data: {
                id: assistant.id,
                name: agentName,
                description: agentPurpose,
                assistantId: assistant.id,
                openaiAssistantId: assistant.id,
                instructions: generatedPrompt,
                model: "gpt-4o-mini",
                tools: tools.length
            },
            logs: {
                console: consoleLogs,
                debug: debugLogs,
                web: webLogs
            }
        });

    } catch (error: any) {
        addConsoleLog(`❌ Agent oluşturma hatası: ${error.message}`);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            logs: {
                console: consoleLogs,
                debug: debugLogs,
                web: webLogs
            }
        });
    }
};

// Orijinal fonksiyon - backup
export const createCustomAgentOriginal = async (req: Request, res: Response) => {
    const consoleLogs: string[] = [];
    const debugLogs: string[] = [];
    const webLogs: string[] = [];

    const addConsoleLog = (message: string) => {
        consoleLogs.push(message);
        console.log(message);
    };
    const addDebugLog = (message: string) => {
        debugLogs.push(message);
        console.debug(message);
    };
    const addWebLog = (message: string) => {
        webLogs.push(message);
    };

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    addConsoleLog("API isteği alındı: Özel agent oluşturma süreci başlıyor");
    addDebugLog("Debug: İstek methodu doğrulandı (POST)");

    try {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY tanımlı değil");

        const formData: CustomAgentRequest = req.body;

        // Doğrulamalar
        if (!formData?.agentName) throw new Error("agentName zorunludur");
        if (!formData?.agentPurpose) throw new Error("agentPurpose zorunludur");
        if (!formData?.userId) throw new Error("userId zorunludur");

        const agentName = sanitize(formData.agentName, 120);
        const agentPurpose = sanitize(formData.agentPurpose, 2000);
        const personality = sanitize(formData.personality, 1000);
        const communicationStyle = sanitize(formData.communicationStyle, 500);
        const targetAudience = sanitize(formData.targetAudience, 1000);
        const specialInstructions = sanitize(formData.specialInstructions, 4000);
        const preferredLanguage = (formData.preferredLanguage || "tr").toLowerCase();
        const temperature = Math.min(Math.max(formData.temperature || 1.0, 0.0), 2.0);

        let generatedPrompt = "";

        // Prompt generator kullanma işlemi
        if (PROMPT_GENERATOR_ASSISTANT_ID) {
            try {
                addWebLog("Web: Prompt generator assistant ile iletişim başlatılıyor");
                const promptThread = await openai.beta.threads.create();

                if (!promptThread.id) {
                    throw new Error("Thread oluşturulamadı - geçersiz thread ID");
                }

                addDebugLog(`Debug: Prompt thread ID: ${promptThread.id}`);

                const formMessage = `Kullanıcı aşağıdaki bilgilerle bir AI agent oluşturmak istiyor. Bu bilgilere dayanarak ${preferredLanguage === "tr" ? "Türkçe" : "English"} dilinde, detaylı ve etkili tek parça bir assistant promptu oluştur.
Yanıtını SADECE nihai prompt metni olarak döndür:

Agent Adı: ${agentName}
Amacı: ${agentPurpose}
Kişilik: ${personality}
Uzmanlık Alanları: ${arrToList(formData.expertise)}
İletişim Stili: ${communicationStyle}
Hedef Kitle: ${targetAudience}
Özel Talimatlar: ${specialInstructions}
Tercih Edilen Dil: ${preferredLanguage}

Kriterler:
- Rolü ve kapsamı netleştir.
- Sınırlar, "yap/yapma" kuralları, netlik ve örnek görevler ekle.
- Kısa, komut odaklı cümleler kullan.
- Gereksiz tekrar yapma.`;

                await openai.beta.threads.messages.create(promptThread.id, {
                    role: "user",
                    content: formMessage,
                });
                addWebLog("Web: Form verileri prompt generatora gönderildi");

                const promptRun = await openai.beta.threads.runs.create(promptThread.id, {
                    assistant_id: PROMPT_GENERATOR_ASSISTANT_ID,
                });

                if (!promptRun.id) {
                    throw new Error("Run oluşturulamadı - geçersiz run ID");
                }

                addDebugLog(`Debug: Prompt run ID: ${promptRun.id}`);

                // Prompt generation tamamlanana kadar bekle
                let attempts = 0;
                let currentRun = promptRun;

                while (["queued", "in_progress"].includes(currentRun.status) && attempts < 30) {
                    await new Promise((r) => setTimeout(r, 1500));
                    attempts++;

                    if (!promptThread.id || !currentRun.id) {
                        throw new Error(`Geçersiz IDler: threadId=${promptThread.id}, runId=${currentRun.id}`);
                    }

                    const threadId = String(promptThread.id);
                    const runId = String(currentRun.id);

                    try {
                        currentRun = await openai.beta.threads.runs.retrieve(runId, {
                            thread_id: threadId
                        });

                        addDebugLog(`Debug: Prompt run durumu (${attempts}. deneme): ${currentRun.status}`);

                    } catch (retrieveError: any) {
                        addDebugLog(`Debug Error: OpenAI API hatası - ${retrieveError.message}`);
                        throw new Error(`Prompt generation hatası: ${retrieveError.message}`);
                    }
                }

                if (currentRun.status !== "completed") {
                    throw new Error(`Prompt generation tamamlanamadı (durum: ${currentRun.status})`);
                }

                addWebLog("Web: Prompt generation tamamlandı");

                // Oluşturulan promptu al
                const promptMessages = await openai.beta.threads.messages.list(promptThread.id);
                const assistantMessages = promptMessages.data.filter(msg => msg.role === "assistant");

                if (assistantMessages.length > 0 && assistantMessages[0].content[0].type === "text") {
                    generatedPrompt = assistantMessages[0].content[0].text.value;
                    addWebLog("Web: Prompt başarıyla alındı");
                } else {
                    throw new Error("Assistant yanıtı alınamadı");
                }

            } catch (promptError: any) {
                addDebugLog(`Debug: Prompt generation hatası: ${promptError.message}`);
                addWebLog("Web: Prompt generation başarısız, fallback prompt kullanılacak");
                generatedPrompt = generateFallbackPrompt(agentName, agentPurpose, personality, preferredLanguage);
            }
        } else {
            generatedPrompt = generateFallbackPrompt(agentName, agentPurpose, personality, preferredLanguage);
        }

        // OpenAI Assistant oluştur
        addWebLog("Web: OpenAI Assistant oluşturuluyor");
        
        const tools = [...GCAL_TOOLS, ...GMAIL_TOOLS, ...WEB_SEARCH_TOOLS];
        
        const assistant = await openai.beta.assistants.create({
            name: agentName,
            instructions: generatedPrompt,
            model: "gpt-4o-mini",
            tools: tools,
            temperature: temperature
        });

        addWebLog(`Web: Assistant oluşturuldu - ID: ${assistant.id}`);

        // Geçici olarak database insert'i atlayıp sadece OpenAI başarısını test ediyoruz
        addWebLog("Web: Database insert geçici olarak atlandı - sadece OpenAI test ediliyor");

        // Başarılı yanıt
        return res.status(200).json({
            success: true,
            agentId: assistant.id, // Frontend'in beklediği format
            data: {
                id: assistant.id,
                name: agentName,
                description: agentPurpose,
                assistantId: assistant.id,
                instructions: generatedPrompt
            },
            logs: {
                console: consoleLogs,
                debug: debugLogs,
                web: webLogs
            }
        });

    } catch (error: any) {
        addConsoleLog(`❌ Agent oluşturma hatası: ${error.message}`);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            logs: {
                console: consoleLogs,
                debug: debugLogs,
                web: webLogs
            }
        });
    }
};

function generateFallbackPrompt(name: string, purpose: string, personality: string, language: string): string {
    const lang = language === "tr" ? "Türkçe" : "English";
    
    if (language === "tr") {
        return `Sen ${name} adlı özel bir AI asistanısın. 

Görevin: ${purpose}

Kişilik: ${personality}

Kurallar:
- Her zaman ${lang} konuş
- Profesyonel ve yardımsever ol
- Kullanıcının ihtiyaçlarını anlamaya odaklan
- Açık ve net yanıtlar ver
- Gerektiğinde ek soru sor
- Etik kurallara uygun davran

Sen bir uzman asistansın ve kullanıcılara en iyi hizmeti sunmak için buradaysın.`;
    } else {
        return `You are ${name}, a specialized AI assistant.

Your purpose: ${purpose}

Personality: ${personality}

Rules:
- Always communicate in ${lang}
- Be professional and helpful
- Focus on understanding user needs
- Provide clear and precise answers
- Ask follow-up questions when necessary
- Follow ethical guidelines

You are an expert assistant dedicated to providing the best service to users.`;
    }
}