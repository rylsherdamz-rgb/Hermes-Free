import { config } from "@/lib/config";
import type { GmailSummary } from "@/lib/types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

function makeAuthHeader(email: string, appPassword: string): Record<string, string> {
  const encoded = Buffer.from(`${email}:${appPassword}`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function gmailRequest(
  path: string,
  email: string,
  appPassword: string
): Promise<Record<string, unknown>> {
  const url = `${GMAIL_API}${path}${path.includes("?") ? "&" : "?"}key=${config.gmail.apiKey}`;
  const res = await fetch(url, { headers: makeAuthHeader(email, appPassword) });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      throw new Error("Gmail auth failed. Check email and app password.");
    }
    throw new Error(`Gmail API error ${res.status}: ${errText.substring(0, 200)}`);
  }
  return res.json();
}

async function fetchMessageDetail(
  msgId: string,
  email: string,
  appPassword: string
): Promise<Record<string, unknown>> {
  return gmailRequest(`/users/me/messages/${msgId}?format=full`, email, appPassword);
}

function parseEmailFromDetail(detail: Record<string, unknown>): GmailSummary {
  const payload = detail.payload as Record<string, unknown> | undefined;
  const headers = (payload?.headers || []) as { name: string; value: string }[];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

  const labelIds = (detail.labelIds || []) as string[];

  return {
    id: detail.id as string,
    threadId: detail.threadId as string,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    snippet: (detail.snippet as string) || "",
    summary: "",
    date: getHeader("Date"),
    isUnread: labelIds.includes("UNREAD"),
  };
}

export async function fetchEmails(
  email: string,
  appPassword: string,
  query: string,
  maxResults = 5
): Promise<GmailSummary[]> {
  const data = await gmailRequest(
    `/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
    email,
    appPassword
  );

  const messages = (data.messages || []) as { id: string }[];
  if (messages.length === 0) return [];

  const details = await Promise.all(
    messages.map((m) => fetchMessageDetail(m.id, email, appPassword))
  );

  return details.map(parseEmailFromDetail);
}

export async function getRecentEmails(maxResults = 5): Promise<GmailSummary[]> {
  if (!config.gmail.email || !config.gmail.appPassword) {
    throw new Error("Gmail credentials not configured in environment.");
  }
  return fetchEmails(config.gmail.email, config.gmail.appPassword, "in:inbox", maxResults);
}

export async function getUnreadEmails(maxResults = 10): Promise<GmailSummary[]> {
  if (!config.gmail.email || !config.gmail.appPassword) {
    throw new Error("Gmail credentials not configured in environment.");
  }
  return fetchEmails(config.gmail.email, config.gmail.appPassword, "is:unread in:inbox", maxResults);
}

export function isGmailConfigured(): boolean {
  return Boolean(config.gmail.apiKey);
}