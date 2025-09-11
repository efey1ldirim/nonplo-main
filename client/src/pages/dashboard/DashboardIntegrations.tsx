import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, ShieldCheck, Brain, Clock, BarChart, MessageCircle, Instagram, Calendar, ShoppingBag, Globe, Slack, Upload, X, Search } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const TOOLS = [
  { key: "content_sanitizer", name: "İçerik Temizleyici", desc: "Gelen/giden içeriği güvenlik için temizler.", icon: Shield },
  { key: "safe_reply_guard", name: "Güvenli Yanıt Koruması", desc: "Güvenli olmayan veya hassas yanıtları engeller.", icon: ShieldCheck },
  { key: "konuşma_memory", name: "Konuşma Hafızası", desc: "Mesajlar arası bağlamı hatırlar.", icon: Brain },
  { key: "business_hours_gate", name: "Çalışma Saati Kontrolü", desc: "Belirlediğiniz çalışma saatlerine uyar.", icon: Clock },
  { key: "analytics_tracking", name: "Analitik Takibi", desc: "İçgörüler için konuşmaları takip eder.", icon: BarChart },
] as const;

type ToolKey = typeof TOOLS[number]["key"];

const INTEGRATIONS = [
  { provider: "whatsapp", name: "WhatsApp Business API", desc: "Müşteri mesajlaşması için WhatsApp bağlantısı.", icon: MessageCircle },
  { provider: "instagram", name: "Instagram DM", desc: "Instagram direkt mesajlarını etkinleştir.", icon: Instagram },
  { provider: "google_calendar", name: "Google Takvim", desc: "Etkinlikleri ve müsaitliği senkronize et.", icon: Calendar },
  { provider: "web_search", name: "Web Arama", desc: "Google ile web'de güncel bilgi arama yapın.", icon: Search },
  { provider: "shop_platform", name: "Shopify / WooCommerce", desc: "Mağaza verilerini ve siparişleri entegre et.", icon: ShoppingBag },
  { provider: "web_embed", name: "Web Widget", desc: "Sitenize sohbet widget'ını kurun.", icon: Globe },
  { provider: "slack", name: "Slack / Teams", desc: "Çalışma alanınızda bildirimler alın.", icon: Slack },
] as const;

type ProviderKey = typeof INTEGRATIONS[number]["provider"];

const requestSchema = z.object({
  name: z.string().min(1, "Gerekli"),
  email: z.string().email("Geçersiz e-posta"),
  requested: z.string().min(1, "Gerekli"),
  details: z.string().optional(),
});

type RequestValues = z.infer<typeof requestSchema>;

