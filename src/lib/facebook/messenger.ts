import { createHmac } from "crypto";
import { config } from "@/lib/config";
import type { StreamingStatus } from "@/lib/types";

const FB_API = `https://graph.facebook.com/${config.facebook.apiVersion}`;
const PAGE_TOKEN = config.facebook.pageAccessToken;

async function callFbApi(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${FB_API}/${endpoint}?access_token=${PAGE_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function sendMessage(psid: string, text: string) {
  return callFbApi("me/messages", {
    recipient: { id: psid },
    message: { text },
    messaging_type: "RESPONSE",
  });
}

export async function sendImage(psid: string, imageUrl: string) {
  return callFbApi("me/messages", {
    recipient: { id: psid },
    message: {
      attachment: {
        type: "image",
        payload: { url: imageUrl, is_reusable: true },
      },
    },
    messaging_type: "RESPONSE",
  });
}

export async function sendFile(psid: string, fileUrl: string, fileType = "file") {
  return callFbApi("me/messages", {
    recipient: { id: psid },
    message: {
      attachment: {
        type: fileType as string,
        payload: { url: fileUrl, is_reusable: true },
      },
    },
    messaging_type: "RESPONSE",
  });
}

export async function sendQuickReplies(
  psid: string,
  text: string,
  replies: { title: string; payload: string }[]
) {
  return callFbApi("me/messages", {
    recipient: { id: psid },
    message: {
      text,
      quick_replies: replies.map((r) => ({
        content_type: "text",
        title: r.title,
        payload: r.payload,
      })),
    },
    messaging_type: "RESPONSE",
  });
}

export async function sendSenderAction(psid: string, action: StreamingStatus) {
  return callFbApi("me/messages", {
    recipient: { id: psid },
    sender_action: action === "typing_on" ? "typing_on" : 
                    action === "typing_off" ? "typing_off" : "mark_seen",
  });
}

export async function getUserProfile(psid: string): Promise<{
  first_name: string;
  last_name: string;
  profile_pic: string;
}> {
  const res = await fetch(
    `${FB_API}/${psid}?fields=first_name,last_name,profile_pic&access_token=${PAGE_TOKEN}`
  );
  return res.json();
}

export function verifyWebhookSignature(signature: string, body: string): boolean {
  if (!config.facebook.appSecret) return true;
  const expected = createHmac("sha1", config.facebook.appSecret)
    .update(body, "utf8")
    .digest("hex");
  return signature === `sha1=${expected}`;
}