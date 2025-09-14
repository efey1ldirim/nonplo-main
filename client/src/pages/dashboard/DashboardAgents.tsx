import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bot, Calendar, MoreVertical, Edit, Trash2, Power, CalendarCheck, CalendarX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AgentCreationWizard from "@/components/features/AgentCreationWizard";

interface Agent {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface CalendarStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

// Hoisted EmptyState component to module scope for proper memoization
const EmptyState = memo(({ onCreateAgent }: { onCreateAgent: () => void }) => (
  <div className="text-center py-12">
    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
      <Bot className="w-12 h-12 text-muted-foreground" />
    </div>
    <h3 className="text-xl font-semibold mb-2">Henüz hiç Yapay Zeka Destekli Dijital Çalışanınız yok</h3>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
      İlk Yapay Zeka Destekli Dijital Çalışanınızı oluşturmak için aşağıdaki butona tıklayın ve işletmeniz için özel olarak tasarlanmış dijital asistanınızı yapılandırın.
    </p>
    <Button onClick={onCreateAgent} size="lg" className="gap-2">
      <Plus className="w-4 h-4" />
      İlk Yapay Zeka Destekli Dijital Çalışanı Oluştur
    </Button>
  </div>
));

const DashboardAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [calendarStatuses, setCalendarStatuses] = useState<Record<string, CalendarStatus>>({});
  const [calendarLoading, setCalendarLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadAgents = async () => {
      try {
        await fetchAgents();
      } catch (error) {
        console.error('Dijital çalışanlar getirilemedi on mount:', error);
        // Error is already handled in fetchAgents function
      }
    };

    loadAgents();
    
    // Check for OAuth callback success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'true') {
      const agentId = urlParams.get('agent');
      if (agentId) {
        // Refresh calendar status for the connected agent
        setTimeout(async () => {
          try {
            await fetchAllCalendarStatuses();
          } catch (error) {
            console.error('Failed to fetch calendar statuses:', error);
          }
        }, 1000);
        
        toast({
          title: "Başarılı",
          description: "Google Calendar başarıyla bağlandı!",
        });
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    // Fetch calendar statuses only when agents are first loaded
    if (agents.length > 0 && Object.keys(calendarStatuses).length === 0) {
      const loadCalendarStatuses = async () => {
        try {
          await fetchAllCalendarStatuses();
        } catch (error) {
          console.error('Failed to fetch calendar statuses:', error);
        }
      };
      
      loadCalendarStatuses();
    }
  }, [agents.length]); // Only depend on agents count, not the full array

