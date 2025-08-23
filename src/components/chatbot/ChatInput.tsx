import * as React from 'react'; // Explicitly import React
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  resetInactivityTimer: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, onSendMessage, isSending, resetInactivityTimer }) => {
  return (
    <div className="flex gap-2 mt-4">
      <Input
        placeholder="Ask me a question..."
        value={input}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setInput(e.target.value);
          resetInactivityTimer();
        }}
        onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && onSendMessage()}
        disabled={isSending}
        className="flex-grow"
      />
      <Button onClick={onSendMessage} disabled={!input.trim() || isSending}>
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
};

export default ChatInput;