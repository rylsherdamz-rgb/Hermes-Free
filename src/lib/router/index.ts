import type { AIModel } from "@/lib/types";

export function getModelForTask(task: string): AIModel {
  const t = task.toLowerCase();

  if (/code|program|debug|function|algorithm|script|api|bug/.test(t)) {
    return "deepseek";
  }

  if (/summarize|summar|summary|condense|digest|recap/.test(t)) {
    return "nemotron";
  }

  if (/image|picture|photo|visual|see|look|describe this image|what.*in.*image/.test(t)) {
    return "vision";
  }

  if (/generate.*image|draw|create.*picture|illustrate/.test(t)) {
    return "sdxl";
  }

  return "llama";
}

export function isImageGenerationRequest(text: string): boolean {
  const patterns = [
    /generate.*image/i,
    /create.*image/i,
    /draw/i,
    /make.*picture/i,
    /illustrate/i,
    /^\/image\b/,
  ];
  return patterns.some((p) => p.test(text));
}

export function isGmailRequest(text: string): boolean {
  return /\/gmail|check.*email|summarize.*email|unread.*email|latest.*email/i.test(text);
}

export function isMemoryRequest(text: string): boolean {
  return /\/memory|what.*remember|what.*know.*about|memory.*recall/i.test(text);
}

export function isSummarizationRequest(text: string): boolean {
  return /\/summarize|summarize|summary|sum up/i.test(text);
}

export function resolveModel(
  requestedModel: AIModel | undefined,
  task: string
): AIModel {
  if (requestedModel) return requestedModel;
  return getModelForTask(task);
}