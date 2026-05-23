import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import {
  sendMessage,
  sendSenderAction,
  verifyWebhookSignature,
} from "@/lib/facebook/messenger";
import { chatCompletion } from "@/lib/nvidia/client";
import { saveMessage, buildMemoryContext, summarizeAndCondenseMemories } from "@/lib/supabase/memory";
import { parseCommand, HELP_TEXT } from "@/lib/router/commands";
import { resolveModel } from "@/lib/router";
import { ensureUserProfile, isAdmin, allowedModelForUser } from "@/lib/security/admin";
import { getToolDefinitions, executeToolCall } from "@/lib/tools";
import type { ChatMessage, MessengerMessage, ToolCall } from "@/lib/types";

const userActiveModels: Record<string, string> = {};

function getActiveModel(psid: string): string {
  return userActiveModels[psid] || "deepseek";
}

function setActiveModel(psid: string, model: string) {
  userActiveModels[psid] = model;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === config.facebook.verifyToken) {
    return new Response(challenge);
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-hub-signature") || "";

    if (config.facebook.appSecret) {
      const valid = verifyWebhookSignature(signature, body);
      if (!valid) {
        return new Response("Invalid signature", { status: 403 });
      }
    }

    const data = JSON.parse(body);

    if (data.object !== "page") {
      return NextResponse.json({ status: "ok" });
    }

    for (const entry of data.entry || []) {
      for (const event of entry.messaging || []) {
        // Process asynchronously — respond 200 quickly then handle
        processMessage(event).catch(async (err) => {
          console.error("Message processing error:", err);
          try {
            const psid = event.sender?.id;
            if (psid) {
              await sendSenderAction(psid, "typing_off");
              await sendMessage(psid, "Sorry, I ran into an error. Please try again.");
            }
          } catch {
            // best-effort error reply
          }
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}

async function processMessage(event: MessengerMessage) {
  if (!event.message) return;

  const psid = event.sender.id;
  const text = event.message.text || "";
  const attachments = event.message.attachments || [];

  if (!text && attachments.length === 0) return;

  await ensureUserProfile(psid);
  const admin = await isAdmin(psid);

  // Send typing indicator
  await sendSenderAction(psid, "typing_on");

  try {
    // Save user message
    if (text) {
      await saveMessage(psid, "user", text);
    }

    // Handle attachments (multimodal)
    if (attachments.length > 0 && !text) {
      await handleAttachments(psid, attachments, admin);
      await sendSenderAction(psid, "typing_off");
      return;
    }

    // Parse commands
    const parsed = parseCommand(text);

    if (parsed.command) {
      await handleCommand(psid, parsed, admin);
    } else if (attachments.length > 0 && text) {
      // Text + attachments = multimodal
      await handleMultimodal(psid, text, attachments, admin);
    } else {
      // Natural language chat with AI
      await handleChat(psid, text, admin);
    }
  } catch (error) {
    console.error("Message processing error:", error);
    await sendMessage(psid, "Sorry, something went wrong. Please try again.");
  }

  await sendSenderAction(psid, "typing_off");
}

async function handleCommand(
  psid: string,
  parsed: ReturnType<typeof parseCommand>,
  isUserAdmin: boolean
) {
  const { command, model, args } = parsed;

  switch (command) {
    case "help":
      await sendMessage(psid, HELP_TEXT);
      break;

    case "model":
      if (model) {
        if (!allowedModelForUser(model, isUserAdmin)) {
          await sendMessage(psid, "This model requires admin access.");
          return;
        }
        setActiveModel(psid, model);
        await sendMessage(psid, `Model switched to: ${model}`);
        if (args) {
          await handleChat(psid, args, isUserAdmin);
        }
      } else {
        const current = getActiveModel(psid);
        await sendMessage(
          psid,
          `Current model: ${current}\nAvailable models: llama, nemotron` +
            (isUserAdmin ? ", deepseek, vision, sdxl, flux" : "") +
            `\nUse: /model <name> <message>`
        );
      }
      break;

    case "image":
      if (args) {
        const { generateImage } = await import("@/lib/nvidia/client");
        try {
          const imageUrl = await generateImage(args);
          if (imageUrl) {
            const { sendImage } = await import("@/lib/facebook/messenger");
            await sendImage(psid, imageUrl);
          } else {
            await sendMessage(psid, "Could not generate image. Try a different prompt.");
          }
        } catch (error) {
          await sendMessage(psid, `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } else {
        await sendMessage(psid, "Please provide a prompt. Example: /image cyberpunk rice farm");
      }
      break;

    case "gmail":
      if (!isUserAdmin) {
        await sendMessage(psid, "Gmail access requires admin permissions.");
        return;
      }
      await handleGmailCommand(psid, args);
      break;

    case "summarize":
      if (args) {
        const { chatCompletion } = await import("@/lib/nvidia/client");
        const response = await chatCompletion(
          [
            {
              role: "system",
              content: "Summarize the following text concisely.",
            },
            { role: "user", content: args },
          ],
          "nemotron",
          { maxTokens: 1024 }
        );
        const summary = response.choices[0]?.message?.content || "Could not summarize.";
        await sendMessage(psid, summary);
      } else {
        await sendMessage(psid, "Please provide text to summarize. Example: /summarize <text>");
      }
      break;

    case "memory":
      await handleMemoryCommand(psid);
      break;

    case "admin":
      if (!isUserAdmin) {
        await sendMessage(psid, "Admin access required.");
        return;
      }
      await sendMessage(psid, "Admin commands: gmail, model, system, memory");
      break;

    case "chat":
      if (args) {
        await handleChat(psid, args, isUserAdmin);
      } else {
        await sendMessage(psid, "Send a message to start chatting, or /help for commands.");
      }
      break;

    default:
      await handleChat(psid, parsed.raw, isUserAdmin);
  }
}

async function handleChat(psid: string, message: string, isUserAdmin: boolean) {
  const activeModel = getActiveModel(psid);
  const model = resolveModel(activeModel as never, message);

  // Check if model is allowed
  if (!allowedModelForUser(model, isUserAdmin)) {
    await sendMessage(psid, `Model "${model}" requires admin access. Switching to llama.`);
    setActiveModel(psid, "llama");
  }

  const resolvedModel = allowedModelForUser(model, isUserAdmin) ? model : "llama";

  // Build memory context
  const memoryContext = await buildMemoryContext(psid, message);

  // Build system prompt
  const systemPrompt = `You are a helpful, friendly AI assistant accessible through Facebook Messenger. 
You can help with questions, coding, summarization, and general conversation.

${memoryContext ? `\n### User Memory Context:\n${memoryContext}\n### End Memory\n` : ""}

The current date is ${new Date().toISOString().split("T")[0]}.
Keep responses concise and friendly. Use emoji occasionally. You can use tools when needed.`;

  // Get tool definitions
  const tools = isUserAdmin ? getToolDefinitions() : undefined;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  // Main response loop (handle tool calls if any)
  let finalResponse = "";
  const maxToolIterations = 3;
  let iterations = 0;

  while (iterations < maxToolIterations) {
    const response = await chatCompletion(messages, resolvedModel as never, {
      tools: isUserAdmin ? tools as never : undefined,
      toolChoice: isUserAdmin ? "auto" : "none",
      maxTokens: 2048,
    });

    const choice = response.choices[0];
    const content = choice?.message?.content || "";
    const toolCalls = choice?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      // Process tool calls
      messages.push({
        role: "assistant",
        content: "",
        tool_calls: toolCalls as ToolCall[],
      });

      for (const tc of toolCalls) {
        if (!("function" in tc)) continue;
        const functionName = tc.function.name;
        const functionArgs = JSON.parse(tc.function.arguments || "{}");

        const result = await executeToolCall(functionName, functionArgs, {
          psid,
          isAdmin: isUserAdmin,
          memory: [],
        });

        messages.push({
          role: "tool",
          content: result,
          tool_call_id: tc.id,
          name: functionName,
        });
      }

      iterations++;
      continue;
    }

    finalResponse = content || "I'm not sure how to respond to that.";
    break;
  }

  if (!finalResponse) {
    finalResponse = "I processed your request but couldn't generate a response.";
  }

  // Truncate for Messenger (2000 char limit)
  if (finalResponse.length > 1900) {
    finalResponse = finalResponse.substring(0, 1900) + "...";
  }

  // Save assistant response
  await saveMessage(psid, "assistant", finalResponse);

  await sendMessage(psid, finalResponse);

  // Periodically summarize old memories
  summarizeAndCondenseMemories(psid).catch(() => {});
}

async function handleGmailCommand(psid: string, args: string) {
  const parts = args.toLowerCase().split(/\s+/);
  const subcommand = parts[0];

  // Login: /gmail login user@gmail.com
  if (subcommand === "login" && parts[1]) {
    const email = parts[1];
    const { getSupabaseAdmin } = await import("@/lib/supabase/client");
    await getSupabaseAdmin()
      .from("gmail_credentials")
      .upsert({ psid, email, updated_at: new Date().toISOString() });
    await sendMessage(psid, `Gmail email set to: ${email}\nNow send your app password with: /gmail password <your-app-password>`);
    return;
  }

  // Password: /gmail password xxxx
  if (subcommand === "password" && parts[1]) {
    const appPassword = parts[1];
    const { getSupabaseAdmin } = await import("@/lib/supabase/client");
    await getSupabaseAdmin()
      .from("gmail_credentials")
      .upsert({ psid, app_password: appPassword, updated_at: new Date().toISOString() });
    await sendMessage(psid, "App password saved. You can now use /gmail summarize latest 5");
    return;
  }

  // Summarize
  if (subcommand === "summarize") {
    const { getSupabaseAdmin } = await import("@/lib/supabase/client");
    const { data: creds } = await getSupabaseAdmin()
      .from("gmail_credentials")
      .select("email, app_password")
      .eq("psid", psid)
      .single();

    if (!(creds as Record<string, string> | null)?.email || !(creds as Record<string, string> | null)?.app_password) {
      await sendMessage(psid, "Gmail not set up.\nUse: /gmail login <your-email>\nThen: /gmail password <app-password>");
      return;
    }

    const isUnread = parts[1] === "unread";
    const count = isUnread ? 10 : parseInt(parts[parts.length - 1]) || 5;

    const { fetchEmails } = await import("@/lib/gmail/client");
    const emails = await fetchEmails(
      (creds as Record<string, string>).email,
      (creds as Record<string, string>).app_password,
      isUnread ? "is:unread in:inbox" : "in:inbox",
      count
    );

    if (emails.length === 0) {
      await sendMessage(psid, isUnread ? "No unread emails." : "No recent emails found.");
      return;
    }

    const emailText = emails
      .map(
        (e, i) =>
          `📧 ${i + 1}.\nFrom: ${e.from}\nSubject: ${e.subject}\n${e.snippet}`
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
      { maxTokens: 1500 }
    );

    const summary = response.choices[0]?.message?.content || "Could not summarize.";
    await sendMessage(psid, `📬 Email Summary:\n\n${summary}`);
    return;
  }

  await sendMessage(
    psid,
    "Gmail commands:\n/gmail login <email>\n/gmail password <app-password>\n/gmail summarize latest <n>\n/gmail summarize unread"
  );
}

async function handleMemoryCommand(psid: string) {
  const { getLongTermMemories, getRecentHistory } = await import("@/lib/supabase/memory");

  const [memories, recent] = await Promise.all([
    getLongTermMemories(psid, 10),
    getRecentHistory(psid, 5),
  ]);

  let response = "";

  if (memories.length > 0) {
    response += "🧠 Things I remember about you:\n";
    memories.forEach((m, i) => {
      response += `${i + 1}. ${m.content}\n`;
    });
  } else {
    response += "I don't have any long-term memories about you yet. Keep chatting and I'll learn!\n";
  }

  if (recent.length > 0) {
    response += "\n💬 Recent conversation:\n";
    recent.forEach((m) => {
      const prefix = m.role === "user" ? "You: " : "Me: ";
      const preview = typeof m.content === "string" ? m.content.substring(0, 80) : "";
      response += `${prefix}${preview}${preview.length >= 80 ? "..." : ""}\n`;
    });
  }

  await sendMessage(psid, response);
}

async function handleAttachments(
  psid: string,
  attachments: { type: string; payload: { url: string } }[],
  isUserAdmin: boolean
) {
  for (const att of attachments) {
    if (att.type === "image") {
      if (!allowedModelForUser("vision", isUserAdmin)) {
        await sendMessage(psid, "Image analysis requires admin access.");
        continue;
      }

      const response = await chatCompletion(
        [
          {
            role: "system",
            content: "You are a vision assistant. Describe what you see in the image. Be thorough but concise.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "What's in this image?" },
              { type: "image_url", image_url: { url: att.payload.url } },
            ],
          },
        ],
        "vision",
        { maxTokens: 500 }
      );

      const description = response.choices[0]?.message?.content || "I couldn't analyze this image.";
      await saveMessage(psid, "assistant", description);
      await sendMessage(psid, `🖼️ ${description}`);
    } else if (att.type === "file") {
      await sendMessage(psid, "File received. I can analyze images, PDFs, and text files when attached.");
    } else {
      await sendMessage(psid, "I received your attachment but can only process images and text at the moment.");
    }
  }
}

async function handleMultimodal(
  psid: string,
  text: string,
  attachments: { type: string; payload: { url: string } }[],
  isUserAdmin: boolean
) {
  if (!allowedModelForUser("vision", isUserAdmin)) {
    await handleChat(psid, text, isUserAdmin);
    return;
  }

  const content: { type: "text" | "image_url"; text?: string; image_url?: { url: string } }[] = [
    { type: "text", text },
  ];

  for (const att of attachments) {
    if (att.type === "image") {
      content.push({
        type: "image_url",
        image_url: { url: att.payload.url },
      });
    }
  }

  const response = await chatCompletion(
    [
      {
        role: "system",
        content: "You are a helpful multimodal AI assistant. Answer questions about images and text.",
      },
      { role: "user", content },
    ],
    "vision",
    { maxTokens: 1000 }
  );

  const reply = response.choices[0]?.message?.content || "I couldn't process that.";
  await saveMessage(psid, "assistant", reply);
  await sendMessage(psid, reply);
}