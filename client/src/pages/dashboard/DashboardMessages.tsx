import React, { useEffect, useMemo, useState } from "react";

// Native JavaScript date formatting functions
const formatDate = (date: Date) => {
  return date.toLocaleDateString('tr-TR', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('tr-TR', { 
    hour: '2-digit', minute: '2-digit' 
  });
};

const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  
  return formatDate(date);
};
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Search,
  Filter,
  RotateCcw,
  MessageSquare,
  User,
  Bot,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Send,
  X,
  Loader2,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react";

import { useSearchParams } from "react-router-dom";
import { useMessageFilters } from "@/hooks/use-message-filters";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { queryClient } from "@/lib/queryClient";

type Conversation = {
  id: string;
  user_id: string;
  agent_id: string;
  channel: string;
  status: "open" | "pending" | "resolved" | "unanswered" | string;
  last_message_at: string;
  unread: boolean;
  meta: Record<string, any>;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  agent_role?: string;
};

type Message = {
  id: string;
  conversationId: string;
  sender: "user" | "agent" | string;
  content: string | null;
  attachments: any[];
  createdAt: string;
};

type Agent = { id: string; name: string; role?: string | null };

type DateRange = {
  from?: Date;
  to?: Date;
};

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram DM" },
  { key: "web", label: "Web Chat" },
  { key: "email", label: "Email" },
];

const STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
  { key: "unanswered", label: "Unanswered" },
];

const PAGE_SIZE = 20;

// Highlight search matches in text
const highlightSearchText = (text: string, searchQuery: string): React.ReactNode => {
  if (!searchQuery.trim() || searchQuery.length < 2) {
    return text;
  }
  
  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return parts.map((part, index) => {
    if (part.toLowerCase() === searchQuery.toLowerCase()) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">
          {part}
        </mark>
      );
    }
    return part;
  });
};

// Normalize Supabase rows to UI types
const normalizeConversation = (d: any): Conversation => ({
  ...d,
  meta: typeof d.meta === 'object' && d.meta !== null ? (d.meta as Record<string, any>) : {},
});

const normalizeMessage = (m: any): Message => ({
  ...m,
  conversationId: m.conversationId || m.conversation_id,
  createdAt: m.createdAt || m.created_at,
  attachments: Array.isArray(m.attachments) ? (m.attachments as any[]) : [],
});

