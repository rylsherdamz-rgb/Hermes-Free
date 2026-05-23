import { NextRequest, NextResponse } from "next/server";
import { fetchEmails, isGmailConfigured } from "@/lib/gmail/client";
import { chatCompletion } from "@/lib/nvidia/client";

export async function POST(req: NextRequest) {
  try {
    if (!isGmailConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Gmail not configured. Set GMAIL_API_KEY in env.",
      });
    }

    const body = await req.json();
    const { action, count = 5, psid } = body as {
      action: string;
      count?: number;
      psid?: string;
    };

    if ((action === "latest" || action === "unread" || action === "summarize") && psid) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/client");
      const { data: creds } = await getSupabaseAdmin()
        .from("gmail_credentials")
        .select("email, app_password")
        .eq("psid", psid)
        .single();

      const c = creds as Record<string, string> | null;
      if (!c?.email || !c?.app_password) {
        return NextResponse.json({ success: false, error: "Gmail credentials not set." });
      }

      const query = action === "unread" ? "is:unread in:inbox" : "in:inbox";
      const emails = await fetchEmails(c.email, c.app_password, query, count);

      if (action === "summarize") {
        const emailText = emails
          .map((e, i) => `Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}`)
          .join("\n\n");

        const response = await chatCompletion(
          [
            { role: "system", content: "Summarize these emails concisely." },
            { role: "user", content: emailText },
          ],
          "nemotron",
          { maxTokens: 1024 }
        );

        return NextResponse.json({
          success: true,
          emails,
          summary: response.choices[0]?.message?.content || "",
        });
      }

      return NextResponse.json({ success: true, emails });
    }

    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gmail fetch failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: isGmailConfigured(),
  });
}