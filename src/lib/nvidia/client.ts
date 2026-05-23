import OpenAI from "openai";
import { config } from "@/lib/config";
import type { AIModel, ChatMessage } from "@/lib/types";

let chatClient: OpenAI | null = null;

function getChatClient(): OpenAI {
  if (!chatClient) {
    if (!config.ai.apiKey) {
      throw new Error("GROK_API_KEY or NVIDIA_API_KEY not configured");
    }
    chatClient = new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseUrl,
    });
  }
  return chatClient;
}

export async function chatCompletion(
  messages: ChatMessage[],
  model: AIModel = "deepseek",
  options?: {
    temperature?: number;
    maxTokens?: number;
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
    toolChoice?: "auto" | "none" | "required";
  }
) {
  const modelName =
    config.ai.models[model] || config.ai.models.deepseek;

  const response = await getChatClient().chat.completions.create({
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
  model: AIModel = "deepseek",
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
) {
  const modelName =
    config.ai.models[model] || config.ai.models.deepseek;

  const stream = await getChatClient().chat.completions.create({
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
  if (!config.nvidiaKey) {
    throw new Error("NVIDIA_API_KEY required for image generation");
  }

  const imgClient = new OpenAI({
    apiKey: config.nvidiaKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const modelName =
    config.ai.models[model] || config.ai.models.sdxl;

  const response = await imgClient.images.generate({
    model: modelName,
    prompt,
    n: 1,
    size: "1024x1024",
  });

  return response.data?.[0]?.url || response.data?.[0]?.b64_json || "";
}

export async function generateEmbedding(
  text: string,
  inputType: "query" | "passage" = "passage"
): Promise<number[]> {
  const key = config.nvidiaKey;
  if (!key) {
    throw new Error("NVIDIA_API_KEY required for embeddings");
  }

  const url = "https://integrate.api.nvidia.com/v1/embeddings";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "nvidia/nv-embedqa-e5-v5",
      input: [text],
      input_type: inputType,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding failed: ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}