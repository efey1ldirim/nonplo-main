import { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { debounce } from 'lodash';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, MoreVertical, Trash2, Download, Pencil, Bot, ChevronRight, MessageSquare, Search as SearchIcon, User, FileText, Upload, ArrowRight, Check, Loader2, Clock, MapPin, HelpCircle, Package, Code, Heart, Briefcase, Users, MessageCircle, Settings, BarChart, MoreHorizontal, Edit, X, Plus, ExternalLink } from "lucide-react";
import { AgentChat } from "@/components/features/AgentChat";

interface Agent {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  openaiAssistantId?: string;
  temperature?: string;
  personality?: any;
  workingHours?: any;
  address?: string;
  website?: string;
  socialMedia?: any;
  faq?: any;
  products?: string;
}

interface IntegrationConn {
  provider: string;
  status: "connected" | "disconnected" | string;
}

interface Conversation {
  id: string;
  user_id: string;
  agent_id: string;
  channel: string;
  status: string;
  last_message_at: string;
  unread: boolean;
  meta: any;
  created_at: string;
  updated_at: string;
  latest_message?: {
    id: string;
    content: string;
    sender: string;
    created_at: string;
  } | null;
}

const providers = [
  { key: "whatsapp", name: "WhatsApp Business API", desc: "WhatsApp üzerinde iş mesajlaşmasını yönetin." },
  { key: "instagram", name: "Instagram DM", desc: "Instagram direkt mesajlarını yanıtlayın." },
  { key: "google_calendar", name: "Google Calendar", desc: "Takvim etkinliklerini planlayın ve okuyun." },
  { key: "web_search", name: "Web Arama", desc: "Google ile web'de güncel bilgi arama yapın." },
  { key: "shop", name: "Shopify / WooCommerce", desc: "Ürünleri ve siparişleri senkronize edin." },
  { key: "web_embed", name: "Web Embed", desc: "Chat widget'ını web sitenize yerleştirin." },
  { key: "slack", name: "Slack", desc: "Slack'e bildirimler gönderin." },
];

// Auto-save indicator component
const AutoSaveIndicator: React.FC<{ fieldId: string; autoSaveStates: Record<string, 'idle' | 'saving' | 'success'> }> = ({ fieldId, autoSaveStates }) => {
  const status = autoSaveStates[fieldId] || 'idle';
  
  if (status === 'idle') return null;
  
  return (
    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
      {status === 'saving' && (
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
      )}
      {status === 'success' && (
        <Check className="w-4 h-4 text-green-500" />
      )}
    </div>
  );
};

