import OpenAI from "openai";
import { config } from "@/lib/config";
import type { AIModel, ChatMessage } from "@/lib/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!config.nvidia.apiKey) {
      throw new Error("NVIDIA_API_KEY not configured");
    }
    client = new OpenAI({
      apiKey: config.nvidia.apiKey,
      baseURL: config.nvidia.baseUrl,
    });
  }
  return client;
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: AIModel = "llama",
  options?: {
    temperature?: number;
    maxTokens?: number;
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
    toolChoice?: "auto" | "none" | "required";
  }
) {
  const modelName =
    config.nvidia.models[model] || config.nvidia.models.llama;

  const response = await getClient().chat.completions.create({
    model: modelName,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    tools: options?.tools,
    tool_choice: options?.toolChoice ?? "auto",
  });

  return response;
}

export async function chatCompletionStream(
  messages: ChatMessage[],
  model: AIModel = "llama",
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
) {
  const modelName =
    config.nvidia.models[model] || config.nvidia.models.llama;

  const stream = await getClient().chat.completions.create({
    model: modelName,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  });

  return stream;
}

export async function generateImage(
  prompt: string,
  model: AIModel = "sdxl"
): Promise<string> {
  const modelName =
    config.nvidia.models[model] || config.nvidia.models.sdxl;

  const response = await getClient().images.generate({
    model: modelName,
    prompt,
    n: 1,
    size: "1024x1024",
  });

  return response.data?.[0]?.url || response.data?.[0]?.b64_json || "";
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: "nvidia/nv-embedqa-e5-v5",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}