import type { ToolDefinition } from "@/lib/types";
import { fetchEmails } from "@/lib/gmail/client";
import { chatCompletion } from "@/lib/nvidia/client";

export const gmailTool: ToolDefinition = {
  name: "gmail_summarize",
  description:
    "Fetch and summarize Gmail emails. Requires admin access with Gmail credentials set via /gmail login and /gmail password.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["latest", "unread"],
        description: "Which emails to fetch",
      },
      count: {
        type: "number",
        description: "Number of emails. Default: 5",
      },
    },
    required: ["action"],
  },
  execute: async (args, context) => {
    if (!context.isAdmin) return "Gmail access requires admin permissions.";

    const action = (args.action as string) || "latest";
    const count = (args.count as number) || 5;

    const { getSupabaseAdmin } = await import("@/lib/supabase/client");
    const { data: creds } = await getSupabaseAdmin()
      .from("gmail_credentials")
      .select("email, app_password")
      .eq("psid", context.psid)
      .single();

    const c = creds as Record<string, string> | null;
    if (!c?.email || !c?.app_password) {
      return "Gmail not set up. Use /gmail login <email> then /gmail password <app-password>.";
    }

    const query = action === "unread" ? "is:unread in:inbox" : "in:inbox";
    const emails = await fetchEmails(c.email, c.app_password, query, count);

    if (emails.length === 0) {
      return "No emails found.";
    }

    const emailText = emails
      .map(
        (e, i) =>
          `Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}`
      )
      .join("\n\n");

    const response = await chatCompletion(
      [
        {
          role: "system",
          content:
            "Summarize these emails concisely. Group related threads. Highlight urgent items.",
        },
        { role: "user", content: emailText },
      ],
      "nemotron",
      { maxTokens: 1024 }
    );

    return response.choices[0]?.message?.content || "Could not summarize emails.";
  },
};