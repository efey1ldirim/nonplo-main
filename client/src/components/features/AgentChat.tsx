import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AgentChatProps {
  agentId: string;
  agentName: string;
  assistantId?: string;
  onClose?: () => void;
}

export function AgentChat({ agentId, agentName, assistantId, onClose }: AgentChatProps) {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [chatMessages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      assistantId: string;
      message: string;
      agentId: string;
      threadId?: string;
    }) => {
      return await apiRequest('/api/chat', {
        method: 'POST',
        body: messageData
      });
    },
    onSuccess: (data) => {
      console.log('✅ Message sent successfully:', data);
      
      // Store threadId for future messages
      if (data.threadId) {
        setThreadId(data.threadId);
      }
      
      // Add assistant response to chat
      if (data.response) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        
        setChatMessages(prev => [...prev, assistantMessage]);
      }
      
      setIsLoading(false);
    },
    onError: (error: any) => {
      console.error('❌ Failed to send message:', error);
      toast({
        title: "Hata",
        description: error.message || "Mesaj gönderilemedi",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    if (!assistantId) {
      toast({
        title: "Hata",
        description: "Bu agent için Assistant ID bulunamadı",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Add user message to chat immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);

    const messageData = {
      assistantId,
      message: message.trim(),
      agentId,
      ...(threadId && { threadId })
    };

    setMessage('');
    sendMessageMutation.mutate(messageData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col" data-testid="agent-chat">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {agentName} ile Chat
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-chat">
              ✕
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 h-[400px]" ref={scrollAreaRef} data-testid="messages-area">
          <div className="space-y-4 pr-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Henüz mesaj yok. İlk mesajınızı gönderin!</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${msg.sender}-${msg.id}`}
                >
                  {msg.sender === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  {msg.sender === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start" data-testid="typing-indicator">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <p className="text-sm">Yazıyor...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Mesajınızı yazın..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading || !assistantId}
            size="sm"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {!assistantId && (
          <p className="text-xs text-muted-foreground text-center">
            Bu agent için OpenAI Assistant henüz oluşturulmamış
          </p>
        )}
      </CardContent>
    </Card>
  );
}