const MultiSelect = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) => {
  const handleToggle = (key: string, checked: boolean) => {
    const set = new Set(selected);
    if (checked) set.add(key); else set.delete(key);
    onChange(Array.from(set));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full md:w-auto">
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 space-y-1">
          {options.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
              <Checkbox
                checked={selected.includes(opt.key)}
                onCheckedChange={(v) => handleToggle(opt.key, Boolean(v))}
                aria-label={opt.label}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DateRangePicker = ({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value.from ? (
            value.to ? (
              <span>
                {formatDate(value.from)} – {formatDate(value.to)}
              </span>
            ) : (
              <span>{formatDate(value.from)}</span>
            )
          ) : (
            <span>Tarih aralığı</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Başlangıç Tarihi</label>
            <input
              type="date"
              value={value.from ? value.from.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined;
                onChange({ ...value, from: date });
              }}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bitiş Tarihi</label>
            <input
              type="date"
              value={value.to ? value.to.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined;
                onChange({ ...value, to: date });
              }}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};



export default function DashboardMessages() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, Agent>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [lastMessageByConv, setLastMessageByConv] = useState<Record<string, Message | undefined>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [reply, setReply] = useState("");

  // Filters via hook
  const { filters, setFilters, resetFilters: resetFiltersHook } = useMessageFilters();
  const uiDateRange = useMemo<DateRange>(() => ({
    from: filters.dateRange?.from ? new Date(filters.dateRange.from) : undefined,
    to: filters.dateRange?.to ? new Date(filters.dateRange.to) : undefined,
  }), [filters.dateRange]);
  const handleDateRangeChange = (r: DateRange) => {
    if (r?.from || r?.to) {
      setFilters((cur) => ({
        ...cur,
        dateRange: {
          from: r.from ? r.from.toISOString() : "",
          to: r.to ? r.to.toISOString() : "",
        },
      }));
    } else {
      setFilters((cur) => ({ ...cur, dateRange: null }));
    }
  };

  // Pagination (sync with URL)
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<number>(Number(searchParams.get("page") || "1") || 1);
  const [total, setTotal] = useState(0);

  // Handle agentId and conversationId from URL parameters
  const agentIdFromUrl = searchParams.get("agentId");
  const conversationIdFromUrl = searchParams.get("conversationId");
  
  // agentId filter is now handled automatically by useMessageFilters hook



  // Open specific conversation if conversationId is provided
  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const matchingConversation = conversations.find(c => c.id === conversationIdFromUrl);
      if (matchingConversation) {
        setSelectedConversationId(conversationIdFromUrl);
        // Load messages for this conversation
        loadThread(conversationIdFromUrl);
      }
    }
  }, [conversationIdFromUrl, conversations]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    document.title = "Mesajlar Gelen Kutusu | Dashboard";
  }, []);

  // Sync page param with URL
  useEffect(() => {
    const p = Number(searchParams.get("page") || "1");
    setPage(Number.isNaN(p) ? 1 : p);
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (page > 1) next.set("page", String(page)); else next.delete("page");
    setSearchParams(next, { replace: true });
  }, [page, setSearchParams]);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id,name,role")
        .order("name", { ascending: true });
      if (error) return;
      setAgents(data || []);
      setAgentMap((data || []).reduce((acc: any, a) => ({ ...acc, [a.id]: a }), {}));
    };
    loadAgents();
  }, []);

  // Build filters into query
  const buildConversationQuery = () => {
    const userId = user?.id || 'd59a0ba4-c16e-49c5-8e10-54e6f6d15d1f';
    let query = supabase
      .from("conversations")
      .select(`
        id,user_id,agent_id,channel,status,last_message_at,unread,meta,created_at,updated_at
      `, { count: "exact" })
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (filters.agents.length) {
      console.log("🔍 Applying agent filter to query:", filters.agents);
      query = query.in("agent_id", filters.agents);
    }
    if (filters.channels.length) query = query.in("channel", filters.channels);
    if (filters.status && filters.status !== "all") {
      const statusValue = filters.status === "closed" ? "resolved" : filters.status;
      query = query.eq("status", statusValue);
    }
    if (filters.unreadOnly) query = query.eq("unread", true);
    if (filters.dateRange?.from) query = query.gte("last_message_at", filters.dateRange.from);
    if (filters.dateRange?.to) {
      const end = new Date(filters.dateRange.to);
      const endIso = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      query = query.lte("last_message_at", endIso);
    }

    return query;
  };

  // Optional search – find conversation IDs by messages content
  const findConversationIdsBySearch = async (q: string): Promise<string[] | null> => {
    if (!q || q.trim().length < 2) return null;
    const { data, error } = await supabase
      .from("messages")
      .select("conversation_id")
      .ilike("content", `%${q.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return null;
    const ids = Array.from(new Set((data || []).map((r) => r.conversation_id)));
    return ids;
  };

  const loadConversations = async () => {
    console.log("🔍 loadConversations called with filters:", filters);
    setLoading(true);
    
    // Temporary fix: use hardcoded user ID for testing
    const userId = user?.id || 'd59a0ba4-c16e-49c5-8e10-54e6f6d15d1f';
    
    let idsFilter: string[] | null = null;
    if (filters.query.trim().length >= 2) {
      idsFilter = await findConversationIdsBySearch(filters.query);
      if (idsFilter && idsFilter.length === 0) {
        setConversations([]);
        setLastMessageByConv({});
        setTotal(0);
        setLoading(false);
        return;
      }
    }

    let query = buildConversationQuery();
    if (idsFilter) query = query.in("id", idsFilter);

    const { data, error, count } = await query;
    if (error) {
      setLoading(false);
      return;
    }

    // Fetch agent names separately for each conversation
    const agentNames: Record<string, { name: string; role: string }> = {};
    await Promise.all(
      (data || []).map(async (c) => {
        const { data: agentData } = await supabase
          .from("agents")
          .select("name,role")
          .eq("id", c.agent_id)
          .single();
        
        if (agentData) {
          agentNames[c.agent_id] = {
            name: agentData.name,
            role: agentData.role
          };
        }
      })
    );

    const normalized = (data || []).map((d: any) => ({
      ...normalizeConversation(d),
      agent_name: agentNames[d.agent_id]?.name || 'Bilinmeyen Agent',
      agent_role: agentNames[d.agent_id]?.role || 'AI Assistant'
    }));
    setConversations(normalized);
    setTotal(count || 0);
    setLoading(false);

    // Fetch last message snippet per conversation for current page
    const snippetMap: Record<string, Message | undefined> = {};
    await Promise.all(
      (data || []).map(async (c) => {
        const { data: lm } = await supabase
          .from("messages")
          .select("id,conversation_id,sender,content,attachments,created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);
        snippetMap[c.id] = lm && lm[0] ? normalizeMessage(lm[0] as any) : undefined;
      })
    );
    setLastMessageByConv(snippetMap);
  };

  useEffect(() => {
    if (!authLoading) {
      if (user?.id) {
        loadConversations();
      } else {
        setLoading(false);
      }
    }
  }, [page, filters, user?.id, authLoading]);

  // Reload when searching with debounce
  useEffect(() => {
    if (!authLoading && user?.id) {
      const t = setTimeout(() => {
        setPage(1);
        loadConversations();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [filters.query, user?.id, authLoading]);

  // Load thread
  const loadThread = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id,conversation_id,sender,content,attachments,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (!error) {
      const normalized = (data || []).map((m: any) => normalizeMessage(m));
      setThread(normalized);
    }
  };

  useEffect(() => {
    if (!selectedConversationId) return;
    loadThread(selectedConversationId);
  }, [selectedConversationId]);

  // Mark as read when opening
  useEffect(() => {
    const markRead = async () => {
      if (!selectedConversationId) return;
      const c = conversations.find((x) => x.id === selectedConversationId);
      if (!c || !c.unread) return;
      const { error } = await supabase
        .from("conversations")
        .update({ unread: false })
        .eq("id", selectedConversationId);
      if (!error) {
        setConversations((prev) => prev.map((p) => (p.id === selectedConversationId ? { ...p, unread: false } : p)));
      }
    };
    markRead();
  }, [selectedConversationId, conversations]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const m = payload.new as Message;
          // Update list: bump conversation on new message
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === m.conversationId);
            if (idx === -1) return prev;
            const updated = { ...prev[idx], last_message_at: m.createdAt, unread: m.sender === "user" ? true : prev[idx].unread };
            const copy = [...prev];
            copy.splice(idx, 1);
            return [updated, ...copy];
          });
          setLastMessageByConv((prev) => ({ ...prev, [m.conversationId]: m }));

          if (selectedConversationId === m.conversationId) {
            setThread((prev) => [...prev, m]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload: any) => {
          const c = payload.new as Conversation;
          // Apply current filters quickly (best-effort)
          const passAgents = !filters.agents.length || filters.agents.includes(c.agent_id);
          const passChannels = !filters.channels.length || filters.channels.includes(c.channel);
          const passStatuses = filters.status === "all" || c.status === (filters.status === "closed" ? "resolved" : filters.status);
          const passUnread = !filters.unreadOnly || c.unread;
          if (passAgents && passChannels && passStatuses && passUnread) {
            setConversations((prev) => [c, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload: any) => {
          const c = payload.new as Conversation;
          setConversations((prev) => prev.map((p) => (p.id === c.id ? { ...p, ...c } : p)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters, selectedConversationId]);

  const resetFilters = () => {
    resetFiltersHook(); // Hook now handles preserving agent filter from URL
    setSelectedIds([]);
  };



  // Chat functionality disabled - Messages are read-only
  
  // Delete functionality
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // First delete all messages in the conversation
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);
      
      if (messagesError) throw messagesError;
      
      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);
      
      if (conversationError) throw conversationError;
      
      // Update local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setLastMessageByConv(prev => {
        const { [conversationId]: deleted, ...rest } = prev;
        return rest;
      });
      
      toast({
        title: "Başarılı",
        description: "Konuşma başarıyla silindi",
      });
      
      // Reload page to refresh dashboard stats
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Delete conversation error:", error);
      toast({
        title: "Hata",
        description: "Konuşma silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      // Delete all messages for selected conversations
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .in("conversation_id", selectedIds);
      
      if (messagesError) throw messagesError;
      
      // Delete all selected conversations
      const { error: conversationsError } = await supabase
        .from("conversations")
        .delete()
        .in("id", selectedIds);
      
      if (conversationsError) throw conversationsError;
      
      // Update local state
      setConversations(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setLastMessageByConv(prev => {
        const newState = { ...prev };
        selectedIds.forEach(id => delete newState[id]);
        return newState;
      });
      setSelectedIds([]);
      
      toast({
        title: "Başarılı",
        description: `${selectedIds.length} konuşma başarıyla silindi`,
      });
      
      // Reload page to refresh dashboard stats
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Hata",
        description: "Konuşmalar silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === conversations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(conversations.map(c => c.id));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Mesajlar</h1>
        <p className="text-muted-foreground">
          Tüm ajanlardan gelen konuşmaları tek gelen kutusunda yönetin
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {/* Mobile Layout */}
          <div className="block lg:hidden space-y-3">
            {/* Message Search - Full Width */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Mesaj içeriğinde ara..."
                value={filters.query}
                onChange={(e) => setFilters({ query: e.target.value })}
                className="pl-10 w-full"
                data-testid="input-search"
              />
            </div>

            {/* Agents - Full Width */}
            <MultiSelect
              label="Ajanlar"
              options={agents.map((a) => ({ key: a.id, label: a.name }))}
              selected={filters.agents}
              onChange={(agents) => setFilters({ agents })}
            />

            {/* Channels - Full Width */}
            <MultiSelect
              label="Kanallar"
              options={CHANNELS}
              selected={filters.channels}
              onChange={(channels) => setFilters({ channels })}
            />

            {/* Date Range - Full Width */}
            <DateRangePicker value={uiDateRange} onChange={handleDateRangeChange} />

            {/* Clear Button - Full Width */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters} 
              data-testid="button-reset"
              className="w-full justify-start"
            >
              <X className="h-4 w-4 mr-1" />
              Temizle
            </Button>
          </div>

          {/* Desktop/Tablet Layout */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Message Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Mesaj içeriğinde ara..."
                value={filters.query}
                onChange={(e) => setFilters({ query: e.target.value })}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            {/* Agents Filter */}
            <div className="flex-shrink-0">
              <MultiSelect
                label="Ajanlar"
                options={agents.map((a) => ({ key: a.id, label: a.name }))}
                selected={filters.agents}
                onChange={(agents) => setFilters({ agents })}
              />
            </div>

            {/* Channels Filter */}
            <div className="flex-shrink-0">
              <MultiSelect
                label="Kanallar"
                options={CHANNELS}
                selected={filters.channels}
                onChange={(channels) => setFilters({ channels })}
              />
            </div>

            {/* Date Range Filter */}
            <div className="flex-shrink-0">
              <DateRangePicker value={uiDateRange} onChange={handleDateRangeChange} />
            </div>

            {/* Clear Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters} 
              data-testid="button-reset"
              className="flex-shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Konuşmalar</span>
            {total > 0 && (
              <Badge variant="secondary">
                {total} total
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Yükleniyor...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sonuç bulunamadı</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              {conversations.length > 0 && (
                <div className="flex items-center justify-between p-3 border-b mb-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.length === conversations.length}
                      {...(selectedIds.length > 0 && selectedIds.length < conversations.length && { 
                        'data-indeterminate': true 
                      })}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.length > 0 
                        ? `${selectedIds.length} konuşma seçildi`
                        : 'Tümünü seç'
                      }
                    </span>
                  </div>
                  
                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      data-testid="button-bulk-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Seçilenleri Sil ({selectedIds.length})
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const agent = agentMap[conversation.agent_id];
                  const lastMessage = lastMessageByConv[conversation.id];
                  const isSelected = selectedIds.includes(conversation.id);
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                        isSelected ? 'bg-accent border-primary' : ''
                      }`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds([...selectedIds, conversation.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== conversation.id));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {agent?.name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        {/* Mobile Layout */}
                        <div className="block sm:hidden">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {agent?.name || 'Unknown Agent'}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                <span className="whitespace-nowrap">
                                  {formatDistanceToNow(new Date(conversation.last_message_at))}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {conversation.unread && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conversation.id);
                                }}
                                data-testid={`button-delete-${conversation.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:block">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {agent?.name || 'Unknown Agent'}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {conversation.channel}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {conversation.unread && (
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              )}
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(conversation.last_message_at))}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conversation.id);
                                }}
                                data-testid={`button-delete-${conversation.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            <span className="font-medium">
                              {lastMessage.sender === 'agent' ? 'Bot: ' : 'Kullanıcı: '}
                            </span>
                            {lastMessage.content 
                              ? highlightSearchText(lastMessage.content, filters.query)
                              : '(ek dosya)'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    data-testid="button-previous"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Önceki
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    data-testid="button-next"
                  >
                    Sonraki
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Thread Modal */}
      <Dialog open={!!selectedConversationId} onOpenChange={() => setSelectedConversationId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Konuşma Detayı</DialogTitle>
            <DialogDescription>
              Bu konuşmadaki tüm mesajları görüntüleyin. Bu konuşma sadece görüntüleme modundadır.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {thread.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === 'agent' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${
                      message.sender === 'agent' ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={
                        message.sender === 'agent' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-gray-100 text-gray-600'
                      }>
                        {message.sender === 'agent' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div
                      className={`rounded-lg p-3 ${
                        message.sender === 'agent'
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">
                          {highlightSearchText(message.content, filters.query)}
                        </p>
                      )}
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 text-xs opacity-75">
                          📎 {message.attachments.length} ek dosya
                        </div>
                      )}
                      
                      <div className="mt-1 text-xs opacity-75">
                        {formatTime(new Date(message.createdAt))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

        </DialogContent>
      </Dialog>
    </div>
  );
}