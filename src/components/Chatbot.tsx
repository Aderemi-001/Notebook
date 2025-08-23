import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquareText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useLocation } from 'react-router-dom';

// Import modular components and types/utils
import ChatHeader from './chatbot/ChatHeader';
import ChatMessageList from './chatbot/ChatMessageList';
import ChatInput from './chatbot/ChatInput';
import SuggestedQuestions from './chatbot/SuggestedQuestions';
import { ChatMessage } from './chatbot/types';
import { parseAndRenderLinks, getDynamicSuggestions } from './chatbot/utils'; // Updated import path

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const LOCAL_STORAGE_KEY = 'chatbotMessages';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedMessages ? JSON.parse(savedMessages).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })) : [];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const CHATBOT_API_URL = `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/chatbot-qa`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setMessages([]);
      setInput('');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      console.log("Chatbot reset due to inactivity.");
    }, INACTIVITY_TIMEOUT_MS);
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

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    resetInactivityTimer();

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
          // 'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU", // Removed apikey
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
        text: parseAndRenderLinks(result.chatbot_response),
        timestamp: new Date(),
        feedbackGiven: null,
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
        feedbackGiven: null,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestedQuestionClick = (question: string) => {
    resetInactivityTimer();
    setInput(question);
    setTimeout(() => {
      handleSendMessage();
    }, 0);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput('');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    resetInactivityTimer();
  };

  const handleFeedback = (messageId: number, feedback: 'up' | 'down') => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, feedbackGiven: feedback } : msg
      )
    );
    console.log(`Feedback for message ${messageId}: ${feedback}`);
    // Here you could send this feedback to a backend service
  };

  const currentSuggestions = getDynamicSuggestions(location.pathname);
  const showSuggestions = messages.length === 0 && !isSending && !input.trim();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      resetInactivityTimer();
    }}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-4 right-4 rounded-full h-14 w-14 shadow-lg z-50"
          aria-label="Open Chatbot"
          onClick={resetInactivityTimer}
        >
          <MessageSquareText className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <ChatHeader onClearChat={handleClearChat} />
        <ChatMessageList
          messages={messages}
          isSending={isSending}
          messagesEndRef={messagesEndRef}
          onFeedback={handleFeedback}
        />
        {showSuggestions && (
          <SuggestedQuestions
            suggestions={currentSuggestions}
            onQuestionClick={handleSuggestedQuestionClick}
          />
        )}
        <ChatInput
          input={input}
          setInput={setInput}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          resetInactivityTimer={resetInactivityTimer}
        />
      </SheetContent>
    </Sheet>
  );
};

export default Chatbot;