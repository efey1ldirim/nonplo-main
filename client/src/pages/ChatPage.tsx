import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Send, ArrowLeft, Bot, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  intent?: string;
  parameters?: Record<string, any>;
}

interface ChatResponse {
  success: boolean;
  response?: {
    text: string;
    sessionId: string;
    responseId?: string;
    intent?: string;
    parameters?: Record<string, any>;
  };
  error?: string;
  debugLogs?: string[];
}

interface Agent {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

export function ChatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, session } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isAgentLoading, setIsAgentLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);



  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch agent data
  useEffect(() => {
    const fetchAgent = async () => {
      if (!agentId || !user || !session?.access_token) return;
      
      console.log('Chat - User ID:', user.id);
      console.log('Chat - Full User Object:', user);

      try {
        setIsAgentLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No valid session found');
        }
        
        const response = await fetch(`/api/agents/${agentId}?userId=${user.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const agentData = await response.json();
          setAgent(agentData);
          
          // Add welcome message
          const welcomeMessage: ChatMessage = {
            id: 'welcome-' + Date.now(),
            sender: 'agent',
            content: `Merhaba! Ben ${agentData.name}, ${agentData.role}. Size nasıl yardımcı olabilirim?`,
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        } else {
          toast({
            title: 'Hata',
            description: 'Dijital Çalışan bilgileri yüklenemedi',
            variant: 'destructive',
          });
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Agent fetch error:', error);
        toast({
          title: 'Hata',
          description: 'Dijital Çalışan bilgileri yüklenirken bir hata oluştu',
          variant: 'destructive',
        });
      } finally {
        setIsAgentLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, user, session?.access_token, navigate, toast]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !agentId || !user || !session?.access_token || isLoading) {
      return;
    }

    // Check if agent is active
    if (!agent?.is_active) {
      toast({
        title: 'Chat Devre Dışı',
        description: 'Bu Yapay Zeka Destekli Dijital Çalışan şu anda pasif durumda. Çalışan ayarlarından aktif hale getirebilirsiniz.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('Chat mesaj gönderiliyor - userId:', user.id);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: agent?.openaiAssistantId || 'default-assistant',
          message: messageToSend,
          agentId: agentId,
        }),
      });

      const data: ChatResponse = await response.json();

      if (data.success && data.response) {
        const agentMessage: ChatMessage = {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          content: data.response,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, agentMessage]);
        
        // Update thread ID for session tracking
        if (data.threadId) {
          setSessionId(data.threadId);
        }

        // Show debug logs in development
        if (data.debugLogs && process.env.NODE_ENV === 'development') {
          console.log('Chat Debug Logs:', data.debugLogs);
        }
      } else {
        throw new Error(data.error || 'Bilinmeyen hata');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        sender: 'agent',
        content: 'Üzgünüm, şu anda bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: 'Mesaj Gönderilemedi',
        description: error.message || 'Bir hata oluştu, lütfen tekrar deneyin',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isAgentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Dijital Çalışan yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Dijital Çalışan Bulunamadı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Belirtilen agent bulunamadı veya erişim yetkiniz yok.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Dashboard'a Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar>
              <AvatarFallback>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{agent.name}</h1>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
            </div>
          </div>

        </div>
      </div>





      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div key={message.id}>
              <div
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'agent' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {message.intent && (
                      <Badge variant="outline" className="text-xs">
                        {message.intent}
                      </Badge>
                    )}
                  </div>
                </div>

                {message.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              
              {index < messages.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={!agent?.is_active ? "Bu Yapay Zeka Destekli Dijital Çalışan şu anda devre dışı..." : "Mesajınızı yazın..."}
            disabled={isLoading || !agent?.is_active}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || !agent?.is_active}
            size="icon"
            title={!agent?.is_active ? "Dijital Çalışan pasif durumda" : "Mesaj gönder"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}