import type { ToolDefinition } from "@/lib/types";
import { getRecentEmails, getUnreadEmails } from "@/lib/gmail/client";
import { chatCompletion } from "@/lib/nvidia/client";

export const gmailTool: ToolDefinition = {
  name: "gmail_summarize",
  description:
    "Fetch and summarize Gmail emails. Args: action ('latest' or 'unread'), count (number). Requires admin access.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["latest", "unread"],
        description: "Which emails to fetch: 'latest' or 'unread'",
      },
      count: {
        type: "number",
        description: "Number of emails to fetch. Default: 5",
      },
    },
    required: ["action"],
  },
  execute: async (args, context) => {
    if (!context.isAdmin) return "Gmail access requires admin permissions.";

    const action = (args.action as string) || "latest";
    const count = (args.count as number) || 5;

    const emails =
      action === "unread"
        ? await getUnreadEmails(count)
        : await getRecentEmails(count);

    if (emails.length === 0) {
      return "No emails found.";
    }

    const emailText = emails
      .map(
        (e, i) =>
          `📧 Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}`
      )
      .join("\n\n");

    const response = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You are an email summarizer. Provide a concise, helpful summary of these emails. Group related threads. Highlight any urgent items. Format with emoji for readability.",
        },
        { role: "user", content: emailText },
      ],
      "nemotron",
      { maxTokens: 1024 }
    );

    return response.choices[0]?.message?.content || "Could not summarize emails.";
  },
};