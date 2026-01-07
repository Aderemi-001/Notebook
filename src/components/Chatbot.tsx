import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, Bot, User2, ThumbsUp, ThumbsDown, X, Maximize2, Minimize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '@/components/chatbot/types';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const inactivityTimerRef = useRef<number | null>(null);

  // Check for active study set
  const matchSet = location.pathname.match(/\/sets\/([a-f0-9-]+)/);
  const activeSetId = matchSet ? matchSet[1] : null;

  // Fetch active set context if on a set page
  const [activeSetContext, setActiveSetContext] = useState<any>(null);

  useEffect(() => {
    const fetchSetContext = async () => {
      if (!activeSetId || !isOpen) {
        setActiveSetContext(null);
        return;
      }

      try {
        // Fetch basic set info and top cards
        const { data: setInfo, error } = await supabase
          .from('study_sets')
          .select('id, title, description, cards(term, definition)')
          .eq('id', activeSetId)
          .single();

        if (error) throw error;

        if (setInfo) {
          setActiveSetContext({
            id: setInfo.id,
            title: setInfo.title,
            description: setInfo.description,
            topCards: setInfo.cards?.slice(0, 5) // Send top 5 cards for context
          });
        }
      } catch (e) {
        console.error("Failed to fetch set context for chatbot:", e);
      }
    };

    fetchSetContext();
  }, [activeSetId, isOpen]);

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
    // Mobile Back Button Support
    if (isOpen) {
      if (!isMinimized) {
        // Push state only if we aren't already in a chat state (simple check)
        // This makes "Back" close the chatbot on mobile instead of leaving the app
        const currentState = window.history.state;
        if (!currentState || currentState.modal !== 'chatbot') {
          window.history.pushState({ modal: 'chatbot' }, '');
        }
      }
    } else {
      // If closed, we might need to pop state if we were the one who pushed it?
      // Actually, safer to just rely on the popstate event handler below to clean up state 
      // OR let valid navigation handle it. 
      // But if user clicks X, we should ideally go back() if we are in modal state, 
      // but that might be complex. 
      // Simplest: just ensure when BACK is pressed, we close.
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const handlePopState = (_event: PopStateEvent) => {
      // If back button is pressed and checking specific logic isn't strictly needed 
      // if we assume only chatbot pushes this 'modal' state.
      // But simpler: if Back is pressed and Chatbot is Open, it will trigger this.
      if (isOpen) {
        setIsOpen(false);
        // We prevent default behavior? No, popstate happened already.
        // We just update React state to match.
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);

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

      // Convert recent chat messages to history format for AI context
      const history = messages
        .filter(m => m.sender === 'user' || m.sender === 'bot')
        .slice(-10) // Keep last 10 messages for context window efficiency
        .map(m => ({
          role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
          // Prefer rawText for bot messages (which may be JSX), fallback to text if string
          content: m.rawText || (typeof m.text === 'string' ? m.text : '')
        }));

      const context: NovaContext = {
        route: location.pathname,
        user: user,
        timeOfDay: timeOfDay,
        activeStudySet: activeSetContext,
        conversationHistory: history
      };

      // 2. Process via Nova Native Brain
      setThinkingStep("Consulting memory...");
      const response = await NovaBrain.processQuery(query, context);
      setThinkingStep("Formulating...");

      // 3. Handle Action Redirects
      if (response.action === 'navigate' && response.actionTarget) {
        // Dispatch animation event for DashboardLayout
        window.dispatchEvent(new CustomEvent('novaRedirect'));

        // Wait for animation to cover screen before navigating (1.2s)
        await new Promise(resolve => setTimeout(resolve, 1200));

        navigate(response.actionTarget);
        if (window.innerWidth < 768) {
          setIsOpen(false); // Close on mobile after nav
        }
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
        rawText: textToSend, // Store raw text for AI context history
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
          rawText: "I found some matching cards for you.", // Fallback text for history
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
        className="fixed bottom-24 right-4 md:bottom-4 md:right-4 rounded-full p-4 h-14 w-14 shadow-xl z-50 hover:scale-105 transition-transform bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white"
        aria-label="Open Nova Chatbot"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed z-[100] bg-background/95 backdrop-blur-xl border-l shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
      isMinimized
        ? "bottom-24 right-4 md:bottom-4 md:right-4 w-72 h-14 rounded-full cursor-pointer border"
        : "top-0 right-0 h-full w-full sm:w-[420px] sm:max-w-[90vw]"
    )}>
      {/* Header */}
      <div
        className="flex-none flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white cursor-pointer z-10"
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
          <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
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
                  <div key={msg.id} className={cn("flex gap-3 animate-pop-in", msg.sender === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                      msg.sender === 'user' ? "bg-secondary" : "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white"
                    )}>
                      {msg.sender === 'user' ? <User2 className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm break-words",
                      msg.sender === 'user'
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none border"
                    )}>
                      <div className="whitespace-pre-wrap leading-relaxed break-words">{msg.text}</div>
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1 animate-pulse">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted text-foreground rounded-2xl rounded-tl-none border px-4 py-4 max-w-[80%] flex items-center gap-1.5 min-h-[46px] shadow-sm">
                    <div className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-typing-dot [animation-delay:-0.32s]"></div>
                    <div className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-typing-dot [animation-delay:-0.16s]"></div>
                    <div className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-none p-4 border-t bg-background/95 backdrop-blur pb-safe">
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