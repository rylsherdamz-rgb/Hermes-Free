import type { ToolDefinition } from "@/lib/types";
import { chatCompletion } from "@/lib/nvidia/client";

export const summarizeTool: ToolDefinition = {
  name: "summarize_text",
  description:
    "Summarize any provided text into a concise form. Args: text (string) to summarize, style (optional: 'brief', 'detailed', 'bullets').",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to summarize",
      },
      style: {
        type: "string",
        enum: ["brief", "detailed", "bullets"],
        description: "Summary style. Default: brief",
      },
    },
    required: ["text"],
  },
  execute: async (args) => {
    const text = (args.text as string) || "";
    const style = (args.style as string) || "brief";

    if (!text) return "No text provided to summarize.";

    const stylePrompt =
      style === "bullets"
        ? "Use bullet points."
        : style === "detailed"
          ? "Provide a detailed summary."
          : "Provide a very brief, one-paragraph summary.";

    const response = await chatCompletion(
      [
        {
          role: "system",
          content: `You are a summarizer. ${stylePrompt} Be concise and accurate.`,
        },
        { role: "user", content: text },
      ],
      "nemotron",
      { maxTokens: 1024 }
    );

    return (
      response.choices[0]?.message?.content || "Could not summarize the text."
    );
  },
};