// Employee Personality Card Component
const EmployeePersonalityCard: React.FC<{ agent: Agent | null; onUpdate: (field: string, value: any) => void; autoSaveStates: Record<string, 'idle' | 'saving' | 'success'> }> = ({ agent, onUpdate, autoSaveStates }) => {
  // Initialize personality data from agent or use defaults
  const getInitialPersonality = () => {
    if (agent?.personality && typeof agent.personality === 'object') {
      const p = agent.personality as any;
      return {
        tone: p.tone || 'profesyonel',
        formality: p.formality || 3,
        creativity: p.creativity || 0.7,
        responseLength: p.responseLength || 'orta',
        useEmojis: p.useEmojis || false,
        customInstructions: p.customInstructions || ''
      };
    }
    return {
      tone: 'profesyonel',
      formality: 3,
      creativity: 0.7,
      responseLength: 'orta',
      useEmojis: false,
      customInstructions: ''
    };
  };

  const [personalityData, setPersonalityData] = useState(getInitialPersonality);

  // Update local state when agent data changes
  useEffect(() => {
    setPersonalityData(getInitialPersonality());
  }, [agent]);

  const personalityPresets = [
    { value: 'sevecen', label: 'Sevecen', icon: Heart, description: 'Sıcak ve anlayışlı', color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900 dark:text-pink-300' },
    { value: 'profesyonel', label: 'Profesyonel', icon: Briefcase, description: 'Resmi ve ciddi', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300' },
    { value: 'arkadas_canlisi', label: 'Arkadaş Canlısı', icon: Users, description: 'Samimi ve yakın', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300' },
    { value: 'konuskan', label: 'Konuşkan', icon: MessageCircle, description: 'Detaylı ve açıklayıcı', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300' },
    { value: 'ozel', label: 'Özel', icon: Settings, description: 'Kendi tarzınızı oluşturun', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300' }
  ];

  const handlePersonalityUpdate = (field: string, value: any) => {
    const newPersonalityData = { ...personalityData, [field]: value };
    setPersonalityData(newPersonalityData);
    onUpdate('personality', newPersonalityData);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          Çalışan Kişiliği
          {autoSaveStates.personality === 'saving' && (
            <Loader2 className="w-5 h-5 text-primary animate-spin ml-2" />
          )}
          {autoSaveStates.personality === 'success' && (
            <Check className="w-5 h-5 text-green-500 ml-2" />
          )}
        </CardTitle>
        <CardDescription className="text-base">
          Ton, stil ve iletişim tarzını belirleyin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personality Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Kişilik Türü</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personalityPresets.map((preset) => (
              <div
                key={preset.value}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${
                  personalityData.tone === preset.value ? preset.color : 'border-muted hover:border-primary/30'
                }`}
                onClick={() => handlePersonalityUpdate('tone', preset.value)}
                data-testid={`personality-${preset.value}`}
              >
                <div className="flex items-center space-x-3">
                  <preset.icon className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-sm opacity-80">{preset.description}</div>
                  </div>
                  {personalityData.tone === preset.value && (
                    <div className="w-2 h-2 bg-current rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Formality Level */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex justify-between">
              <span>Resmilik Düzeyi</span>
              <span className="text-xs text-muted-foreground">
                {personalityData.formality === 1 && 'Çok Samimi'}
                {personalityData.formality === 2 && 'Samimi'}
                {personalityData.formality === 3 && 'Dengeli'}
                {personalityData.formality === 4 && 'Resmi'}
                {personalityData.formality === 5 && 'Çok Resmi'}
              </span>
            </Label>
            <div className="px-3">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={personalityData.formality}
                onChange={(e) => handlePersonalityUpdate('formality', parseInt(e.target.value))}
                className="w-full"
                data-testid="slider-formality"
              />
            </div>
          </div>

          {/* Response Length */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Yanıt Uzunluğu</Label>
            <div className="flex space-x-2">
              {['kisa', 'orta', 'uzun'].map((length) => (
                <Button
                  key={length}
                  type="button"
                  variant={personalityData.responseLength === length ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePersonalityUpdate('responseLength', length)}
                  data-testid={`button-length-${length}`}
                  className="flex-1"
                >
                  {length === 'kisa' && 'Kısa'}
                  {length === 'orta' && 'Orta'}
                  {length === 'uzun' && 'Uzun'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Emoji Usage */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-sm font-medium">Emoji Kullanımı</Label>
            <p className="text-xs text-muted-foreground mt-1">Mesajlarda emoji kullanılsın mı?</p>
          </div>
          <Switch
            checked={personalityData.useEmojis}
            onCheckedChange={(checked) => handlePersonalityUpdate('useEmojis', checked)}
            data-testid="switch-emojis"
          />
        </div>

        {/* Custom Instructions for "Özel" */}
        {personalityData.tone === 'ozel' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Özel Talimatlar</Label>
            <Textarea
              placeholder="Dijital çalışanınızın nasıl davranmasını istediğinizi açıklayın..."
              className="min-h-[100px] resize-none"
              value={personalityData.customInstructions}
              onChange={(e) => {
                setPersonalityData(prev => ({ ...prev, customInstructions: e.target.value }));
              }}
              onBlur={(e) => handlePersonalityUpdate('customInstructions', e.target.value)}
              data-testid="textarea-custom-instructions"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Working Hours Card Component
const WorkingHoursCard: React.FC<{ agent: Agent | null; onUpdate: (field: string, value: any) => void; autoSaveStates: Record<string, 'idle' | 'saving' | 'success'> }> = ({ agent, onUpdate, autoSaveStates }) => {
  const getInitialWorkingHours = () => {
    if (agent?.workingHours && typeof agent.workingHours === 'object') {
      const wh = agent.workingHours as any;
      return {
        monday: { enabled: wh.monday?.enabled || false, start: wh.monday?.start || '09:00', end: wh.monday?.end || '18:00' },
        tuesday: { enabled: wh.tuesday?.enabled || false, start: wh.tuesday?.start || '09:00', end: wh.tuesday?.end || '18:00' },
        wednesday: { enabled: wh.wednesday?.enabled || false, start: wh.wednesday?.start || '09:00', end: wh.wednesday?.end || '18:00' },
        thursday: { enabled: wh.thursday?.enabled || false, start: wh.thursday?.start || '09:00', end: wh.thursday?.end || '18:00' },
        friday: { enabled: wh.friday?.enabled || false, start: wh.friday?.start || '09:00', end: wh.friday?.end || '18:00' },
        saturday: { enabled: wh.saturday?.enabled || false, start: wh.saturday?.start || '09:00', end: wh.saturday?.end || '18:00' },
        sunday: { enabled: wh.sunday?.enabled || false, start: wh.sunday?.start || '09:00', end: wh.sunday?.end || '18:00' },
        timezone: wh.timezone || 'Europe/Istanbul',
        holidays: wh.holidays || []
      };
    }
    return {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '18:00' },
      sunday: { enabled: false, start: '09:00', end: '18:00' },
      timezone: 'Europe/Istanbul',
      holidays: []
    };
  };

  const [workingHours, setWorkingHours] = useState(getInitialWorkingHours);

  useEffect(() => {
    setWorkingHours(getInitialWorkingHours());
  }, [agent]);

  const weekDays = [
    { key: 'monday', label: 'Pazartesi' },
    { key: 'tuesday', label: 'Salı' },
    { key: 'wednesday', label: 'Çarşamba' },
    { key: 'thursday', label: 'Perşembe' },
    { key: 'friday', label: 'Cuma' },
    { key: 'saturday', label: 'Cumartesi' },
    { key: 'sunday', label: 'Pazar' }
  ];

  const handleWorkingHoursUpdate = (dayKey: string, field: string, value: any) => {
    const newWorkingHours = {
      ...workingHours,
      [dayKey]: {
        ...workingHours[dayKey as keyof typeof workingHours],
        [field]: value
      }
    };
    setWorkingHours(newWorkingHours);
    onUpdate('workingHours', newWorkingHours);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          Çalışma Saatleri & Tatil Günleri
          {autoSaveStates.workingHours === 'saving' && (
            <Loader2 className="w-5 h-5 text-primary animate-spin ml-2" />
          )}
          {autoSaveStates.workingHours === 'success' && (
            <Check className="w-5 h-5 text-green-500 ml-2" />
          )}
        </CardTitle>
        <CardDescription className="text-base">
          Çalışanınızın aktif olduğu saatleri belirleyin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Working Days */}
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayData = workingHours[day.key as keyof typeof workingHours] as any;
            return (
              <div key={day.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Switch
                    checked={dayData.enabled}
                    onCheckedChange={(checked) => handleWorkingHoursUpdate(day.key, 'enabled', checked)}
                    data-testid={`switch-${day.key}`}
                  />
                  <Label className="text-sm font-medium min-w-[80px]">{day.label}</Label>
                </div>
                {dayData.enabled && (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={dayData.start}
                      onChange={(e) => handleWorkingHoursUpdate(day.key, 'start', e.target.value)}
                      className="w-24 h-8 text-xs"
                      data-testid={`time-start-${day.key}`}
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={dayData.end}
                      onChange={(e) => handleWorkingHoursUpdate(day.key, 'end', e.target.value)}
                      className="w-24 h-8 text-xs"
                      data-testid={`time-end-${day.key}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newHours = { ...workingHours };
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                (newHours[day as keyof typeof newHours] as any).enabled = true;
              });
              ['saturday', 'sunday'].forEach(day => {
                (newHours[day as keyof typeof newHours] as any).enabled = false;
              });
              setWorkingHours(newHours);
              onUpdate('workingHours', newHours);
            }}
            data-testid="button-weekdays-only"
          >
            Sadece Hafta İçi
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newHours = { ...workingHours };
              Object.keys(newHours).forEach(day => {
                if (day !== 'timezone' && day !== 'holidays') {
                  (newHours[day as keyof typeof newHours] as any).enabled = true;
                }
              });
              setWorkingHours(newHours);
              onUpdate('workingHours', newHours);
            }}
            data-testid="button-all-days"
          >
            Tüm Günler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Address & Contact Card Component
const AddressContactCard: React.FC<{ agent: Agent | null; onUpdate: (field: string, value: any) => void; autoSaveStates: Record<string, 'idle' | 'saving' | 'success'> }> = ({ agent, onUpdate, autoSaveStates }) => {
  const [contactInfo, setContactInfo] = useState({
    address: agent?.address || '',
    website: agent?.website || '',
    socialMedia: agent?.socialMedia || {}
  });

  useEffect(() => {
    setContactInfo({
      address: agent?.address || '',
      website: agent?.website || '',
      socialMedia: agent?.socialMedia || {}
    });
  }, [agent]);

  const handleContactUpdate = (field: string, value: any) => {
    const newContactInfo = { ...contactInfo, [field]: value };
    setContactInfo(newContactInfo);
    onUpdate(field, value);
  };

  const handleSocialMediaUpdate = (platform: string, value: string) => {
    const newSocialMedia = { ...contactInfo.socialMedia, [platform]: value };
    const newContactInfo = { ...contactInfo, socialMedia: newSocialMedia };
    setContactInfo(newContactInfo);
    onUpdate('socialMedia', newSocialMedia);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          Adres & İletişim Bilgileri
          {(autoSaveStates.address === 'saving' || autoSaveStates.website === 'saving' || autoSaveStates.socialMedia === 'saving') && (
            <Loader2 className="w-5 h-5 text-primary animate-spin ml-2" />
          )}
          {(autoSaveStates.address === 'success' || autoSaveStates.website === 'success' || autoSaveStates.socialMedia === 'success') && (
            <Check className="w-5 h-5 text-green-500 ml-2" />
          )}
        </CardTitle>
        <CardDescription className="text-base">
          İşletmenizin konum ve iletişim bilgilerini ekleyin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Address */}
        <div className="space-y-3">
          <Label htmlFor="business-address" className="text-sm font-medium">İşletme Adresi</Label>
          <div className="relative">
            <Textarea
              id="business-address"
              value={contactInfo.address}
              onChange={(e) => setContactInfo(prev => ({ ...prev, address: e.target.value }))}
              onBlur={(e) => handleContactUpdate('address', e.target.value)}
              placeholder="Örn: Konak Mah. Cumhuriyet Cad. No:123 Konak/İzmir"
              className="min-h-[80px] resize-none pr-12"
              data-testid="textarea-address"
            />
            <AutoSaveIndicator fieldId="address" autoSaveStates={autoSaveStates} />
          </div>
        </div>

        {/* Website */}
        <div className="space-y-3">
          <Label htmlFor="business-website" className="text-sm font-medium">Website</Label>
          <div className="relative">
            <Input
              id="business-website"
              value={contactInfo.website}
              onChange={(e) => setContactInfo(prev => ({ ...prev, website: e.target.value }))}
              onBlur={(e) => handleContactUpdate('website', e.target.value)}
              placeholder="https://www.ornek.com"
              className="pr-12"
              data-testid="input-website"
            />
            <AutoSaveIndicator fieldId="website" autoSaveStates={autoSaveStates} />
          </div>
        </div>

        {/* Social Media */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Sosyal Medya Hesapları</Label>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { key: 'instagram', label: 'Instagram', placeholder: '@ornek_hesap', icon: '📷' },
              { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/ornek', icon: '📘' },
              { key: 'twitter', label: 'Twitter', placeholder: '@ornek_hesap', icon: '🐦' },
              { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/ornek', icon: '💼' }
            ].map((social) => (
              <div key={social.key} className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <span>{social.icon}</span>
                  {social.label}
                </Label>
                <Input
                  value={(contactInfo.socialMedia as any)?.[social.key] || ''}
                  onChange={(e) => handleSocialMediaUpdate(social.key, e.target.value)}
                  placeholder={social.placeholder}
                  className="text-sm"
                  data-testid={`input-social-${social.key}`}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// FAQ Card Component
const FaqCard: React.FC<{ agent: Agent | null; onUpdate: (field: string, value: any) => void; autoSaveStates: Record<string, 'idle' | 'saving' | 'success'> }> = ({ agent, onUpdate, autoSaveStates }) => {
  const [faqList, setFaqList] = useState<Array<{question: string, answer: string}>>([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  
  useEffect(() => {
    if (agent?.faq && Array.isArray(agent.faq)) {
      setFaqList(agent.faq);
    } else {
      setFaqList([]);
    }
  }, [agent]);

  const addFaq = () => {
    if (newFaq.question.trim() && newFaq.answer.trim()) {
      const updatedList = [...faqList, { ...newFaq }];
      setFaqList(updatedList);
      onUpdate('faq', updatedList);
      setNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (index: number) => {
    const updatedList = faqList.filter((_, i) => i !== index);
    setFaqList(updatedList);
    onUpdate('faq', updatedList);
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updatedList = faqList.map((faq, i) => 
      i === index ? { ...faq, [field]: value } : faq
    );
    setFaqList(updatedList);
    onUpdate('faq', updatedList);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          FAQ
          {autoSaveStates.faq === 'saving' && (
            <Loader2 className="w-5 h-5 text-primary animate-spin ml-2" />
          )}
          {autoSaveStates.faq === 'success' && (
            <Check className="w-5 h-5 text-green-500 ml-2" />
          )}
        </CardTitle>
        <CardDescription className="text-base">
          Sık sorulan soruları ve cevaplarını yönetin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing FAQs */}
        {faqList.length > 0 && (
          <div className="space-y-4">
            {faqList.map((faq, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={faq.question}
                      onChange={(e) => updateFaq(index, 'question', e.target.value)}
                      placeholder="Soru"
                      className="font-medium"
                      data-testid={`input-faq-question-${index}`}
                    />
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                      placeholder="Cevap"
                      className="min-h-[60px] resize-none"
                      data-testid={`textarea-faq-answer-${index}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFaq(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                    data-testid={`button-remove-faq-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New FAQ */}
        <div className="p-4 border-2 border-dashed border-muted rounded-lg space-y-3">
          <Input
            value={newFaq.question}
            onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
            placeholder="Yeni soru ekleyin..."
            data-testid="input-new-faq-question"
          />
          <Textarea
            value={newFaq.answer}
            onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
            placeholder="Cevabı yazın..."
            className="min-h-[80px] resize-none"
            data-testid="textarea-new-faq-answer"
          />
          <Button
            type="button"
            onClick={addFaq}
            disabled={!newFaq.question.trim() || !newFaq.answer.trim()}
            className="w-full"
            data-testid="button-add-faq"
          >
            <Plus className="w-4 h-4 mr-2" />
            FAQ Ekle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Products & Services Card Component
const ProductsServicesCard: React.FC<{ agent: Agent | null; onUpdate: (field: string, value: any) => void; autoSaveStates: Record<string, 'idle' | 'saving' | 'success'> }> = ({ agent, onUpdate, autoSaveStates }) => {
  const [productsText, setProductsText] = useState('');

  useEffect(() => {
    setProductsText(agent?.products || '');
  }, [agent]);

  const handleProductsUpdate = (value: string) => {
    setProductsText(value);
    onUpdate('products', value);
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          Ürün/Hizmet Açıklaması
          {autoSaveStates.products === 'saving' && (
            <Loader2 className="w-5 h-5 text-primary animate-spin ml-2" />
          )}
          {autoSaveStates.products === 'success' && (
            <Check className="w-5 h-5 text-green-500 ml-2" />
          )}
        </CardTitle>
        <CardDescription className="text-base">
          Sunduğunuz ürün ve hizmetleri tanıtın
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Products Description */}
        <div className="space-y-3">
          <Label htmlFor="products-description" className="text-sm font-medium">Ürün ve Hizmetleriniz</Label>
          <div className="relative">
            <Textarea
              id="products-description"
              value={productsText}
              onChange={(e) => setProductsText(e.target.value)}
              onBlur={(e) => handleProductsUpdate(e.target.value)}
              placeholder="Sunduğunuz ürün ve hizmetleri detaylı bir şekilde açıklayın...\n\nÖrnek:\n• Kahve çeşitleri (Americano, Latte, Cappuccino)\n• Taze pişmiş hamur işleri\n• Özel kahve karışımları\n• Oturma alanları ve WiFi"
              className="min-h-[200px] resize-none pr-12"
              data-testid="textarea-products"
            />
            <AutoSaveIndicator fieldId="products" autoSaveStates={autoSaveStates} />
          </div>
          <p className="text-xs text-muted-foreground">
            Bu bilgiler çalışanınızın müşterilere ürün ve hizmetleriniz hakkında doğru bilgi vermesini sağlar.
          </p>
        </div>

        {/* Quick Templates */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Hızlı Şablonlar</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              {
                label: 'Restoran',
                template: '• Ana yemekler ve mezeler\n• İçecek çeşitleri\n• Özel menüler ve kampanyalar\n• Rezervasyon imkanları'
              },
              {
                label: 'Mağaza',
                template: '• Ürün kategorileri\n• Marka çeşitliliği\n• Fiyat aralıkları\n• Özel indirimler'
              },
              {
                label: 'Hizmet',
                template: '• Sunulan hizmet türleri\n• Uzman kadro\n• Çalışma saatleri\n• Randevu sistemi'
              },
              {
                label: 'E-ticaret',
                template: '• Kargo seçenekleri\n• Ödeme yöntemleri\n• İade politikası\n• Müşteri desteği'
              }
            ].map((template) => (
              <Button
                key={template.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newText = productsText ? `${productsText}\n\n${template.template}` : template.template;
                  setProductsText(newText);
                  handleProductsUpdate(newText);
                }}
                data-testid={`button-template-${template.label.toLowerCase()}`}
                className="justify-start h-auto p-3"
              >
                <div className="text-left">
                  <div className="font-medium">{template.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">Şablon ekle</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Embed & API Card Component
const EmbedApiCard: React.FC<{ agent: Agent | null }> = ({ agent }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const embedCode = agent ? `<script src="https://nonplo.com/embed/agent/${agent.id}"></script>
<div id="nonplo-chat-widget"></div>` : '';

  const apiEndpoint = agent ? `https://api.nonplo.com/v1/chat/${agent.id}` : '';

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Code className="w-5 h-5 text-primary" />
          </div>
          Gömme & API
        </CardTitle>
        <CardDescription className="text-base">
          Çalışanınızı web sitenize entegre edin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {agent ? (
          <>
            {/* Embed Code */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Web Sitesi Gömme Kodu</Label>
                <Badge variant="secondary" className="text-xs">HTML</Badge>
              </div>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto border">
                  <code>{embedCode}</code>
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(embedCode, 'embed')}
                  className="absolute top-2 right-2"
                  data-testid="button-copy-embed"
                >
                  {copied === 'embed' ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 mr-1" />
                      Kopyala
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu kodu web sitenizin &lt;body&gt; etiketi içine yapıştırın. Chat widget'ı sayfanızın sağ alt köşesinde görünecektir.
              </p>
            </div>

            {/* API Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">API Endpoint</Label>
                <Badge variant="secondary" className="text-xs">REST API</Badge>
              </div>
              <div className="relative">
                <Input
                  value={apiEndpoint}
                  readOnly
                  className="pr-20 font-mono text-xs"
                  data-testid="input-api-endpoint"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(apiEndpoint, 'api')}
                  className="absolute top-1 right-1 h-8"
                  data-testid="button-copy-api"
                >
                  {copied === 'api' ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 mr-1" />
                      Kopyala
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                POST isteği ile mesaj gönderebilir, çalışanınızla programatik olarak etkileşime geçebilirsiniz.
              </p>
            </div>

            {/* Quick Setup Guide */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Hızlı Kurulum</h4>
                  <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Yukarıdaki HTML kodunu kopyalayın</li>
                    <li>Web sitenizin &lt;body&gt; etiketi içine yapıştırın</li>
                    <li>Sayfayı yenileyin ve chat widget'ını test edin</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Documentation Link */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm font-medium">Detaylı Dokümantasyon</div>
                <div className="text-xs text-muted-foreground">API kullanımı ve örnekler için rehberi inceleyin</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                data-testid="button-docs"
              >
                <Link to="/docs" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Dokümantasyon
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Agent bilgileri yükleniyor...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function DashboardAgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get tab from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab') || 'overview';

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyMessageCounts, setDailyMessageCounts] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [averageResponseTime, setAverageResponseTime] = useState<number>(0);
  const [responseTimeLoading, setResponseTimeLoading] = useState(false);

  // Header actions state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Per-agent toggles with persistent storage
  const [globalConnections, setGlobalConnections] = useState<Record<string, boolean>>({});
  const [agentProviderEnabled, setAgentProviderEnabled] = useState<Record<string, boolean>>({});
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  
  // Phase 3: Google Calendar tool activation states
  const [toolActivationLoading, setToolActivationLoading] = useState(false);
  const [googleCalendarToolActivated, setGoogleCalendarToolActivated] = useState(false);

  // Calendar connection status and management
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean;
    email?: string;
    connectedAt?: string;
  }>({ connected: false });
  const [calendarStatusLoading, setCalendarStatusLoading] = useState(false);
  const [calendarDisconnecting, setCalendarDisconnecting] = useState(false);

  // Web Search states
  const [webSearchQuery, setWebSearchQuery] = useState<string>("");
  const [webSearchTesting, setWebSearchTesting] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState<any>(null);
  const [webSearchError, setWebSearchError] = useState<string>("");

  // Settings form state
  const [agentRole, setAgentRole] = useState<string>("");
  const [maxResponseLength, setMaxResponseLength] = useState<string>("");
  const [backupMessage, setBackupMessage] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [redirectRules, setRedirectRules] = useState<string>("");
  const [personalDataMasking, setPersonalDataMasking] = useState<string>("");
  const [autoSaving, setAutoSaving] = useState(false);
  
  // Debounced save timer
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forbidden words state
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [loadingForbiddenWords, setLoadingForbiddenWords] = useState(false);
  const [savingForbiddenWords, setSavingForbiddenWords] = useState(false);

  // Temperature control
  const [temperature, setTemperature] = useState<string>("1.0");
  const [temperatureLoading, setTemperatureLoading] = useState(false);

  // Auto-save system states
  const [autoSaveStates, setAutoSaveStates] = useState<Record<string, 'idle' | 'saving' | 'success'>>({});
  const [autoSaveTimeouts, setAutoSaveTimeouts] = useState<Record<string, NodeJS.Timeout>>({});

  // Recent conversations state
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);

  // Tab indicator animation function - now for 4 tabs
  const updateIndicatorPosition = (tabIndex: number) => {
    const indicator = document.getElementById('sliding-indicator');
    const tabTriggers = document.querySelectorAll('[data-tab-index]');
    
    if (indicator && tabTriggers.length > 0) {
      const targetTab = tabTriggers[tabIndex] as HTMLElement;
      if (targetTab) {
        const container = targetTab.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const tabRect = targetTab.getBoundingClientRect();
          
          // Calculate position relative to container
          const offsetLeft = tabRect.left - containerRect.left;
          const tabWidth = tabRect.width;
          
          // Update indicator position and width
          indicator.style.transform = `translateX(${offsetLeft}px)`;
          indicator.style.width = `${tabWidth}px`;
        }
      }
    }
  };

  useEffect(() => {
    document.title = agent ? `${agent.name} – Dijital Çalışan | Dashboard` : "Dijital Çalışan – Dashboard";
  }, [agent]);

  // Update indicator position when tab changes via URL
  useEffect(() => {
    const tabValueToIndex: Record<string, number> = {
      'overview': 0,
      'integrations': 1,
      'settings': 2,
      'chat': 3
    };
    
    const tabIndex = tabValueToIndex[tabFromUrl] || 0;
    
    // Scroll to top when tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Use double requestAnimationFrame and small delay to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          updateIndicatorPosition(tabIndex);
        }, 50);
      });
    });
  }, [tabFromUrl]);

  // Initialize indicator position and listen for tab changes
  useLayoutEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Set initial indicator position based on current tab
    const setInitialPosition = () => {
      const tabValueToIndex: Record<string, number> = {
        'overview': 0,
        'integrations': 1,
        'settings': 2,
        'chat': 3
      };
      
      const tabIndex = tabValueToIndex[tabFromUrl] || 0;
      updateIndicatorPosition(tabIndex);
      return true;
    };
    
    // Try immediately
    if (!setInitialPosition()) {
      // Try with requestAnimationFrame
      requestAnimationFrame(() => {
        if (!setInitialPosition()) {
          // Try with short delay as fallback
          timer = setTimeout(() => {
            setInitialPosition();
          }, 100);
        }
      });
    }
    
    // Listen for tab value changes via data attributes or URL params
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('data-state') === 'active') {
            const tabIndex = parseInt(target.getAttribute('data-tab-index') || '0');
            updateIndicatorPosition(tabIndex);
          }
        }
      });
    });

    // Handle window resize to recalculate positions
    const handleResize = () => {
      const activeTab = document.querySelector('[data-state="active"][data-tab-index]') as HTMLElement;
      if (activeTab) {
        const tabIndex = parseInt(activeTab.getAttribute('data-tab-index') || '0');
        updateIndicatorPosition(tabIndex);
      }
    };

    window.addEventListener('resize', handleResize);

    // Observe all tab triggers for state changes
    const tabTriggers = document.querySelectorAll('[data-tab-index]');
    tabTriggers.forEach(trigger => {
      observer.observe(trigger, { attributes: true, attributeFilter: ['data-state'] });
    });

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [agent]); // Re-run when agent changes

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }
        setUserId(user.id);
        await Promise.all([fetchAgent(user.id), fetchGlobalConnections(user.id), fetchRecentConversations(user.id), fetchResponseTime(user.id), fetchCalendarStatus(user.id)]);
        
        // Load agent tool settings directly here
        console.log('🔄 Loading tool settings directly in useEffect...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token && agentId) {
            console.log('📡 Making direct API call for tool settings...');
            const response = await fetch(`/api/agents/${agentId}/tool-settings`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (response.ok) {
              const settings = await response.json();
              console.log('✅ Tool settings loaded directly:', settings);
              console.log('🔍 Checking for google-calendar key:', settings['google-calendar']);
              console.log('🔍 All settings keys:', Object.keys(settings));
              
              setAgentProviderEnabled(settings);
              
              // Also update Google Calendar tool activation state
              if (settings['google_calendar']) {
                setGoogleCalendarToolActivated(true);
                console.log('✅ Google Calendar tool state updated to active');
              } else {
                setGoogleCalendarToolActivated(false);
                console.log('❌ Google Calendar tool state set to inactive - key not found or false');
              }
            } else {
              console.error('❌ Tool settings API failed:', response.status);
            }
          }
        } catch (error) {
          console.error('❌ Tool settings error:', error);
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Hata", description: "Dijital çalışan yüklenemedi.", variant: "destructive" });
        navigate("/dashboard/agents");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Initialize form state when agent data is loaded
  useEffect(() => {
    if (agent) {
      setNewName(agent.name || "");
      setAgentRole(agent.role || "");
      setTemperature(agent.temperature || "1.0");
      // Initialize other form fields with existing data or empty strings
      setMaxResponseLength("");
      setBackupMessage("");
      setLanguage("");
      setRedirectRules("");
      setPersonalDataMasking("");
    }
  }, [agent]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load forbidden words
  const loadForbiddenWords = async () => {
    if (!userId) return;
    
    setLoadingForbiddenWords(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/tools/forbidden-words', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setForbiddenWords(data.words || []);
      }
    } catch (error) {
      console.error('Error loading forbidden words:', error);
    } finally {
      setLoadingForbiddenWords(false);
    }
  };

  // Save forbidden words
  const saveForbiddenWords = async (newWords: string[]) => {
    if (!userId) return;
    
    setSavingForbiddenWords(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/tools/forbidden-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ words: newWords }),
      });

      if (response.ok) {
        const result = await response.json();
        setForbiddenWords(newWords);
        toast({
          title: "Güncellendi",
          description: `${newWords.length} yasaklı kelime kaydedildi.`,
        });
      } else {
        throw new Error('Failed to save forbidden words');
      }
    } catch (error) {
      console.error('Error saving forbidden words:', error);
      toast({
        title: "Hata",
        description: "Yasaklı kelimeler kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setSavingForbiddenWords(false);
    }
  };

  // Load forbidden words when userId is available
  useEffect(() => {
    if (userId) {
      loadForbiddenWords();
    }
  }, [userId]);

  const fetchAgent = async (uid: string) => {
    if (!agentId) return;
    
    console.log('Agent Detail - Fetching agent:', { agentId, userId: uid });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      
      const response = await fetch(`/api/agents/${agentId}?userId=${uid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast({ title: "Bulunamadı", description: "Dijital Çalışan bulunamadı.", variant: "destructive" });
          navigate("/dashboard/agents");
          return;
        }
        throw new Error('Failed to fetch agent');
      }

      const data = await response.json();
      
      // Map the data to match the expected interface
      const mappedAgent = {
        id: data.id,
        name: data.name,
        role: data.role,
        is_active: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString(),
        openaiAssistantId: data.openaiAssistantId,
        temperature: data.temperature || "1.0",
      };
      
      setAgent(mappedAgent as Agent);
      setNewName(mappedAgent.name);
      setTemperature(mappedAgent.temperature);
    } catch (error) {
      console.error('Error fetching agent:', error);
      throw error;
    }
  };

  // Load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender,content,attachments,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      
      if (!error && data) {
        setConversationMessages(data);
      }
    } catch (error) {
      console.error("Error loading conversation messages:", error);
    }
  };

  const handleConversationClick = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await loadConversationMessages(conversation.id);
  };

  const fetchRecentConversations = async (uid: string) => {
    if (!agentId) return;
    
    setConversationsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      const response = await fetch(`/api/agents/${agentId}/conversations?limit=5`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch conversations");
      const conversations = await response.json();
      setRecentConversations(conversations);
      
      // Also fetch daily message counts for the chart
      await fetchDailyMessageCounts(uid);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchDailyMessageCounts = async (uid: string) => {
    if (!agentId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      // Use the new API endpoint for daily message counts
      const response = await fetch(`/api/agents/${agentId}/daily-message-counts`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) return;
      const data = await response.json();
      
      setDailyMessageCounts(data.dailyMessageCounts || [0, 0, 0, 0, 0, 0, 0]);
    } catch (error) {
      console.error("Error fetching daily message counts:", error);
      // Keep default values on error
      setDailyMessageCounts([0, 0, 0, 0, 0, 0, 0]);
    }
  };

  const fetchResponseTime = async (uid: string) => {
    if (!agentId) return;
    
    setResponseTimeLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      const response = await fetch(`/api/agents/${agentId}/response-time?userId=${uid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) return;
      const data = await response.json();
      
      setAverageResponseTime(data.averageResponseTimeMs || 0);
    } catch (error) {
      console.error("Error fetching response time:", error);
      setAverageResponseTime(0);
    } finally {
      setResponseTimeLoading(false);
    }
  };

  const fetchGlobalConnections = async (uid: string) => {
    setIntegrationsLoading(true);
    const { data, error } = await supabase
      .from("integrations_connections")
      .select("provider,status")
      .eq("user_id", uid);
    if (error) {
      console.error(error);
      setIntegrationsLoading(false);
      return;
    }
    const map: Record<string, boolean> = {};
    (data as IntegrationConn[] | null)?.forEach((r) => { map[r.provider] = r.status === "connected"; });
    setGlobalConnections(map);
    setIntegrationsLoading(false);
  };

  const formatDate = (s?: string) => s ? new Date(s).toLocaleString() : "-";

  // Calendar status management functions
  const fetchCalendarStatus = async (uid: string) => {
    if (!agentId) return;
    
    setCalendarStatusLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/calendar/status?userId=${uid}&agentId=${agentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    } finally {
      setCalendarStatusLoading(false);
    }
  };

  const disconnectCalendar = async () => {
    if (!userId || !agentId || calendarDisconnecting) return;
    
    setCalendarDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId,
          agentId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCalendarStatus({ connected: false });
        setGlobalConnections(prev => ({ ...prev, google_calendar: false }));
        setAgentProviderEnabled(prev => ({ ...prev, google_calendar: false }));
        setGoogleCalendarToolActivated(false);
        
        toast({
          title: "Bağlantı Kesildi",
          description: "Google Calendar bağlantısı başarıyla kesildi.",
        });
      } else {
        throw new Error(data.error || 'Failed to disconnect calendar');
      }
    } catch (error: any) {
      console.error('Calendar disconnect error:', error);
      toast({
        title: "Bağlantı Kesilemedi",
        description: error.message || "Google Calendar bağlantısı kesilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setCalendarDisconnecting(false);
    }
  };

  const initiateCalendarConnection = async () => {
    if (!userId || !agentId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/calendar/auth/url?userId=${userId}&agentId=${agentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }
    } catch (error: any) {
      console.error('Calendar connection initiation error:', error);
      toast({
        title: "Bağlantı Başlatılamadı",
        description: error.message || "Google Calendar bağlantısı başlatılamadı. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    }
  };

  // Auto-save handler
  const handleAutoSave = async (field: string, value: any) => {
    if (!agent || !userId) return;
    
    // Set saving state
    setAutoSaveStates(prev => ({ ...prev, [field]: 'saving' }));
    
    // Clear any existing timeout for this field
    if (autoSaveTimeouts[field]) {
      clearTimeout(autoSaveTimeouts[field]);
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      
      let endpoint = '';
      let payload = {};
      
      // Determine endpoint and payload based on field
      switch (field) {
        case 'name':
        case 'role':
          endpoint = `/api/agents/${agent.id}`;
          payload = { [field]: value };
          break;
        case 'personality':
          endpoint = `/api/agents/${agent.id}/personality`;
          payload = { personality: value };
          break;
        case 'workingHours':
          endpoint = `/api/agents/${agent.id}/working-hours`;
          payload = { workingHours: value };
          break;
        case 'address':
        case 'website':
        case 'socialMedia':
          endpoint = `/api/agents/${agent.id}/contact-info`;
          payload = { [field]: value };
          break;
        case 'faq':
          endpoint = `/api/agents/${agent.id}/faq`;
          payload = { faq: value };
          break;
        case 'products':
          endpoint = `/api/agents/${agent.id}/products-services`;
          payload = { products: value };
          break;
        default:
          throw new Error(`Unknown field: ${field}`);
      }
      
      // Determine HTTP method based on field
      const method = (field === 'name' || field === 'role') ? 'PUT' : 'PATCH';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }
      
      // Update local state for all fields
      if (field === 'name') {
        setAgent(prev => prev ? { ...prev, name: value } : null);
        setNewName(value);
      } else if (field === 'role') {
        setAgent(prev => prev ? { ...prev, role: value } : null);
        setAgentRole(value);
      } else if (field === 'personality') {
        setAgent(prev => prev ? { ...prev, personality: value } : null);
      } else if (field === 'workingHours') {
        setAgent(prev => prev ? { ...prev, workingHours: value } : null);
      } else if (field === 'address') {
        setAgent(prev => prev ? { ...prev, address: value } : null);
      } else if (field === 'website') {
        setAgent(prev => prev ? { ...prev, website: value } : null);
      } else if (field === 'socialMedia') {
        setAgent(prev => prev ? { ...prev, socialMedia: value } : null);
      } else if (field === 'faq') {
        setAgent(prev => prev ? { ...prev, faq: value } : null);
      } else if (field === 'products') {
        setAgent(prev => prev ? { ...prev, products: value } : null);
      }
      
      // Set success state
      setAutoSaveStates(prev => ({ ...prev, [field]: 'success' }));
      
      // Clear success state after 2 seconds
      const timeout = setTimeout(() => {
        setAutoSaveStates(prev => ({ ...prev, [field]: 'idle' }));
        setAutoSaveTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[field];
          return newTimeouts;
        });
      }, 2000);
      
      setAutoSaveTimeouts(prev => ({ ...prev, [field]: timeout }));
      
    } catch (error: any) {
      console.error('Auto-save error:', error);
      setAutoSaveStates(prev => ({ ...prev, [field]: 'idle' }));
      toast({
        title: "Kayıt hatası",
        description: error.message || "Değişiklikler kaydedilemedi.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    if (!agent || !userId) return;
    const prev = agent.is_active;
    setAgent({ ...agent, is_active: checked });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      
      console.log(`🔄 Agent Detail Toggle - Agent ID: ${agent.id}, New Status: ${checked}`);
      
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId,
          isActive: checked,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }
      
      const updatedAgent = await response.json();
      console.log(`✅ Agent Detail Toggle Success - Updated status: ${updatedAgent.is_active}`);
      
      toast({ 
        title: "Başarılı", 
        description: `Agent ${checked ? 'aktif' : 'pasif'} duruma getirildi.` 
      });
    } catch (error) {
      console.error('Agent detail toggle error:', error);
      setAgent({ ...agent, is_active: prev });
      toast({ 
        title: "Hata", 
        description: "Agent durumu güncellenemedi.", 
        variant: "destructive" 
      });
      return;
    }
  };

  const handleDelete = async () => {
    if (!agent || !userId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
      
      toast({ title: "Agent deleted", description: "Agent deleted successfully." });
      navigate("/dashboard/agents");
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({ title: "Delete failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleRename = async () => {
    if (!agent || !newName.trim() || !userId) return;
    const old = agent.name;
    setAgent({ ...agent, name: newName.trim() });
    
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          name: newName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename agent');
      }
      
      toast({ title: "Renamed", description: "Agent name updated successfully." });
      setRenameOpen(false);
    } catch (error) {
      console.error('Error renaming agent:', error);
      setAgent({ ...agent, name: old });
      toast({ title: "Rename failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleTemperatureUpdate = async (newTemperature: string) => {
    if (!agent || !userId) return;
    
    // Validate temperature value
    const tempValue = parseFloat(newTemperature);
    if (isNaN(tempValue) || tempValue < 0 || tempValue > 2) {
      toast({ 
        title: "Geçersiz Değer", 
        description: "Yaratıcılık değeri 0.0 ile 2.0 arasında olmalıdır.", 
        variant: "destructive" 
      });
      return;
    }

    const oldTemperature = agent.temperature || "1.0";
    setTemperatureLoading(true);
    setAgent({ ...agent, temperature: newTemperature });
    setTemperature(newTemperature);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/agents/${agent.id}/temperature`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          temperature: newTemperature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update temperature');
      }
      
      const result = await response.json();
      toast({ 
        title: "Güncellendi", 
        description: result.message || "Yaratıcılık seviyesi başarıyla güncellendi." 
      });
      
    } catch (error) {
      console.error('Error updating temperature:', error);
      setAgent({ ...agent, temperature: oldTemperature });
      setTemperature(oldTemperature);
      toast({ 
        title: "Güncelleme Başarısız", 
        description: "Lütfen tekrar deneyin.", 
        variant: "destructive" 
      });
    } finally {
      setTemperatureLoading(false);
    }
  };

  // Auto-save agent settings with debouncing
  const debouncedAutoSave = useCallback(async (fieldName: string, value: string) => {
    if (!agent || !userId) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No authentication token');
        }

        const updateData: any = {};
        if (fieldName === 'name') updateData.name = value;
        else if (fieldName === 'role') updateData.role = value;
        // Add support for other fields when backend is ready
        // else if (fieldName === 'maxResponseLength') updateData.maxResponseLength = value;
        // else if (fieldName === 'backupMessage') updateData.backupMessage = value;
        // else if (fieldName === 'language') updateData.language = value;
        
        const response = await fetch(`/api/agents/${agent.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: userId,
            ...updateData
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to auto-save agent settings');
        }
        
        // Update local agent state using functional updates to avoid stale state
        if (fieldName === 'name') {
          setAgent(prev => prev ? { ...prev, name: value } : null);
        } else if (fieldName === 'role') {
          setAgent(prev => prev ? { ...prev, role: value } : null);
        }
        
      } catch (error) {
        console.error('Auto-save error:', error);
        toast({ 
          title: "Kaydetme hatası", 
          description: "Ayarlar kaydedilemedi, lütfen tekrar deneyin.", 
          variant: "destructive" 
        });
      } finally {
        setAutoSaving(false);
      }
    }, 200); // 200ms debounce for faster response
  }, [agent?.id, userId, toast]);

  const handleExport = () => {
    if (!agent) return;
    const exportObj = {
      agent,
      knowledge: {},
      settings: {},
      integrations: agentProviderEnabled,
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-config-${agent.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onToggleAgentProvider = async (providerKey: string, enabled: boolean) => {
    console.log('🔄 Toggle provider:', { providerKey, enabled, agentId, userId });
    
    // Validation: require global connection first
    if (!globalConnections[providerKey] && enabled) {
      toast({ title: "Önce global bağlantı yapın", description: "Kanallar'ı açarak bağlanın.", variant: "destructive" });
      return;
    }
    
    setIntegrationsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      console.log('📡 Sending POST to tool-settings:', {
        toolKey: providerKey,
        enabled: enabled,
        url: `/api/agents/${agentId}/tool-settings`
      });

      const response = await fetch(`/api/agents/${agentId}/tool-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          toolKey: providerKey,
          enabled: enabled
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error('Failed to save setting');
      }

      const result = await response.json();
      console.log('✅ Tool setting saved:', result);

      setAgentProviderEnabled((prev) => ({ ...prev, [providerKey]: enabled }));
      toast({ title: "Kaydedildi", description: "Ajana özel ayar güncellendi." });
    } catch (error: any) {
      console.error('❌ Error saving agent provider setting:', error);
      toast({ 
        title: "Kaydetme Hatası", 
        description: "Ayar kaydedilemedi, tekrar deneyin.", 
        variant: "destructive" 
      });
    } finally {
      setIntegrationsLoading(false);
    }
  };
  
  // Load agent-specific tool settings
  const loadAgentToolSettings = async () => {
    const currentUserId = userId;
    const currentAgentId = agentId;
    console.log('🔄 Loading agent tool settings...', { currentUserId, currentAgentId });
    
    if (!currentUserId || !currentAgentId) {
      console.log('❌ Missing userId or agentId:', { currentUserId, currentAgentId });
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('❌ No session token');
        return;
      }

      console.log('📡 Fetching agent tool settings...');
      const response = await fetch(`/api/agents/${currentAgentId}/tool-settings`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const settings = await response.json();
        console.log('✅ Agent tool settings loaded:', settings);
        setAgentProviderEnabled(settings);
      } else {
        console.error('❌ Failed to load settings:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading agent tool settings:', error);
    }
  };

  // Phase 3: Manual Google Calendar tool activation function
  const activateGoogleCalendarTool = async () => {
    if (!agentId || !userId || toolActivationLoading) return;
    
    setToolActivationLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }
      
      const response = await fetch(`/api/agents/${agentId}/activate-google-calendar-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGoogleCalendarToolActivated(true);
        toast({
          title: "Google Calendar Aracı Etkinleştirildi!",
          description: "Google Calendar araçları artık ajanınızın playbook'unda aktif.",
        });
      } else {
        throw new Error(data.error || 'Failed to activate Google Calendar tool');
      }
    } catch (error: any) {
      console.error('Google Calendar tool activation error:', error);
      toast({
        title: "Etkinleştirme Başarısız",
        description: error.message || "Google Calendar aracı etkinleştirilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setToolActivationLoading(false);
    }
  };

  // Web Search test function
  const testWebSearch = async () => {
    if (!agentId || !userId || !webSearchQuery.trim() || webSearchTesting) return;

    setWebSearchTesting(true);
    setWebSearchError("");
    setWebSearchResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Oturum bulunamadı');
      }

      const response = await fetch(`/api/agents/${agentId}/web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: webSearchQuery.trim(),
          maxResults: 5,
          language: 'tr'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Web arama başarısız`);
      }

      setWebSearchResults(data);
      toast({
        title: "🔍 Web Arama Başarılı",
        description: `${data.totalResults} sonuç bulundu (${data.searchTime}ms)`,
      });

    } catch (error: any) {
      console.error('❌ Web search test error:', error);
      setWebSearchError(error.message || 'Web arama sırasında bir hata oluştu');
      toast({
        title: "❌ Web Arama Hatası",
        description: error.message || 'Web arama test edilemedi',
        variant: "destructive",
      });
    } finally {
      setWebSearchTesting(false);
    }
  };

  const headerBadges = useMemo(() => (
    <div className="flex flex-wrap gap-2 text-sm">
      <Badge variant="secondary">Oluşturuldu: {formatDate(agent?.created_at)}</Badge>
      <Badge variant="secondary">Güncellendi: {formatDate(agent?.updated_at)}</Badge>
      {agent?.id && <Badge variant="outline">ID: {agent.id}</Badge>}
    </div>
  ), [agent]);

  // Auto-save states for different sections
  const [personalityData, setPersonalityData] = useState({
    speakingStyle: 'friendly',
    personalityDescription: ''
  });
  const [businessData, setBusinessData] = useState({
    workingHours: { weekdayStart: '09:00', weekdayEnd: '18:00', weekendStart: '10:00', weekendEnd: '16:00' },
    holidays: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    social: '',
    faq: '',
    products: '',
    category: '',
    target: ''
  });
  const [autoSaveLoading, setAutoSaveLoading] = useState<Record<string, boolean>>({});


  // Local Settings Components
  const PersonalitySettingsCard = ({ temperature, setTemperature, handleTemperatureUpdate, temperatureLoading }: {temperature: number, setTemperature: (temp: number) => void, handleTemperatureUpdate: (temp: number) => void, temperatureLoading: boolean}) => (
    <Card>
      <CardHeader>
        <CardTitle>Kişilik Ayarları</CardTitle>
        <CardDescription>Çalışanın konuşma tarzı ve karakteri</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Yaratıcılık Seviyesi</Label>
          <div className="relative">
            <Input 
              type="number" 
              step="0.1" 
              min="0" 
              max="2" 
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              onBlur={() => {
                if (temperature !== (agent?.temperature || 1.0)) {
                  handleTemperatureUpdate(temperature);
                }
              }}
              disabled={temperatureLoading}
              placeholder="1.0" 
              data-testid="input-creativity"
            />
            {temperatureLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Düşük (0.0-1.0): Tutarlı • Yüksek (1.0-2.0): Yaratıcı
          </div>
        </div>
        <div>
          <Label>Konuşma Tarzı</Label>
          <div className="relative">
            <select 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="select-speaking-style"
              value={personalityData.speakingStyle}
              onChange={(e) => {
                const newStyle = e.target.value;
                setPersonalityData(prev => ({ ...prev, speakingStyle: newStyle }));
                handleAutoSave('personality', { ...agent?.personality, tone: newStyle });
              }}
            >
              <option value="friendly">Samimi ve Arkadaşça</option>
              <option value="professional">Profesyonel</option>
              <option value="formal">Resmi</option>
              <option value="casual">Günlük</option>
            </select>
            {autoSaveLoading.personality && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Kişilik Tanımı</Label>
          <div className="relative">
            <Textarea 
              rows={3} 
              placeholder="Çalışanın nasıl davranması gerektiğini açıklayın..."
              data-testid="textarea-personality"
              value={personalityData.personalityDescription}
              onChange={(e) => {
                const newDesc = e.target.value;
                setPersonalityData(prev => ({ ...prev, personalityDescription: newDesc }));
              }}
              onBlur={() => {
                debouncedAutoSave('personality', JSON.stringify({ personalityDescription: personalityData.personalityDescription }));
              }}
            />
            {autoSaveLoading.personality && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Örn: "Çok yardımsever, sabırlı ve her zaman gülümseyen bir tutum sergiler"
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const BusinessInfoSection = () => (
    <>
      {/* Business Information Settings Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">İşletme Bilgi Ayarları</h3>
        </div>
        
        {/* Working Hours & Holidays Card */}
        <Card>
          <CardHeader>
            <CardTitle>Çalışma Saatleri & Tatiller</CardTitle>
            <CardDescription>İş saatleri ve tatil günleri ayarları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pazartesi-Cuma</Label>
                <div className="flex gap-2 items-center">
                  <Input placeholder="09:00" data-testid="input-weekday-start" />
                  <span>-</span>
                  <Input placeholder="18:00" data-testid="input-weekday-end" />
                </div>
              </div>
              <div>
                <Label>Cumartesi-Pazar</Label>
                <div className="flex gap-2 items-center">
                  <Input placeholder="10:00" data-testid="input-weekend-start" />
                  <span>-</span>
                  <Input placeholder="16:00" data-testid="input-weekend-end" />
                </div>
              </div>
            </div>
            <div>
              <Label>Tatil Günleri</Label>
              <Textarea 
                rows={2} 
                placeholder="Resmi tatil günlerini yazın (örn: 1 Ocak, 23 Nisan...)"
                data-testid="textarea-holidays"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address & Contact Card */}
        <Card>
          <CardHeader>
            <CardTitle>Adres & İletişim Bilgileri</CardTitle>
            <CardDescription>Konum ve iletişim detayları</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Adres</Label>
              <div className="relative">
                <Textarea 
                  rows={2} 
                  placeholder="Tam adres bilgilerini yazın..."
                  data-testid="textarea-address"
                  value={businessData.address}
                  onChange={(e) => {
                    const newAddress = e.target.value;
                    setBusinessData(prev => ({ ...prev, address: newAddress }));
                  }}
                  onBlur={() => {
                    debouncedAutoSave('address', businessData.address);
                  }}
                />
                {autoSaveLoading.address && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Telefon</Label>
              <div className="relative">
                <Input 
                  placeholder="+90 XXX XXX XX XX" 
                  data-testid="input-phone"
                  value={businessData.phone}
                  onChange={(e) => {
                    const newPhone = e.target.value;
                    setBusinessData(prev => ({ ...prev, phone: newPhone }));
                  }}
                  onBlur={() => {
                    debouncedAutoSave('address', businessData.phone);
                  }}
                />
                {autoSaveLoading.address && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>E-posta</Label>
              <div className="relative">
                <Input 
                  placeholder="info@sirket.com" 
                  data-testid="input-email"
                  value={businessData.email}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setBusinessData(prev => ({ ...prev, email: newEmail }));
                  }}
                  onBlur={() => {
                    debouncedAutoSave('address', businessData.email);
                  }}
                />
                {autoSaveLoading.address && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <div className="relative">
                <Input 
                  placeholder="https://sirket.com" 
                  data-testid="input-website"
                  value={businessData.website}
                  onChange={(e) => {
                    const newWebsite = e.target.value;
                    setBusinessData(prev => ({ ...prev, website: newWebsite }));
                  }}
                  onBlur={() => {
                    debouncedAutoSave('address', businessData.website);
                  }}
                />
                {autoSaveLoading.address && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Sosyal Medya</Label>
              <Input placeholder="@sirket" data-testid="input-social" />
            </div>
          </CardContent>
        </Card>

        {/* FAQ Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sık Sorulan Sorular (FAQ)</CardTitle>
            <CardDescription>Müşterilerin sık sorduğu sorular ve cevapları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>FAQ Listesi</Label>
              <Textarea 
                rows={6} 
                placeholder="S: Teslimat süresi nedir?&#10;C: Teslimat süresi 2-3 iş günüdür.&#10;&#10;S: İade politikanız nedir?&#10;C: 14 gün içinde ücretsiz iade hakkınız bulunmaktadır."
                data-testid="textarea-faq"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Her soru-cevap çiftini "S:" ve "C:" ile başlatın
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products & Services Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ürün/Hizmet Açıklamaları</CardTitle>
            <CardDescription>Sunduğunuz ürün ve hizmetlerin detayları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ürün/Hizmet Listesi</Label>
              <Textarea 
                rows={5} 
                placeholder="• Ana ürünlerinizi listeleyin&#10;• Her ürün için kısa açıklama ekleyin&#10;• Fiyat bilgilerini belirtin"
                data-testid="textarea-products"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Ana Kategori</Label>
                <Input placeholder="örn: Gıda, Teknoloji, Hizmet" data-testid="input-category" />
              </div>
              <div>
                <Label>Hedef Kitle</Label>
                <Input placeholder="örn: Bireysel, Kurumsal" data-testid="input-target" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Embed & API Card */}
      <Card>
        <CardHeader>
          <CardTitle>Gömme & API</CardTitle>
          <CardDescription>Web sitenize entegrasyon ve API erişimi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Gömme Kodu</Label>
            <Textarea 
              readOnly 
              value={`<script src="https://cdn.nonplo.com/embed.js" data-agent-id="${agent.id}"></script>`} 
              data-testid="textarea-embed-code"
            />
            <div className="mt-2">
              <Button 
                variant="outline" 
                onClick={() => navigator.clipboard.writeText(`<script src="https://cdn.nonplo.com/embed.js" data-agent-id="${agent.id}"></script>`)}
                data-testid="button-copy-embed"
              >
                Kopyala
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-24">Herkese Açık Paylaşım</Label>
            <Switch data-testid="switch-public-sharing" />
          </div>
          <div>
            <Label>API Key/ID</Label>
            <Input readOnly value={`${agent.id.substring(0,8)}••••••••`} data-testid="input-api-key" />
            <div className="text-xs text-muted-foreground mt-1">
              API dokümantasyonu için destek ekibiyle iletişime geçin
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-full">
        <Card>
          <CardHeader>
            <CardTitle>Ajan bulunamadı</CardTitle>
            <CardDescription>İstenen ajan bulunamadı.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard/agents')}>Ajanlara Geri Dön</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/dashboard/agents" className="hover:text-foreground">Ajanlar</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{agent.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.role || "—"}</p>
            <div className="mt-3">{headerBadges}</div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <div className="flex items-center gap-2 pr-2">
              <span className="text-sm text-muted-foreground">Durum</span>
              <Switch checked={agent.is_active} onCheckedChange={handleToggleActive} />
            </div>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="More actions">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ajan işlemleri</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" /> Yeniden Adlandır
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" /> Yapılandırma Dışa Aktar (JSON)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete */}
            <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Ajanı Sil
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tabFromUrl} onValueChange={(value) => navigate(`/dashboard/agents/${agentId}?tab=${value}`)} className="space-y-6">
        <div className="sticky top-0 z-10 mb-6">
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-1 sm:p-1.5 backdrop-blur supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-gray-900/95">
            <TabsList className="relative h-auto w-full bg-transparent p-0 overflow-x-auto scrollbar-hide">
              {/* Sliding indicator */}
              <div className="absolute top-0 left-0 h-full rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 shadow-md transition-all duration-300 ease-out z-0" 
                   style={{
                     width: '25%',
                     transform: 'translateX(0px)'
                   }}
                   id="sliding-indicator" />
              
              {/* Tab buttons */}
              <TabsTrigger 
                value="overview" 
                className="relative z-10 flex-1 min-w-[60px] px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl transition-colors duration-200 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:bg-transparent text-center"
                data-tab-index="0"
                onClick={() => updateIndicatorPosition(0)}
              >
                <span className="hidden sm:inline">Genel Bakış</span>
                <span className="sm:hidden">Genel</span>
              </TabsTrigger>
              <TabsTrigger 
                value="integrations" 
                className="relative z-10 flex-1 min-w-[60px] px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl transition-colors duration-200 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:bg-transparent text-center"
                data-tab-index="1"
                onClick={() => updateIndicatorPosition(1)}
              >
                <span className="hidden sm:inline">Entegrasyonlar</span>
                <span className="sm:hidden">Entegr.</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="relative z-10 flex-1 min-w-[50px] px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl transition-colors duration-200 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:bg-transparent text-center"
                data-tab-index="2"
                onClick={() => updateIndicatorPosition(2)}
              >
                Ayarlar
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                className="relative z-10 flex-1 min-w-[40px] px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl transition-colors duration-200 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:bg-transparent text-center"
                data-tab-index="3"
                onClick={() => updateIndicatorPosition(3)}
              >
                Chat
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* 1) Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Durum & Sağlık</CardTitle>
                <CardDescription>Çalışma süresi ve güvenilirlik özeti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Durum</div>
                    <div className="mt-1">{loading ? "..." : (agent.is_active ? "Aktif" : "Pasif")}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">İstekler (24s)</div>
                    <div className="mt-1">{conversationsLoading ? "..." : 
                      // Count user messages from today (last 24 hours)
                      dailyMessageCounts.slice(-1)[0] || 0
                    }</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Hatalar</div>
                    <div className="mt-1">{conversationsLoading ? "..." : 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Gecikme</div>
                    <div className="mt-1">{responseTimeLoading ? "..." : 
                      averageResponseTime === 0 ? "< 1s" :
                      `${(averageResponseTime / 1000).toFixed(1)}s`
                    }</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Başarı oranı</div>
                    <div className="mt-2 h-2 rounded bg-muted relative overflow-hidden">
                      {!conversationsLoading && (
                        <div 
                          className="h-full bg-green-500 rounded" 
                          style={{ 
                            width: `${recentConversations.length > 0 
                              ? Math.round(((recentConversations.length - 0) / recentConversations.length) * 100)
                              : 98}%` 
                          }}
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {conversationsLoading ? "..." : `${recentConversations.length > 0 
                        ? Math.round(((recentConversations.length - 0) / recentConversations.length) * 100)
                        : 98}%`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kullanım</CardTitle>
                <CardDescription>Mesaj & token kullanımı</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Bugün</div>
                    <div className="mt-1">{loading ? "..." : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bu hafta</div>
                    <div className="mt-1">{loading ? "..." : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bu ay</div>
                    <div className="mt-1">{loading ? "..." : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tokens</div>
                    <div className="mt-1">{loading ? "..." : "—"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Last 7 Days User Interactions</CardTitle>
              <CardDescription>Günlük kullanıcı mesaj sayıları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                {/* Chart Container */}
                <div className="h-32 md:h-40 lg:h-48 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-lg p-2 md:p-3 mb-2 md:mb-3">
                  <div className="h-full grid grid-cols-7 gap-1 md:gap-2 items-end">
                    {conversationsLoading ? (
                      // Loading state - show placeholder bars
                      [20, 35, 45, 30, 55, 40, 60].map((height, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-t from-gray-300 to-gray-400 rounded-t-sm animate-pulse"
                          style={{ height: `${height}%` }}
                        />
                      ))
                    ) : (
                      // Real data - show actual daily message counts
                      dailyMessageCounts.map((count, index) => {
                        const maxCount = Math.max(...dailyMessageCounts, 1); // Ensure at least 1 for percentage calculation
                        const height = Math.max((count / maxCount) * 80, 5); // Min 5% height, 80% max
                        return (
                          <div
                            key={index}
                            className="bg-gradient-to-t from-primary to-purple-500 rounded-t-sm transition-all hover:opacity-80 relative group"
                            style={{ height: `${height}%` }}
                            title={`${count}`}
                          >
                            {/* Tooltip on hover */}
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {count}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                {/* Day Labels - Show actual dates */}
                <div className="grid grid-cols-7 gap-1 md:gap-2 text-xs text-muted-foreground text-center px-2 md:px-3">
                  {Array.from({ length: 7 }, (_, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - index));
                    return (
                      <span key={index}>
                        {date.getDate()}/{date.getMonth() + 1}
                      </span>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>Preview of last 5 interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {conversationsLoading ? (
                <div className="text-sm text-muted-foreground">Loading conversations...</div>
              ) : recentConversations.length === 0 ? (
                <div className="text-sm text-muted-foreground">No conversations yet.</div>
              ) : (
                <div className="space-y-3">
                  {recentConversations.map((conversation) => (
                    <div 
                      key={conversation.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
                      onClick={() => handleConversationClick(conversation)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium truncate">
                            {conversation.channel}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(conversation.last_message_at).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        {conversation.latest_message && (
                          <div className="text-sm text-muted-foreground mt-1 truncate">
                            <strong>{conversation.latest_message.sender}:</strong> {conversation.latest_message.content}
                          </div>
                        )}
                      </div>
                      {conversation.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/dashboard/messages?agentId=${agentId}`)}
                  className="w-full"
                  data-testid="button-view-all-conversations"
                >
                  Tümünü Görüntüle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2) Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ajana Özel Entegrasyonlar</CardTitle>
              <CardDescription>
                Bağlantılar (OAuth) Kanallar'da yönetilir. Burada bu ajanın hangi bağlı servisleri kullanacağını etkinleştirirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {providers.map((p) => {
                // Enhanced Google Calendar UI
                if (p.key === 'google_calendar') {
                  return (
                    <div key={p.key} className="rounded border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                      <div className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium text-lg">{p.name}</div>
                              <div className="text-sm text-muted-foreground">{p.desc}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {calendarStatusLoading ? (
                              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            ) : calendarStatus.connected ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                Bağlı
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Bağlı Değil
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Connection Info & Actions */}
                        {calendarStatus.connected ? (
                          <div className="space-y-3">
                            {/* Connected Account Info */}
                            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">Bağlı Hesap</div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium">{calendarStatus.email || 'Bilinmiyor'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Bağlantı: {calendarStatus.connectedAt ? 
                                      new Date(calendarStatus.connectedAt).toLocaleDateString('tr-TR') : 
                                      'Bilinmiyor'
                                    }
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={disconnectCalendar}
                                  disabled={calendarDisconnecting}
                                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                >
                                  {calendarDisconnecting ? 'Kesiliyor...' : 'Bağlantıyı Kes'}
                                </Button>
                              </div>
                            </div>

                            {/* Agent Settings */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">Bu Ajan için Etkin</div>
                                <div className="text-xs text-muted-foreground">Ajanın Google Calendar'ı kullanmasına izin ver</div>
                              </div>
                              <Switch
                                disabled={integrationsLoading}
                                checked={!!agentProviderEnabled[p.key]}
                                onCheckedChange={(v) => onToggleAgentProvider(p.key, v)}
                              />
                            </div>

                            {/* Tool Activation */}
                            {agentProviderEnabled[p.key] && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div>
                                  <div className="text-sm font-medium">Calendar Araçları</div>
                                  <div className="text-xs text-muted-foreground">Etkinlik oluşturma, okuma ve güncelleme araçları</div>
                                </div>
                                <Button 
                                  variant={googleCalendarToolActivated ? "default" : "outline"}
                                  size="sm"
                                  onClick={activateGoogleCalendarTool}
                                  disabled={toolActivationLoading}
                                >
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  {toolActivationLoading ? 'Etkinleştiriliyor...' : 
                                   googleCalendarToolActivated ? 'Araçlar Aktif' : 'Araçları Etkinleştir'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-center py-4">
                              <div className="text-sm text-muted-foreground mb-3">
                                Bu ajanın Google Calendar'ı kullanabilmesi için önce Google hesabınızı bağlamanız gerekiyor.
                              </div>
                              <Button 
                                onClick={initiateCalendarConnection}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid="button-connect-google-calendar"
                              >
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                Google Calendar'a Bağlan
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Enhanced Web Search UI
                if (p.key === 'web_search') {
                  return (
                    <div key={p.key} className="rounded border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                      <div className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                              <SearchIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="font-medium text-lg">{p.name}</div>
                              <div className="text-sm text-muted-foreground">{p.desc}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                              Hazır
                            </Badge>
                          </div>
                        </div>

                        {/* Agent Settings */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Bu Ajan için Etkin</div>
                            <div className="text-xs text-muted-foreground">Ajanın web arama yapmasına izin ver</div>
                          </div>
                          <Switch
                            disabled={integrationsLoading}
                            checked={!!agentProviderEnabled[p.key]}
                            onCheckedChange={(v) => onToggleAgentProvider(p.key, v)}
                          />
                        </div>

                        {/* Web Search Test Interface */}
                        {agentProviderEnabled[p.key] && (
                          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm font-medium">Web Arama Testi</div>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Arama sorgusu girin (örn: son dakika haberler)"
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
                                  value={webSearchQuery}
                                  onChange={(e) => setWebSearchQuery(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && testWebSearch()}
                                  data-testid="input-web-search-query"
                                />
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={testWebSearch}
                                  disabled={webSearchTesting || !webSearchQuery.trim()}
                                  data-testid="button-test-web-search"
                                >
                                  <SearchIcon className="h-3 w-3 mr-1" />
                                  {webSearchTesting ? 'Aranıyor...' : 'Test Et'}
                                </Button>
                              </div>
                              
                              {/* Search Results */}
                              {webSearchResults && (
                                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 space-y-2">
                                  <div className="text-sm font-medium text-muted-foreground">
                                    Arama Sonuçları ({webSearchResults.totalResults} sonuç, {webSearchResults.searchTime}ms)
                                  </div>
                                  <div className="space-y-2">
                                    {webSearchResults.results.slice(0, 3).map((result: any, index: number) => (
                                      <div key={index} className="border-l-2 border-green-400 pl-3">
                                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                          <a href={result.link} target="_blank" rel="noopener noreferrer">
                                            {result.title}
                                          </a>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{result.displayLink}</div>
                                        <div className="text-xs mt-1">{result.snippet}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Error Message */}
                              {webSearchError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                  <div className="text-sm text-red-800 dark:text-red-200">
                                    <strong>Hata:</strong> {webSearchError}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Default provider UI for other integrations
                return (
                  <div key={p.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-4">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.desc}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!globalConnections[p.key] ? (
                        <Button variant="outline" onClick={() => navigate('/dashboard/integrations')}>Global olarak bağlan</Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Etkin</span>
                          <Switch
                            disabled={integrationsLoading}
                            checked={!!agentProviderEnabled[p.key]}
                            onCheckedChange={(v) => onToggleAgentProvider(p.key, v)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="text-xs text-muted-foreground">Doğrulama: AÇIK konuma getirmek için global bağlantı gerekir.</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4) Çalışan Ayarları - Modern Card-Based Design */}
        <TabsContent value="settings" className="space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Çalışan Ayarları</h2>
            <p className="text-muted-foreground">Dijital çalışanınızın kimliğini ve davranışlarını özelleştirin</p>
          </div>

          {/* EMPLOYEE PROFILE CARD */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                Çalışan Profil Bilgileri
              </CardTitle>
              <CardDescription className="text-base">
                Temel kimlik bilgileri ve eğitim materyalleri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="employee-name" className="text-sm font-medium">Çalışan Adı</Label>
                  <div className="relative">
                    <Input 
                      id="employee-name" 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value.trim() !== agent?.name) {
                          handleAutoSave('name', e.target.value.trim());
                        }
                      }}
                      data-testid="input-employee-name"
                      placeholder="Örn: Fatma Hanım"
                      className="pr-12 h-12 text-base"
                    />
                    <AutoSaveIndicator fieldId="name" autoSaveStates={autoSaveStates} />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="employee-role" className="text-sm font-medium">Çalışan Görevi</Label>
                  <div className="relative">
                    <Input 
                      id="employee-role" 
                      value={agentRole}
                      onChange={(e) => setAgentRole(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== agent?.role) {
                          handleAutoSave('role', e.target.value.trim());
                        }
                      }}
                      data-testid="input-employee-role"
                      placeholder="Örn: Müşteri Hizmetleri Temsilcisi"
                      className="pr-12 h-12 text-base"
                    />
                    <AutoSaveIndicator fieldId="role" autoSaveStates={autoSaveStates} />
                  </div>
                </div>
              </div>
              
              {/* Training Files Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Eğitim Dosyaları</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                  <div className="text-muted-foreground space-y-3">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Çalışanın öğrenmesi için dosyalar yükleyin</p>
                      <p className="text-sm text-muted-foreground/75">PDF, DOC, TXT formatları desteklenir • Maksimum 50MB</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 h-11 px-6" disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    Dosya Yükle (Yakında)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PERSONALITY CARD */}
          <EmployeePersonalityCard agent={agent} onUpdate={handleAutoSave} autoSaveStates={autoSaveStates} />

          {/* BUSINESS INFORMATION SECTION */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-foreground">İşletme Bilgi Ayarları</h3>
              <p className="text-muted-foreground">İşletmenizin detaylarını yapılandırın</p>
            </div>

            {/* Working Hours & Holidays Card */}
            <WorkingHoursCard agent={agent} onUpdate={handleAutoSave} autoSaveStates={autoSaveStates} />

            {/* Address & Contact Card */}
            <AddressContactCard agent={agent} onUpdate={handleAutoSave} autoSaveStates={autoSaveStates} />

            {/* FAQ Card */}
            <FaqCard agent={agent} onUpdate={handleAutoSave} autoSaveStates={autoSaveStates} />

            {/* Products & Services Card */}
            <ProductsServicesCard agent={agent} onUpdate={handleAutoSave} autoSaveStates={autoSaveStates} />
          </div>

          {/* EMBED & API CARD */}
          <EmbedApiCard agent={agent} />

          {/* Tools Link */}
          <div className="text-center py-6">
            <Button 
              variant="link" 
              className="text-blue-600 hover:text-blue-800 text-lg font-medium"
              onClick={() => navigate(`/dashboard/agents/${agent.id}?tab=integrations`)}
            >
              Çalışanınızın kullanabileceği araçları görmek & düzenlemek için tıklayın
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        {/* 5) Chat */}
        <TabsContent value="chat" className="space-y-6">
          <div className="w-full flex justify-center">
            <AgentChat
              agentId={agent.id}
              agentName={agent.name}
              assistantId={agent.openaiAssistantId || undefined}
              isActive={agent.is_active}
            />
          </div>
        </TabsContent>

      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu dijital çalışanı ve tüm ilgili verileri silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Dijital çalışan kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog (lightweight) */}
      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename agent</AlertDialogTitle>
            <AlertDialogDescription>Pick a clear and recognizable name.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">New name</Label>
            <Input id="rename" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRename}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversation Messages Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conversation Details</DialogTitle>
            <DialogDescription>
              {selectedConversation && (
                <>
                  {selectedConversation.channel} • {selectedConversation.status} • {new Date(selectedConversation.last_message_at).toLocaleDateString('tr-TR')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4">
              {conversationMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages in this conversation
                </div>
              ) : (
                conversationMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground ml-4' 
                        : 'bg-muted mr-4'
                    }`}>
                      <div className="text-sm">
                        {message.content}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}