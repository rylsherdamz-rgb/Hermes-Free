export type AIModel = "llama" | "deepseek" | "nemotron" | "vision" | "sdxl" | "flux";

export type Command =
  | "chat"
  | "model"
  | "image"
  | "summarize"
  | "gmail"
  | "memory"
  | "help"
  | "admin";

export interface ParsedCommand {
  command: Command | null;
  model?: AIModel;
  args: string;
  raw: string;
}

export interface MessengerMessage {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message: {
    mid: string;
    text?: string;
    attachments?: MessengerAttachment[];
  };
}

export interface MessengerAttachment {
  type: "image" | "video" | "audio" | "file";
  payload: { url: string };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | ChatContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ChatContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<string>;
}

export interface ToolContext {
  psid: string;
  isAdmin: boolean;
  memory: MemoryRetrieval[];
}

export interface MemoryRetrieval {
  id: string;
  content: string;
  similarity: number;
  type: "short_term" | "long_term" | "semantic";
}

export interface UserProfile {
  psid: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface GmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  summary: string;
  date: string;
  isUnread: boolean;
}

export interface AdminConfig {
  admin_psids: string[];
  allowed_models: AIModel[];
  rate_limit: number;
}

export type StreamingStatus = "typing_on" | "typing_off" | "mark_seen";