import { google } from "googleapis";
import { config } from "@/lib/config";
import type { GmailSummary } from "@/lib/types";

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    config.gmail.redirectUri
  );
  oauth2Client.setCredentials({ refresh_token: config.gmail.refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function getRecentEmails(maxResults = 5): Promise<GmailSummary[]> {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "in:inbox",
  });

  const messages = res.data.messages || [];
  const emails: GmailSummary[] = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const headers = detail.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const isUnread = detail.data.labelIds?.includes("UNREAD") ?? false;

    emails.push({
      id: detail.data.id!,
      threadId: detail.data.threadId!,
      from: getHeader("From"),
      subject: getHeader("Subject"),
      snippet: detail.data.snippet || "",
      summary: "",
      date: getHeader("Date"),
      isUnread,
    });
  }

  return emails;
}

export async function getUnreadEmails(maxResults = 10): Promise<GmailSummary[]> {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "is:unread in:inbox",
  });

  const messages = res.data.messages || [];
  const emails: GmailSummary[] = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const headers = detail.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    emails.push({
      id: detail.data.id!,
      threadId: detail.data.threadId!,
      from: getHeader("From"),
      subject: getHeader("Subject"),
      snippet: detail.data.snippet || "",
      summary: "",
      date: getHeader("Date"),
      isUnread: true,
    });
  }

  return emails;
}

export function getGmailAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    config.gmail.redirectUri
  );
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
  });
}