"use client";

import React from "react";
import { ChatbotMessage } from "@/types/Chatbot";
import { cn } from "@/lib/utils"; // Assuming this utility exists for conditional class names
import { Loader2 } from "lucide-react"; // For loading spinner

interface ChatMessageListProps {
  messages: ChatbotMessage[];
  isSending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessageList({ messages, isSending, messagesEndRef }: ChatMessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex",
            message.sender === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[70%] p-3 rounded-lg",
              message.sender === "user"
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-gray-200 text-gray-800 rounded-bl-none"
            )}
          >
            <p>{message.text}</p>
            <span className="text-xs opacity-75 mt-1 block">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
      {isSending && (
        <div className="flex justify-start">
          <div className="max-w-[70%] p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}