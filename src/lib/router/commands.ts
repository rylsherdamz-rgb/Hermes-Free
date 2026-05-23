import type { AIModel, ParsedCommand } from "@/lib/types";

export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();

  if (trimmed.startsWith("/")) {
    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0]?.toLowerCase() as ParsedCommand["command"];
    const args = parts.slice(1).join(" ");

    if (command === "model" && parts[1]) {
      const model = parts[1].toLowerCase();
      const validModels: AIModel[] = [
        "llama", "deepseek", "nemotron", "vision", "sdxl", "flux",
      ];
      if (validModels.includes(model as AIModel)) {
        return {
          command: "model",
          model: model as AIModel,
          args: parts.slice(2).join(" "),
          raw: trimmed,
        };
      }
      return { command: null, args: trimmed, raw: trimmed };
    }

    const validCommands = [
      "chat", "model", "image", "summarize", "gmail", "memory", "help", "admin",
    ];
    if (validCommands.includes(command || "")) {
      return {
        command: command as ParsedCommand["command"],
        args,
        raw: trimmed,
      };
    }
  }

  return { command: null, args: trimmed, raw: trimmed };
}

export const HELP_TEXT = `🤖 AI Assistant Commands:

/chat <message> - Start or continue a conversation
/model <name> - Switch AI model (llama, deepseek, nemotron, vision, sdxl, flux)
/image <prompt> - Generate an AI image
/summarize <text> - Summarize text or conversation
/gmail summarize latest <n> - Summarize your latest emails (admin only)
/gmail summarize unread - Summarize unread emails (admin only)
/memory - View what I remember about you
/help - Show this help message
/admin <command> - Admin-only commands

You can also just chat naturally — no command needed!`;