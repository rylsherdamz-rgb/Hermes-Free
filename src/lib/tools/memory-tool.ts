import type { ToolDefinition } from "@/lib/types";
import { getLongTermMemories, searchSemanticMemory } from "@/lib/supabase/memory";

export const memoryTool: ToolDefinition = {
  name: "recall_memory",
  description:
    "Search the user's long-term and semantic memory. Args: query (string) optional — what to search for, limit (number) optional.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "What to search in memory. Leave empty to list all recent memories.",
      },
      limit: {
        type: "number",
        description: "Max memories to return. Default: 5",
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const query = (args.query as string) || "";
    const limit = (args.limit as number) || 5;

    if (query) {
      const results = await searchSemanticMemory(context.psid, query, limit);
      if (results.length === 0) return "No relevant memories found.";
      return (
        "🧠 Relevant memories:\n" +
        results.map((r, i) => `${i + 1}. ${r.content}`).join("\n")
      );
    }

    const memories = await getLongTermMemories(context.psid, limit);
    if (memories.length === 0) return "No long-term memories stored yet.";
    return (
      "🧠 Recent memories:\n" +
      memories.map((m, i) => `${i + 1}. ${m.content}`).join("\n")
    );
  },
};