export interface ChatbotMessage {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}