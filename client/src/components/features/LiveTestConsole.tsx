import { useState, useEffect, useRef } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, MessageSquare } from 'lucide-react';

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

interface LiveTestConsoleProps {
  agentId: string;
  agentName: string;
  agentRole: string;
}

export default function LiveTestConsole({ agentId, agentName, agentRole }: LiveTestConsoleProps) {
  const { user, session } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Center card on mobile when textarea is focused
  const centerCardOnMobile = () => {
    // Only on mobile devices (width <= 768px) and when virtual keyboard is likely to appear
    const isMobile = window.innerWidth <= 768 && 'ontouchstart' in window;
    
    if (isMobile && cardRef.current) {
      // Multiple timeouts to handle different keyboard animation speeds
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
      
      // Second attempt for slower keyboards
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }, 600);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (!isInitialized && agentName && agentRole) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome-' + Date.now(),
        sender: 'agent',
        content: `Merhaba! Ben ${agentName}, ${agentRole}. Bu test konsolunda benimle sohbet edebilirsiniz. Size nasıl yardımcı olabilirim?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setIsInitialized(true);
    }
  }, [agentName, agentRole, isInitialized]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !agentId || !user || !session?.access_token || isLoading) {
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
      const requestPayload = {
        assistantId: agent?.openaiAssistantId || 'default-assistant',
        message: messageToSend,
        agentId: agentId,
        ...(sessionId && { threadId: sessionId })
      };
      
      console.log('Test Console - İstek gönderiliyor:', requestPayload);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
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
          console.log('Test Console Debug Logs:', data.debugLogs);
        }
      } else {
        throw new Error(data.error || 'Bilinmeyen hata');
      }
    } catch (error: any) {
      console.error('Test Console Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        sender: 'agent',
        content: 'Üzgünüm, şu anda bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: 'Test Mesajı Gönderilemedi',
        description: error.message || 'Bir hata oluştu, lütfen tekrar deneyin',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome-' + Date.now(),
      sender: 'agent',
      content: `Merhaba! Ben ${agentName}, ${agentRole}. Bu test konsolunda benimle sohbet edebilirsiniz. Size nasıl yardımcı olabilirim?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setSessionId('');
  };

  return (
    <Card ref={cardRef}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Canlı Test Konsolu
            </CardTitle>
            <CardDescription>
              Yapay Zeka Destekli Dijital Çalışanınızı mevcut ayarlarla test edin
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={clearChat}>
            Sohbeti Temizle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages Area */}
        <div className="border rounded-lg">
          <ScrollArea className="h-80 p-3">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <div
                    className={`flex gap-2 ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.sender === 'agent' && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
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
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  
                  {index < messages.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-100" />
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={centerCardOnMobile}
            placeholder="Test mesajınızı yazın..."
            disabled={isLoading}
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            rows={2}
            data-testid="input-test-message"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Info */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Test Oturumu:</span>
          <Badge variant="outline" className="text-xs">
            {sessionId ? `Aktif (${sessionId.substring(0, 8)}...)` : 'Yeni'}
          </Badge>
          <span>Dijital Çalışan ID:</span>
          <Badge variant="outline" className="text-xs font-mono">
            {agentId.substring(0, 8)}...
          </Badge>
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6 px-2"
              onClick={() => console.log('Debug Info:', { agentId, agentName, agentRole, userId: user?.id })}
            >
              Debug
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}