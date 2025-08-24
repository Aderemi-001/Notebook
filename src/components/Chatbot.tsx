import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessageList from '@/components/chatbot/ChatMessageList';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from '@/components/chatbot/types'; // Import ChatMessage from types.ts

// Removed: interface ChatMessage { ... } - This local definition was causing the conflict.

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, loading: isLoadingAuth } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (!user) {
      const loginPromptMessage: ChatMessage = {
        id: Date.now() + 1,
        text: "It looks like you're not logged in. Please log in to use the chatbot and get personalized assistance!",
        sender: 'system',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, loginPromptMessage]);
      setIsLoading(false);
      return;
    }

    try {
      const aiResponse: ChatMessage = {
        id: Date.now() + 1,
        text: `Hello ${user.email}! You asked: "${userMessage.text}". I'm still under development, but I'm learning!`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setTimeout(() => {
        setMessages((prev) => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: 'Oops! Something went wrong. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          className="fixed bottom-4 right-4 rounded-full p-3 shadow-lg"
          onClick={() => setIsOpen(true)}
          aria-label="Open chatbot"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 w-80 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col border border-gray-200 dark:border-gray-700 z-50">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">How-To Chatbot</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close chatbot">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ScrollArea className="flex-grow p-4">
            <ChatMessageList messages={messages} />
            <div ref={messagesEndRef} />
          </ScrollArea>
          <form onSubmit={handleSendMessage} className="flex p-4 border-t border-gray-200 dark:border-gray-700">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={user ? "Ask me anything..." : "Log in to chat..."}
              className="flex-grow mr-2"
              disabled={isLoading || isLoadingAuth}
            />
            <Button type="submit" disabled={isLoading || isLoadingAuth}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;