  const fetchAgents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Dijital çalışanlarınızı görüntülemek için lütfen giriş yapın.",
          variant: "destructive",
        });
        return;
      }

      console.log('Dashboard - Frontend User ID:', user.id);

      // Use the API endpoint with proper authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      
      const response = await fetch(`/api/agents?userId=${user.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Dijital çalışanlar getirilemedi');
      }

      const data = await response.json();
      
      console.log('Raw API response data:', data);
      console.log('First agent keys:', data[0] ? Object.keys(data[0]) : 'No agents found');
      
      // Map the data to match the expected interface  
      const mappedAgents = data.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        is_active: agent.is_active !== undefined ? agent.is_active : (agent.isActive !== undefined ? agent.isActive : true),
        created_at: agent.createdAt || agent.created_at || new Date().toISOString(), // Handle both naming conventions
      }));
      
      // Sort agents by created_at in descending order (newest first)
      mappedAgents.sort((a: Agent, b: Agent) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('Mapped agents count:', mappedAgents.length);
      console.log('Sample mapped agent:', mappedAgents[0]);

      setAgents(mappedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load agents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAllCalendarStatuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const statusPromises = agents.map(async (agent) => {
        try {
          const response = await fetch(`/api/calendar/status/${user.id}/${agent.id}`);
          const status = await response.json();
          return { agentId: agent.id, status };
        } catch (error) {
          console.error(`Error fetching calendar status for agent ${agent.id}:`, error);
          return { agentId: agent.id, status: { connected: false } };
        }
      });

      const results = await Promise.all(statusPromises);
      const statusMap: Record<string, CalendarStatus> = {};
      results.forEach(({ agentId, status }) => {
        statusMap[agentId] = status;
      });
      setCalendarStatuses(statusMap);
    } catch (error) {
      console.error('Error in fetchAllCalendarStatuses:', error);
    }
  };

  const handleCalendarConnect = async (agentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCalendarLoading(prev => ({ ...prev, [agentId]: true }));
      
      // Redirect to Google OAuth
      window.location.href = `/auth/google/connect/${user.id}/${agentId}`;
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: "Hata",
        description: "Google Calendar bağlantısı kurulamadı.",
        variant: "destructive",
      });
      setCalendarLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const handleCalendarDisconnect = async (agentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCalendarLoading(prev => ({ ...prev, [agentId]: true }));
    
    try {
      const response = await fetch(`/api/calendar/disconnect/${user.id}/${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      // Update local state
      setCalendarStatuses(prev => ({
        ...prev,
        [agentId]: { connected: false }
      }));

      toast({
        title: "Başarılı",
        description: "Google Calendar bağlantısı kesildi.",
      });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: "Hata",
        description: "Google Calendar bağlantısı kesilemedi.",
        variant: "destructive",
      });
    } finally {
      setCalendarLoading(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const handleAgentClick = useCallback((agentId: string) => {
    navigate(`/dashboard/agents/${agentId}`);
  }, [navigate]);

  const handleToggleAgent = useCallback(async (agentId: string, currentStatus: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      // Update local state using functional update
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, is_active: !currentStatus }
          : agent
      ));

      toast({
        title: "Success",
        description: `Dijital Çalışan ${!currentStatus ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast({
        title: "Error",
        description: "Dijital Çalışan durumu güncellenemedi.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to delete agent');
      }

      const result = await response.json();
      console.log('Delete agent response:', result);

      // Only update local state after confirmed successful deletion
      setAgents(agents.filter(agent => agent.id !== agentId));
      setDeleteAgentId(null);

      // Also refresh agents list to ensure consistency
      fetchAgents();

      toast({
        title: "Success",
        description: result.message || "Dijital Çalışan başarıyla silindi.",
      });
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error",
        description: "Dijital Çalışan silinemedi.",
        variant: "destructive",
      });
    }
  };

  const handleWizardSuccess = useCallback(() => {
    setShowWizard(false);
    fetchAgents(); // Refresh the agents list
    toast({
      title: "Success",
      description: "Dijital Çalışan başarıyla oluşturuldu.",
    });
  }, [fetchAgents, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-full">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Yapay Zeka Destekli Dijital Çalışanlarım</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Tüm dijital çalışanlarınızı görüntüleyin, yönetin ve yeni çalışanlar oluşturun
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Yapay Zeka Destekli Dijital Çalışanlarım</h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Tüm dijital çalışanlarınızı görüntüleyin, yönetin ve yeni çalışanlar oluşturun
        </p>
      </div>

      {/* Agents Grid or Empty State */}
      {agents.length === 0 ? (
        <EmptyState onCreateAgent={() => setShowWizard(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card 
              key={agent.id} 
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => handleAgentClick(agent.id)}
            >
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {agent.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-60 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAgentClick(agent.id);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAgent(agent.id, agent.is_active);
                        }}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {agent.is_active ? 'Deactivate' : 'Activate'} Agent
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteAgentId(agent.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  {agent.role}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={agent.is_active ? "default" : "secondary"}>
                      {agent.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                    {calendarStatuses[agent.id]?.connected && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" />
                        Calendar
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(agent.created_at)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Agent detaylarını görüntülemek için tıklayın
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Agent Creation Wizard */}
      <AgentCreationWizard 
        open={showWizard} 
        onClose={() => {
          setShowWizard(false);
          fetchAgents(); // Refresh agents list after wizard closes
        }}
        fromDashboard={true} // Enable auto-refresh for dashboard users
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAgentId} onOpenChange={() => setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Agent'ı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Seçili AI çalışanınız kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteAgentId && handleDeleteAgent(deleteAgentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardAgents;