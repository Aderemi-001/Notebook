import * as React from 'react'; // Explicitly import React
import { Button } from '@/components/ui/button';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Bot, XCircle } from 'lucide-react';

interface ChatHeaderProps {
  onClearChat: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onClearChat }) => {
  return (
    <SheetHeader className="flex flex-row items-center justify-between pr-6">
      <SheetTitle className="flex items-center gap-2">
        <Bot className="h-5 w-5" /> How-To Chatbot
      </SheetTitle>
      <Button variant="ghost" size="icon" onClick={onClearChat} aria-label="Clear Chat">
        <XCircle className="h-5 w-5 text-muted-foreground" />
      </Button>
    </SheetHeader>
  );
};

export default ChatHeader;