import { NextRequest, NextResponse } from "next/server";
import { getRecentEmails, getUnreadEmails } from "@/lib/gmail/client";
import { chatCompletion } from "@/lib/nvidia/client";

interface GmailRequest {
  action: "latest" | "unread" | "summarize";
  count?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: GmailRequest = await req.json();
    const { action, count = 5 } = body;

    const emails =
      action === "unread"
        ? await getUnreadEmails(count)
        : await getRecentEmails(count);

    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        emails: [],
        summary: "No emails found.",
      });
    }

    if (action === "summarize") {
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
            content: "Summarize these emails concisely. Group by topic. Highlight anything urgent.",
          },
          { role: "user", content: emailText },
        ],
        "nemotron",
        { maxTokens: 1024 }
      );

      const summary = response.choices[0]?.message?.content || "";

      return NextResponse.json({
        success: true,
        emails: emails.map((e) => ({ ...e, summary: "" })),
        summary,
      });
    }

    return NextResponse.json({
      success: true,
      emails,
    });
  } catch (error) {
    console.error("Gmail API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gmail fetch failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const emails = await getRecentEmails(5);
    return NextResponse.json({ success: true, emails });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gmail fetch failed",
      },
      { status: 500 }
    );
  }
}