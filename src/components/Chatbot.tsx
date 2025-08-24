import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Send, Loader2, Bot, User2, ThumbsUp, ThumbsDown, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage, DEFAULT_SUGGESTED_QUESTIONS } from '@/components/chatbot/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { getDynamicSuggestions, parseAndRenderLinks } from '@/components/chatbot/utils';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, loading: isLoadingAuth } = useAuth();
  const location = useLocation();
  const inactivityTimerRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setMessages([{
        id: Date.now(),
        text: "It looks like you've been inactive for a while. Let's start fresh! How can I help you today?",
        sender: 'system',
        timestamp: new Date(),
      }]);
    }, INACTIVITY_TIMEOUT_MS) as unknown as number; // Cast to number for clearTimeout
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetInactivityTimer();
    } else {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    }
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isOpen, resetInactivityTimer]);

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (query: string) => {
    if (query.trim() === '' || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      text: query,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    resetInactivityTimer();

    if (!user) {
      const loginPromptMessage: ChatMessage = {
        id: Date.now() + 1,
        text: "It looks like you're not logged in. Please log in to use the chatbot and get personalized assistance!",
        sender: 'system',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, loginPromptMessage]);
      setIsSending(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please log in again.");
      }

      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/chatbot-qa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ user_query: query }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to get a response from the chatbot.");
      }

      const botResponse: ChatMessage = {
        id: Date.now() + 1,
        text: parseAndRenderLinks(result.chatbot_response),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);

    } catch (error: any) {
      console.error('Error sending message to chatbot:', error);
      showError(error.message || 'Oops! Something went wrong with the chatbot. Please try again.');
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: 'I apologize, but I encountered an error. Please try asking again or rephrase your question.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    resetInactivityTimer();
  };

  const handleFeedback = (messageId: number, feedback: 'up' | 'down') => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, feedbackGiven: feedback } : msg
      )
    );
    // In a real application, you would send this feedback to your backend
    console.log(`Feedback for message ${messageId}: ${feedback}`);
  };

  const suggestedQuestions = getDynamicSuggestions(location.pathname);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-4 right-4 rounded-full p-3 shadow-lg z-50"
          aria-label="Open chatbot"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full z-[999]">
        <SheetHeader className="flex flex-row items-center justify-between pr-6">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> How-To Chatbot
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={handleClearChat} aria-label="Clear Chat">
            <X className="h-5 w-5 text-muted-foreground" />
          </Button>
        </SheetHeader>
        <Separator className="my-2" />

        <div className="flex-grow flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow pr-4 -mr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Hi there! I'm your personal assistant for "My Notebook".</p>
                  <p>Ask me anything about how to use the app!</p>
                </div>
              ) : (
                messages.map((msg: ChatMessage) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3",
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.sender !== 'user' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
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
                      {msg.sender === 'bot' && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-6 w-6", msg.feedbackGiven === 'up' && "text-green-500")}
                            onClick={() => handleFeedback(msg.id, 'up')}
                            disabled={!!msg.feedbackGiven}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-6 w-6", msg.feedbackGiven === 'down' && "text-red-500")}
                            onClick={() => handleFeedback(msg.id, 'down')}
                            disabled={!!msg.feedbackGiven}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
                    <span className="ml-2 text-sm">Bot is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Suggested Questions */}
        {messages.length === 0 && (
          <div className="mt-4 p-2 border rounded-md bg-muted/20">
            <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" /> Suggested Questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question: string, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(question)}
                  className="h-auto py-1.5 px-3 text-xs whitespace-normal text-left"
                  disabled={isSending || isLoadingAuth}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex gap-2 mt-4">
          <Input
            placeholder={user ? "Ask me a question..." : "Log in to chat..."}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setInput(e.target.value);
              resetInactivityTimer();
            }}
            disabled={isSending || isLoadingAuth || !user}
            className="flex-grow"
          />
          <Button type="submit" disabled={!input.trim() || isSending || isLoadingAuth || !user}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default Chatbot;