const DashboardIntegrations: React.FC = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Tools state
  const [toolsState, setToolsState] = useState<Record<string, boolean>>({});
  const [loadingTools, setLoadingTools] = useState<boolean>(true);
  const [savingToolKey, setSavingToolKey] = useState<ToolKey | null>(null);
  const [confirmTool, setConfirmTool] = useState<{ key: ToolKey; nextValue: boolean } | null>(null);

  // Integrations state
  const [integrationsState, setIntegrationsState] = useState<Record<string, "connected" | "disconnected">>({});
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [confirmDisconnect, setConfirmDisconnect] = useState<ProviderKey | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Special requests form
  const form = useForm<RequestValues>({ resolver: zodResolver(requestSchema) });
  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: session } = await supabase.auth.getSession();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      setToken(session?.session?.access_token ?? null);
      if (!uid) return;

      // Load tools settings
      const { data: toolRows, error: toolErr } = await supabase
        .from("tools_settings")
        .select("tool_key, enabled")
        .eq("user_id", uid);
      if (toolErr) {
        toast({ title: "Araçlar yüklenemedi", description: toolErr.message, variant: "destructive" });
      } else {
        const map: Record<string, boolean> = {};
        toolRows?.forEach((r) => (map[r.tool_key] = r.enabled));
        setToolsState(map);
      }

      // Load integrations
      const { data: integRows, error: integErr } = await supabase
        .from("integrations_connections")
        .select("provider, status")
        .eq("user_id", uid);
      if (integErr) {
        toast({ title: "Entegrasyonlar yüklenemedi", description: integErr.message, variant: "destructive" });
      } else {
        const imap: Record<string, "connected" | "disconnected"> = {};
        integRows?.forEach((r) => (imap[r.provider] = (r.status as any) || "disconnected"));
        setIntegrationsState(imap);
      }

      setLoadingTools(false);
    };
    init();
  }, [toast]);

  const onToggleToolIntent = (key: ToolKey, next: boolean) => {
    setConfirmTool({ key, nextValue: next });
  };

  const persistToolChange = async () => {
    if (!userId || !confirmTool) return;
    const { key, nextValue } = confirmTool;
    setSavingToolKey(key);
    try {
      const { error } = await supabase
        .from("tools_settings")
        .upsert({ user_id: userId, tool_key: key, enabled: nextValue }, { onConflict: "user_id,tool_key" });
      if (error) throw error;
      setToolsState((prev) => ({ ...prev, [key]: nextValue }));
      toast({ title: "Güncellendi", description: `"${TOOLS.find((t) => t.key === key)?.name}" şimdi ${nextValue ? "AÇIK" : "KAPALI"}.` });
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: e.message, variant: "destructive" });
    } finally {
      setSavingToolKey(null);
      setConfirmTool(null);
    }
  };

  const connectProvider = async (provider: ProviderKey) => {
    if (!userId) return;
    setConnecting((s) => ({ ...s, [provider]: true }));
    try {
      // Placeholder connect flow: mark as connected
      const { error } = await supabase
        .from("integrations_connections")
        .upsert({ user_id: userId, provider, status: "connected", meta: {} }, { onConflict: "user_id,provider" });
      if (error) throw error;
      setIntegrationsState((s) => ({ ...s, [provider]: "connected" }));
      toast({ title: "Bağlandı", description: `${INTEGRATIONS.find((i) => i.provider === provider)?.name} bağlandı.` });
    } catch (e: any) {
      toast({ title: "Bağlantı başarısız", description: e.message, variant: "destructive" });
    } finally {
      setConnecting((s) => ({ ...s, [provider]: false }));
    }
  };

  const confirmDisconnectProvider = async () => {
    if (!userId || !confirmDisconnect) return;
    const provider = confirmDisconnect;
    setConnecting((s) => ({ ...s, [provider]: true }));
    try {
      const { error } = await supabase
        .from("integrations_connections")
        .upsert({ user_id: userId, provider, status: "disconnected", meta: {} }, { onConflict: "user_id,provider" });
      if (error) throw error;
      setIntegrationsState((s) => ({ ...s, [provider]: "disconnected" }));
      toast({ title: "Bağlantı kesildi", description: `${INTEGRATIONS.find((i) => i.provider === provider)?.name} bağlantısı kesildi.` });
    } catch (e: any) {
      toast({ title: "Bağlantı kesme başarısız", description: e.message, variant: "destructive" });
    } finally {
      setConnecting((s) => ({ ...s, [provider]: false }));
      setConfirmDisconnect(null);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['.txt', '.pdf', '.docx'];
      const fileName = file.name.toLowerCase();
      const isValidType = allowedTypes.some(type => fileName.endsWith(type));

      if (isValidType) {
        setSelectedFile(file);
        await uploadFileToObjectStorage(file);
      } else {
        toast({
          title: "Desteklenmeyen dosya formatı",
          description: "Sadece .txt, .pdf veya .docx dosyaları yükleyebilirsiniz.",
          variant: "destructive"
        });
      }
    }
  };

  const uploadFileToObjectStorage = async (file: File) => {
    setIsUploading(true);
    try {
      console.log('🔧 Starting file upload via service:', file.name);
      console.log('📊 File size:', file.size, 'bytes');

      // Convert file to base64
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(file);
      const fileData = await fileDataPromise;

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/integrations/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileData: fileData,
          mimeType: file.type
        }),
      });

      console.log('📤 Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `Upload failed with status ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result.url);

      setUploadedFile(file);
      setUploadedFileUrl(result.url);
      
      console.log('📎 File upload state updated:', { 
        fileName: file.name, 
        url: result.url 
      });
      
      toast({
        title: "Dosya yüklendi",
        description: "Dosyanız başarıyla yüklendi ve isteğinize eklenecek.",
      });
    } catch (error) {
      console.error('❌ File upload error:', error);
      
      let errorMessage = 'Bilinmeyen hata';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Dosya yükleme başarısız",
        description: errorMessage,
        variant: "destructive"
      });
      
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    // Reset file input
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmitRequest = async (values: RequestValues) => {
    if (!userId) return;
    
    console.log('🚀 Starting integration request submission');
    console.log('📝 Form values:', values);
    console.log('📎 Uploaded file:', uploadedFile?.name || 'NO FILE');
    console.log('🔗 Uploaded URL:', uploadedFileUrl || 'NO URL');
    console.log('👤 User ID:', userId);
    console.log('🔑 Token exists:', !!token);
    
    // Check if user selected a file but upload hasn't completed
    if (selectedFile && (!uploadedFile || !uploadedFileUrl)) {
      console.log('❌ ERROR: File selected but upload not completed');
      toast({ 
        title: "Dosya yükleme tamamlanmadı", 
        description: "Lütfen dosya yüklemesinin tamamlanmasını bekleyin.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Force check current state
    if (!uploadedFile || !uploadedFileUrl) {
      console.log('⚠️ WARNING: No file attachment found, proceeding without attachment');
    }
    
    try {
      let uploadedPath: string | null = null;
      const fileList: FileList | undefined = (values as any).file;
      const file = fileList && fileList.length > 0 ? fileList[0] : null;
      if (file) {
        const fileName = `${crypto.randomUUID()}-${file.name}`;
        const path = `${userId}/${fileName}`;
        const { error: upErr } = await supabase.storage.from("requests").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        uploadedPath = path;
      }

      // Send integration request via email endpoint
      const requestData = {
        name: values.name,
        email: values.email,
        requested: values.requested,
        details: values.details || '',
        attachmentUrl: uploadedFileUrl,
        attachmentName: uploadedFile ? uploadedFile.name : null,
      };

      console.log('📧 Sending integration request:', requestData);

      const emailResponse = await fetch('/api/integrations/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        throw new Error(`Email sending failed: ${error}`);
      }

      console.log('✅ Integration request sent successfully');

      toast({ title: "Teşekkürler!", description: "We’ll review your request." });
      form.reset();
      // Reset file upload state
      setUploadedFile(null);
      setUploadedFileUrl(null);
    } catch (e: any) {
      toast({ title: "Gönderim başarısız", description: e.message, variant: "destructive" });
    }
  };

  const toolItems = useMemo(() => TOOLS, []);
  const integrationItems = useMemo(() => INTEGRATIONS, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Entegrasyonlar ve Araçlar</h1>
        <p className="text-muted-foreground text-base md:text-lg">Sistem geneli araçları yönetin ve üçüncü taraf servislerine bağlanın.</p>
      </header>

      {/* Section A — Tools (global) */}
      <section className="mb-10">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">Araçlar</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Bu araçlar sistem genelindedir. Buradaki bir değişiklik tüm Yapay Zeka Destekli Dijital Çalışanlarınızı etkiler.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {toolItems.map(({ key, name, desc, icon: Icon }) => (
            <Card key={key} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base md:text-lg">{name}</CardTitle>
                      <CardDescription className="text-sm">{desc}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={!!toolsState[key]}
                    onCheckedChange={(v) => onToggleToolIntent(key, v)}
                    disabled={loadingTools || savingToolKey === key}
                    aria-label={`Toggle ${name}`}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          You can still override tools per worker inside each worker’s admin panel.
        </p>
      </section>

      {/* Divider */}
      <div className="my-10 border-t border-border" />

      {/* Section B — Integrations */}
      <section className="mb-12">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">Entegrasyonlar</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Connect third‑party accounts here. Note: Connecting an account on this page does not automatically enable it for every Yapay Zeka Destekli Dijital Çalışan. To use an integration for a specific worker, enable it in that worker’s admin panel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrationItems.map(({ provider, name, desc, icon: Icon }) => {
            const status = integrationsState[provider] || "disconnected";
            const isLoading = !!connecting[provider];
            return (
              <Card key={provider}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base md:text-lg">{name}</CardTitle>
                        <CardDescription className="text-sm">{desc}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === "connected" ? (
                        <>
                          <Badge variant="secondary">Bağlandı</Badge>
                          {provider !== "google_calendar" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDisconnect(provider)}
                              disabled={isLoading}
                            >
                              Bağlantıyı Kes
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => connectProvider(provider)}
                          disabled={isLoading}
                        >
                          {isLoading ? "Bağlanıyor..." : "Bağlan"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Special Requests form */}
      <section className="mb-6">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">Özel İstekler</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Tell us which tools or integrations you’d like us to add.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={form.handleSubmit((values) => {
                console.log('🔥 Form submitted with values:', values);
                return onSubmitRequest(values);
              })}
            >
              <div className="space-y-2">
                <Label htmlFor="name">İsim</Label>
                <Input id="name" placeholder="İsminiz" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="siz@ornek.com" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message as string}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="requested">İstenen araç/entegrasyon</Label>
                <Input id="requested" placeholder="örn., Zendesk, Stripe, Salesforce..." {...form.register("requested")} />
                {form.formState.errors.requested && (
                  <p className="text-sm text-destructive">{form.formState.errors.requested.message as string}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="details">Kullanım durumu / detaylar</Label>
                <Textarea id="details" rows={5} placeholder="Tell us how you’d use this." {...form.register("details")} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="file">İsteğe bağlı dosya yükleme (.txt, .pdf, .docx)</Label>
                {!selectedFile ? (
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="file" 
                      type="file" 
                      accept=".txt,.pdf,.docx" 
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <div className="text-sm text-muted-foreground">Yükleniyor...</div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {isSubmitting ? "Gönderiliyor..." : isUploading ? "Dosya yükleniyor..." : "İstek Gönder"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Confirm dialogs */}
      <Dialog open={!!confirmTool} onOpenChange={(open) => !open && setConfirmTool(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply this change globally?</DialogTitle>
            <DialogDescription>
              This change will affect all Yapay Zeka Destekli Dijital Çalışanlar. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTool(null)} disabled={savingToolKey !== null}>
              İptal
            </Button>
            <Button onClick={persistToolChange} disabled={savingToolKey !== null}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDisconnect} onOpenChange={(open) => !open && setConfirmDisconnect(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entegrasyon bağlantısını kes?</DialogTitle>
            <DialogDescription>
              Bu, erişimi iptal edecek ve yeniden bağlanana kadar kullanımı devre dışı bırakacaktır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisconnect(null)}>
              İptal
            </Button>
            <Button onClick={confirmDisconnectProvider}>Bağlantıyı Kes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardIntegrations;