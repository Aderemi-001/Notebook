import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, Loader2, Bot, User2, ThumbsUp, ThumbsDown, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '@/components/chatbot/types';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { getDynamicSuggestions, parseAndRenderLinks } from '@/components/chatbot/utils';
import { supabase } from '@/integrations/supabase/client';
import { NovaBrain, NovaContext } from '@/components/chatbot/logic/NovaBrain';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, loading: isLoadingAuth } = useAuth();
  const location = useLocation();
  const inactivityTimerRef = useRef<number | null>(null);

  // State for context awareness
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: "I haven't heard from you in a while. I'll clear my memory to save energy. Start a new topic whenever you're ready!",
        sender: 'system',
        timestamp: new Date(),
      }]);
    }, INACTIVITY_TIMEOUT_MS) as unknown as number;
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      resetInactivityTimer();
    } else {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    }
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isOpen, isMinimized, resetInactivityTimer]);

  useEffect(scrollToBottom, [messages, isOpen, isMinimized]);

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
    setThinkingStep("Thinking...");
    resetInactivityTimer();

    if (!user) {
      // ... existing login check ...
      const loginPromptMessage: ChatMessage = {
        id: Date.now() + 1,
        text: "Please log in to chat with Nova! 🔒",
        sender: 'system',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, loginPromptMessage]);
      setIsSending(false);
      setThinkingStep(null);
      return;
    }

    try {
      // 1. Build Context
      const currentHour = new Date().getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night' = 'morning';
      if (currentHour >= 12 && currentHour < 17) timeOfDay = 'afternoon';
      else if (currentHour >= 17 && currentHour < 22) timeOfDay = 'evening';
      else if (currentHour >= 22 || currentHour < 5) timeOfDay = 'late_night';

      const context: NovaContext = {
        route: location.pathname,
        user: user,
        timeOfDay: timeOfDay
      };

      // 2. Process via Nova Native Brain
      setThinkingStep("Consulting memory...");
      const response = await NovaBrain.processQuery(query, context);
      setThinkingStep("Formulating...");

      // 3. Handle Action Redirects
      if (response.action === 'navigate' && response.actionTarget) {
        // We could auto-navigate, but for now just show the link/text
      }

      // 4. Handle Search Requirement
      let textToSend = response.text;
      let cardResults: any = null;

      if (response.action === 'search' && response.actionTarget) {
        setThinkingStep("Scanning notes...");
        const keywords = response.actionTarget.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const searchCondition = keywords.map(k => `term.ilike.%${k}%,definition.ilike.%${k}%`).join(',');

        const { data: cards, error } = await supabase
          .from('cards')
          .select('term, definition, study_sets(id, title)')
          .or(searchCondition)
          .limit(3);

        if (!error && cards && cards.length > 0) {
          textToSend = `I found **${cards.length}** matches for "${response.actionTarget}":`;
          cardResults = cards;
        } else {
          textToSend = `I looked through your notes for "${response.actionTarget}" but didn't find exact matches. Should we create a new set?`;
        }
      }

      // Simulate small "human" delay for processing time
      await new Promise(r => setTimeout(r, 600));

      // 5. Construct Final Message
      const botResponse: ChatMessage = {
        id: Date.now() + 1,
        text: parseAndRenderLinks(textToSend),
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botResponse]);

      if (cardResults) {
        const cardContent = (
          <div className="space-y-4 mt-2">
            {cardResults.map((card: any, index: number) => (
              <div key={index} className="p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="font-bold text-foreground mb-1">{card.term}</div>
                <div className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {card.definition}
                </div>
                {card.study_sets && (
                  <Link
                    to={`/sets/${card.study_sets.id}?highlight=${encodeURIComponent(card.term)}`}
                    onClick={() => { setIsMinimized(true); }}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    from {card.study_sets.title}
                  </Link>
                )}
              </div>
            ))}
          </div>
        );

        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          text: cardContent,
          sender: 'bot',
          timestamp: new Date()
        }]);
      }

    } catch (error) {
      console.error("Nova Brain Error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: "My thought process was interrupted. 😵‍💫 Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      setThinkingStep(null);
    }
  };

  const handleFeedback = (messageId: number, feedback: 'up' | 'down') => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, feedbackGiven: feedback } : msg
      )
    );
    // Simulate feedback submission
    console.log(`Feedback for message ${messageId}: ${feedback}`);
  };

  const suggestedQuestions = getDynamicSuggestions(location.pathname);

  // --- UI Renders ---

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-4 md:right-4 rounded-full p-4 h-14 w-14 shadow-xl z-50 hover:scale-105 transition-transform bg-primary text-primary-foreground"
        aria-label="Open Nova Chatbot"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 bg-background border shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
      isMinimized
        ? "bottom-24 right-4 md:bottom-4 md:right-4 w-72 h-14 rounded-full cursor-pointer"
        : "bottom-0 right-0 w-full h-[100dvh] sm:bottom-4 sm:right-4 sm:w-[400px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl"
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-primary text-primary-foreground cursor-pointer"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5" />
          <div className={cn("flex flex-col transition-all", isMinimized ? "justify-center" : "justify-start")}>
            <span className="font-bold leading-none">Nova</span>
            {!isMinimized && <span className="text-[10px] opacity-80 uppercase tracking-wider leading-tight">AI Assistant</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isMinimized ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                <X className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Minimized State Content (Just a prompt) */}
      {isMinimized && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Visual sugar if needed */}
        </div>
      )}

      {/* Main Chat Area */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full px-4 py-4">
              <div className="space-y-6 pb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Hi, I'm Nova!</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      I can help you create notes, find study sets, or explain features.
                      <br />
                      Try asking: <span className="font-medium">"How do I create a set?"</span>
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {suggestedQuestions.slice(0, 3).map((q, i) => (
                        <Button key={i} variant="outline" size="sm" className="justify-start text-xs h-auto py-2 whitespace-normal text-left" onClick={() => handleSendMessage(q)}>
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.sender === 'user' ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                        msg.sender === 'user' ? "bg-secondary" : "bg-primary text-primary-foreground"
                      )}>
                        {msg.sender === 'user' ? <User2 className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        msg.sender === 'user'
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none border"
                      )}>
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                        {msg.sender === 'bot' && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10">
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-green-600" onClick={() => handleFeedback(msg.id, 'up')} disabled={!!msg.feedbackGiven}>
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-red-500" onClick={() => handleFeedback(msg.id, 'down')} disabled={!!msg.feedbackGiven}>
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isSending && thinkingStep && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 animate-pulse">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted text-foreground rounded-2xl rounded-tl-none border px-4 py-3 max-w-[80%] flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium italic">{thinkingStep}</span>
                    </div>
                  </div>
                )}       <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-background/95 backdrop-blur">
            {messages.length > 0 && messages.length < 3 && (
              <div className="flex overflow-x-auto gap-2 mb-3 pb-1 scrollbar-hide">
                {suggestedQuestions.map((q, i) => (
                  <Button key={i} variant="outline" size="sm" className="flex-shrink-0 text-xs rounded-full h-7 px-3" onClick={() => handleSendMessage(q)}>
                    {q}
                  </Button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
              className="flex gap-2"
            >
              <Input
                placeholder="Ask Nova anything..."
                value={input}
                onChange={(e) => { setInput(e.target.value); resetInactivityTimer(); }}
                disabled={isSending || isLoadingAuth}
                className="rounded-full pl-4 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-full w-10 h-10 shrink-0 shadow-sm"
                disabled={!input.trim() || isSending || isLoadingAuth}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Chatbot;