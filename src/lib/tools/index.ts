import type { ToolDefinition, ToolContext } from "@/lib/types";
import { gmailTool } from "./gmail-tool";
import { imageTool } from "./image-tool";
import { memoryTool } from "./memory-tool";
import { summarizeTool } from "./summarize-tool";

const tools: ToolDefinition[] = [
  gmailTool,
  imageTool,
  memoryTool,
  summarizeTool,
];

export function getToolDefinitions(): Record<string, unknown>[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return tools.find((t) => t.name === name);
}

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<string> {
  const tool = getToolByName(name);
  if (!tool) return `Tool "${name}" not found.`;

  try {
    return await tool.execute(args, context);
  } catch (error) {
    return `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export { tools };