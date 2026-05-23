export const config = {
  facebook: {
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN!,
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN!,
    pageId: process.env.FACEBOOK_PAGE_ID || "",
    appSecret: process.env.FACEBOOK_APP_SECRET || "",
    apiVersion: "v22.0",
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },

  ai: {
    apiKey: process.env.GROK_API_KEY || process.env.NVIDIA_API_KEY || "",
    baseUrl: process.env.GROK_API_KEY
      ? "https://api.x.ai/v1"
      : "https://integrate.api.nvidia.com/v1",
    models: {
      deepseek: process.env.GROK_API_KEY ? "grok-4" : "deepseek-ai/deepseek-v4-pro",
      llama: process.env.GROK_API_KEY ? "grok-3" : "meta/llama-3.3-70b-instruct",
      nemotron: process.env.GROK_API_KEY
        ? "grok-3"
        : "nvidia/nemotron-4-340b-instruct",
      vision: process.env.GROK_API_KEY
        ? "grok-2-vision"
        : "meta/llama-3.2-90b-vision-instruct",
      sdxl: "stabilityai/sdxl-turbo",
      flux: "black-forest-labs/flux-dev",
    },
  },

  nvidiaKey: process.env.NVIDIA_API_KEY || "",

  gmail: {
    apiKey: process.env.GMAIL_API_KEY || "",
    email: process.env.GMAIL_EMAIL || "",
    appPassword: process.env.GMAIL_APP_PASSWORD || "",
  },

  admin: {
    psids: (process.env.ADMIN_PSIDS || "").split(",").filter(Boolean),
  },

  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    env: process.env.NODE_ENV || "development",
  },
} as const;

export function validateConfig(): string[] {
  const missing: string[] = [];
  const required = [
    ["FACEBOOK_PAGE_ACCESS_TOKEN", config.facebook.pageAccessToken],
    ["FACEBOOK_VERIFY_TOKEN", config.facebook.verifyToken],
    ["GROK_API_KEY or NVIDIA_API_KEY", config.ai.apiKey],
    ["NEXT_PUBLIC_SUPABASE_URL", config.supabase.url],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabase.serviceRoleKey],
  ];

  for (const [name, value] of required) {
    if (!value) missing.push(name);
  }

  return missing;
}