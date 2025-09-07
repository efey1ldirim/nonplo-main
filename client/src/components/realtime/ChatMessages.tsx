import { useEffect, useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'user' | 'agent';
  created_at: string;
}

interface ChatMessagesProps {
  conversationId: string;
  initialMessages?: Message[];
}

export const ChatMessages = ({ conversationId, initialMessages = [] }: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessageCount, setNewMessageCount] = useState(0);

  // Real-time subscription for new messages
  const { isConnected, error } = useRealtimeSubscription(
    {
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'INSERT'
    },
    (payload) => {
      const newMessage = payload.new as Message;
      setMessages(prev => [...prev, newMessage]);
      setNewMessageCount(prev => prev + 1);
      
      // Auto-scroll to new message
      setTimeout(() => {
        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }, 100);
    }
  );

  // Real-time subscription for message updates
  useRealtimeSubscription(
    {
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'UPDATE'
    },
    (payload) => {
      const updatedMessage = payload.new as Message;
      setMessages(prev => 
        prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
      );
    }
  );

  // Clear new message count when user scrolls to bottom
  useEffect(() => {
    const handleScroll = () => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        const isAtBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 10;
        if (isAtBottom) {
          setNewMessageCount(0);
        }
      }
    };

    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    scrollArea?.addEventListener('scroll', handleScroll);
    return () => scrollArea?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Chat Messages</h3>
          <div className="flex items-center gap-2">
            {newMessageCount > 0 && (
              <Badge variant="secondary">
                {newMessageCount} new
              </Badge>
            )}
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Live" : "Disconnected"}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive text-sm">
            Connection error: {error}
          </div>
        )}

        <ScrollArea className="h-[400px] p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender_type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start a conversation!
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};