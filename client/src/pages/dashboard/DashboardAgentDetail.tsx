import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { Calendar as CalendarIcon, MoreVertical, Trash2, Download, Pencil, Bot, ChevronRight, MessageSquare, Search as SearchIcon } from "lucide-react";
import LiveTestConsole from "@/components/LiveTestConsole";
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

export default function DashboardAgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // Settings/Knowledge draft state (unsaved guard demo)
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);

  // Forbidden words state
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [loadingForbiddenWords, setLoadingForbiddenWords] = useState(false);
  const [savingForbiddenWords, setSavingForbiddenWords] = useState(false);

  // Temperature control
  const [temperature, setTemperature] = useState<string>("1.0");
  const [temperatureLoading, setTemperatureLoading] = useState(false);

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

  // Initialize indicator position and listen for tab changes
  useLayoutEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Auto-click 'overview' tab to set proper initial state
    const setInitialPosition = () => {
      const overviewTab = document.querySelector('[value="overview"][data-tab-index="0"]') as HTMLElement;
      
      if (overviewTab) {
        // Programmatically click the overview button to trigger all proper states
        overviewTab.click();
        return true;
      }
      return false;
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
      toast({ title: "Önce global bağlantı yapın", description: "Entegrasyonlar & Araçlar'ı açarak bağlanın.", variant: "destructive" });
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
      <Tabs defaultValue="overview" className="space-y-6">
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
                Bağlantılar (OAuth) Entegrasyonlar & Araçlar'da yönetilir. Burada bu ajanın hangi bağlı servisleri kullanacağını etkinleştirirsiniz.
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

        {/* 4) Settings */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Ajan kimliği ve görünümü</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                <Label htmlFor="agent-name">Ajan adı</Label>
                <Input id="agent-name" value={newName} onChange={(e) => { setNewName(e.target.value); setHasUnsavedDraft(true); }} />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="agent-role">Rol / Hedef</Label>
                <Input id="agent-role" defaultValue={agent.role} onChange={() => setHasUnsavedDraft(true)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Davranış</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Maksimum yanıt uzunluğu</Label>
                <Input type="number" placeholder="ör. 500" onChange={() => setHasUnsavedDraft(true)} />
              </div>
              <div>
                <Label>Yaratıcılık</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="2" 
                  value={temperature}
                  onChange={(e) => {
                    setTemperature(e.target.value);
                    setHasUnsavedDraft(true);
                  }}
                  onBlur={() => {
                    if (temperature !== (agent?.temperature || "1.0")) {
                      handleTemperatureUpdate(temperature);
                    }
                  }}
                  disabled={temperatureLoading}
                  placeholder="1.0" 
                />
                {temperatureLoading && <div className="text-xs text-muted-foreground mt-1">Güncelleniyor...</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  Düşük değerler (0.0-1.0) daha tutarlı, yüksek değerler (1.0-2.0) daha yaratıcı yanıtlar üretir.
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Yedek mesaj</Label>
                <Textarea rows={3} placeholder="Sorry, I couldn’t help with that." onChange={() => setHasUnsavedDraft(true)} />
              </div>
              <div className="md:col-span-2">
                <Label>Dil</Label>
                <Input placeholder="Otomatik / tr / en ..." onChange={() => setHasUnsavedDraft(true)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Güvenlik</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label>Engellenmiş anahtar kelimeler</Label>
                <Textarea 
                  rows={3} 
                  placeholder="virgül,ile,ayrılmış,kelimeler" 
                  value={forbiddenWords.join(', ')}
                  onChange={(e) => {
                    const words = e.target.value
                      .split(',')
                      .map(word => word.trim())
                      .filter(word => word.length > 0);
                    setForbiddenWords(words);
                  }}
                  onBlur={() => {
                    saveForbiddenWords(forbiddenWords);
                  }}
                  disabled={loadingForbiddenWords || savingForbiddenWords}
                  data-testid="textarea-forbidden-words"
                />
                {loadingForbiddenWords && (
                  <div className="text-xs text-muted-foreground mt-1">Yasaklı kelimeler yükleniyor...</div>
                )}
                {savingForbiddenWords && (
                  <div className="text-xs text-muted-foreground mt-1">Kaydediliyor...</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Ajanın kullanmaması gereken kelimeleri virgülle ayırarak yazın. (Örn: şiddet, hakaret, küfür)
                </div>
              </div>
              <div>
                <Label>Yönlendirme kuralları</Label>
                <Textarea rows={3} placeholder="Eğer X ise Y'ye yönlendir" onChange={() => setHasUnsavedDraft(true)} />
              </div>
              <div>
                <Label>Kişisel veri maskeleme</Label>
                <Input placeholder="Etkin / Devre dışı" onChange={() => setHasUnsavedDraft(true)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gömme & API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Gömme kodu</Label>
                <Textarea readOnly value={`<script src="https://cdn.example.com/embed.js" data-agent-id="${agent.id}"></script>`} />
                <div className="mt-2"><Button variant="outline" onClick={() => navigator.clipboard.writeText(`<script src=\"https://cdn.example.com/embed.js\" data-agent-id=\"${agent.id}\"></script>`) }>Kopyala</Button></div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="min-w-24">Herkese açık paylaşım</Label>
                <Switch />
              </div>
              <div>
                <Label>API Key/ID</Label>
                <Input readOnly value={`${agent.id.substring(0,8)}••••••••`} />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button onClick={() => { if (newName.trim() && newName.trim() !== agent.name) { handleRename(); } setHasUnsavedDraft(false); }}>Kaydet</Button>
            <Button variant="outline" onClick={() => setHasUnsavedDraft(false)}>İptal</Button>
            {hasUnsavedDraft && <span className="text-sm text-muted-foreground">Kaydedilmemiş değişiklikleriniz var.</span>}
          </div>
        </TabsContent>

        {/* 5) Chat */}
        <TabsContent value="chat" className="space-y-6">
          <div className="w-full flex justify-center">
            <AgentChat
              agentId={agent.id}
              agentName={agent.name}
              assistantId={agent.openaiAssistantId || undefined}
            />
          </div>
        </TabsContent>

      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this agent and all related data?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
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