import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bot, User2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './types';
import { Button } from '@/components/ui/button';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onFeedback: (messageId: number, feedback: 'up' | 'down') => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, isSending, messagesEndRef, onFeedback }) => {
  return (
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
                  {msg.sender === 'bot' && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6", msg.feedbackGiven === 'up' && "text-green-500")}
                        onClick={() => onFeedback(msg.id, 'up')}
                        disabled={!!msg.feedbackGiven}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6", msg.feedbackGiven === 'down' && "text-red-500")}
                        onClick={() => onFeedback(msg.id, 'down')}
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
  );
};

export default ChatMessageList;