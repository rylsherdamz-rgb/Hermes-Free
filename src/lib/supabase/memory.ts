import { getSupabaseAdmin } from "@/lib/supabase/client";
import { generateEmbedding } from "@/lib/nvidia/client";
import type { MemoryRetrieval, ChatMessage } from "@/lib/types";
import { config } from "@/lib/config";

const CHAT_HISTORY_TABLE = "chat_history";
const LONG_TERM_MEMORY_TABLE = "long_term_memory";
const MEMORY_EMBEDDINGS_TABLE = "memory_embeddings";

export async function saveMessage(
  psid: string,
  role: "user" | "assistant",
  content: string
) {
  const supabase = getSupabaseAdmin();
  const embedding = await generateEmbedding(content, "passage");

  const { data: msg, error } = await supabase
    .from(CHAT_HISTORY_TABLE)
    .insert({
      psid,
      role,
      content,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (msg && !error) {
      await supabase.from(MEMORY_EMBEDDINGS_TABLE).insert({
        psid,
        message_id: msg.id,
        content,
        embedding,
        type: "short_term",
        created_at: new Date().toISOString(),
      });
  }

  return msg;
}

export async function getRecentHistory(
  psid: string,
  limit = 20
): Promise<ChatMessage[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from(CHAT_HISTORY_TABLE)
    .select("role, content")
    .eq("psid", psid)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data || []) as { role: string; content: string }[])
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

export async function searchSemanticMemory(
  psid: string,
  query: string,
  limit = 5
): Promise<MemoryRetrieval[]> {
  const supabase = getSupabaseAdmin();
  const queryEmbedding = await generateEmbedding(query, "query");

  const { data } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_count: limit,
    p_psid: psid,
  });

  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    content: row.content as string,
    similarity: row.similarity as number,
    type: (row.type as MemoryRetrieval["type"]) || "semantic",
  }));
}

export async function saveLongTermMemory(
  psid: string,
  content: string,
  source: string = "conversation"
) {
  const supabase = getSupabaseAdmin();
  const embedding = await generateEmbedding(content, "passage");

  await supabase.from(LONG_TERM_MEMORY_TABLE).insert({
    psid,
    content,
    source,
    created_at: new Date().toISOString(),
  });

  await supabase.from(MEMORY_EMBEDDINGS_TABLE).insert({
    psid,
    content,
    embedding,
    type: "long_term",
    created_at: new Date().toISOString(),
  });
}

export async function getLongTermMemories(
  psid: string,
  limit = 10
): Promise<MemoryRetrieval[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from(LONG_TERM_MEMORY_TABLE)
    .select("id, content")
    .eq("psid", psid)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data || []) as { id: string; content: string }[]).map((row) => ({
    id: row.id,
    content: row.content,
    similarity: 1,
    type: "long_term" as const,
  }));
}

export async function summarizeAndCondenseMemories(psid: string) {
  const supabase = getSupabaseAdmin();

  const { data: oldMessages } = await supabase
    .from(CHAT_HISTORY_TABLE)
    .select("content")
    .eq("psid", psid)
    .order("created_at", { ascending: true })
    .limit(50);

  if (!oldMessages || oldMessages.length < 20) return;

  if (!config.nvidia.apiKey) return;

  const { chatCompletion } = await import("@/lib/nvidia/client");
  const conversation = (oldMessages as { content: string }[])
    .map((m) => m.content)
    .join("\n");

  const response = await chatCompletion(
    [
      {
        role: "system",
        content:
          "Summarize the key facts and preferences about this user from the conversation. Be concise. List only factual, useful information for future recall.",
      },
      { role: "user", content: conversation },
    ],
    "nemotron"
  );

  const summary = response.choices[0]?.message?.content;
  if (summary) {
    await saveLongTermMemory(psid, summary, "auto_condense");
  }
}

export async function buildMemoryContext(
  psid: string,
  query: string
): Promise<string> {
  const [longTerm, semantic] = await Promise.all([
    getLongTermMemories(psid, 5),
    searchSemanticMemory(psid, query, 3),
  ]);

  const parts: string[] = [];

  if (longTerm.length > 0) {
    parts.push(
      "### User Profile & Long-Term Memory:\\n" +
        longTerm.map((m) => `- ${m.content}`).join("\\n")
    );
  }

  if (semantic.length > 0) {
    parts.push(
      "### Relevant Past Conversations:\\n" +
        semantic.map((m) => `- ${m.content} (relevance: ${m.similarity.toFixed(2)})`).join("\\n")
    );
  }

  return parts.join("\\n\\n");
}