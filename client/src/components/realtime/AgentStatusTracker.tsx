import { useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity, MessageCircle, Clock, TrendingUp } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
}

interface AgentMetrics {
  agentId: string;
  conversationsCount: number;
  messagesCount: number;
  avgResponseTime: number;
  status: 'online' | 'busy' | 'offline';
}

interface AgentStatusTrackerProps {
  agents: Agent[];
}

export const AgentStatusTracker = ({ agents: initialAgents }: AgentStatusTrackerProps) => {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [metrics, setMetrics] = useState<Record<string, AgentMetrics>>({});

  // Real-time agent status updates
  const { isConnected: agentsConnected } = useRealtimeSubscription(
    {
      table: 'agents',
      event: 'UPDATE'
    },
    (payload) => {
      const updatedAgent = payload.new as Agent;
      setAgents(prev => 
        prev.map(agent => 
          agent.id === updatedAgent.id 
            ? { ...agent, isActive: updatedAgent.isActive, updatedAt: updatedAgent.updatedAt }
            : agent
        )
      );
    }
  );

  // Real-time conversation tracking for metrics
  const { isConnected: conversationsConnected } = useRealtimeSubscription(
    {
      table: 'conversations',
      event: '*'
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        const conversation = payload.new;
        setMetrics(prev => ({
          ...prev,
          [conversation.agent_id]: {
            ...prev[conversation.agent_id],
            conversationsCount: (prev[conversation.agent_id]?.conversationsCount || 0) + 1,
            status: 'busy' as const
          }
        }));
      }
    }
  );

  // Real-time message tracking
  const { isConnected: messagesConnected } = useRealtimeSubscription(
    {
      table: 'messages',
      event: 'INSERT'
    },
    (payload) => {
      // This would require a join to get agent_id from conversation
      // For simplicity, we'll update this when we have the full data model
      console.log('New message:', payload.new);
    }
  );

  const getAgentStatus = (agent: Agent): 'online' | 'busy' | 'offline' => {
    const metric = metrics[agent.id];
    if (!agent.isActive) return 'offline';
    if (metric?.status) return metric.status;
    
    // Simple heuristic based on recent activity
    const lastUpdate = new Date(agent.updatedAt);
    const now = new Date();
    const minutesAgo = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    return minutesAgo < 5 ? 'online' : 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const isFullyConnected = agentsConnected && conversationsConnected && messagesConnected;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Dijital Çalışan Durum Takipçisi
          </span>
          <Badge variant={isFullyConnected ? "default" : "destructive"}>
            {isFullyConnected ? "Live Tracking" : "Connecting..."}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const status = getAgentStatus(agent);
            const agentMetrics = metrics[agent.id];
            
            return (
              <Card key={agent.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>
                          {agent.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(status)}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{agent.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{agentMetrics?.conversationsCount || 0} chats</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{agentMetrics?.messagesCount || 0} msgs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{agentMetrics?.avgResponseTime || 0}s avg</span>
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(agent.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {agents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No agents found. Create an agent to start tracking.
          </div>
        )}
      </CardContent>
    </Card>
  );
};