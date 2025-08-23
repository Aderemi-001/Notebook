import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquareText, Send, Loader2, Bot, User2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const CHATBOT_API_URL = `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/chatbot-qa`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User not authenticated. Please log in to use the chatbot.");
      }

      const response = await fetch(CHATBOT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU",
        },
        body: JSON.stringify({ user_query: input }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to get response from chatbot.");
      }

      const botMessage: ChatMessage = {
        id: messages.length + 2,
        sender: 'bot',
        text: result.chatbot_response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      showError(err.message || "An unexpected error occurred with the chatbot.");
      console.error("Chatbot error:", err);
      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        sender: 'bot',
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-4 right-4 rounded-full h-14 w-14 shadow-lg z-50"
          aria-label="Open Chatbot"
        >
          <MessageSquareText className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> How-To Chatbot
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow flex flex-col border rounded-md p-4 bg-muted/20 overflow-hidden">
          <ScrollArea className="flex-grow pr-4 -mr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Hi there! I'm your personal assistant for "My Notebook".</p>
                  <p>Ask me anything about how to use the app!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3",
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.sender === 'bot' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                    <div
                      className={cn(
                        "max-w-[70%] p-3 rounded-lg shadow-sm",
                        msg.sender === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-background text-foreground rounded-bl-none border'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <span className="block text-xs text-muted-foreground mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {msg.sender === 'user' && <User2 className="h-6 w-6 text-muted-foreground flex-shrink-0" />}
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex items-start gap-3 justify-start">
                  <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                  <div className="max-w-[70%] p-3 rounded-lg shadow-sm bg-background text-foreground rounded-bl-none border">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Ask me a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isSending}
            className="flex-grow"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isSending}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Chatbot;