"use client";

import { useState, useCallback } from "react";
import { ChatbotMessage } from "@/types/Chatbot";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

interface UseChatbotReturn {
  messages: ChatbotMessage[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

export function useChatbot(): UseChatbotReturn {
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: ChatbotMessage = {
      id: uuidv4(),
      text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: { message: text },
      });

      if (error) {
        console.error("Error invoking chatbot function:", error);
        const errorMessage: ChatbotMessage = {
          id: uuidv4(),
          text: "Sorry, I couldn't process that. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const botMessage: ChatbotMessage = {
          id: uuidv4(),
          text: data.response || "I received your message!",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      const errorMessage: ChatbotMessage = {
        id: uuidv4(),
        text: "An unexpected error occurred. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, sendMessage, isLoading };
}