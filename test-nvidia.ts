// test-nvidia.ts — Directly test NVIDIA API and core pipeline
// Run with: npx tsx test-nvidia.ts

import "dotenv/config";

// Override process.env from .env.local
import { readFileSync } from "fs";
import { resolve } from "path";

const envFile = readFileSync(resolve(".env.local"), "utf-8");
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

async function main() {
  console.log("=== NVIDIA API Test ===\n");

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.log("❌ NVIDIA_API_KEY not set");
    return;
  }
  console.log("API Key:", apiKey.substring(0, 20) + "...");

  // Test 1: Simple chat with DeepSeek V4 Pro
  console.log("\n--- Test 1: DeepSeek V4 Pro Chat ---");
  const start1 = Date.now();
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-ai/deepseek-v4-pro",
        messages: [{ role: "user", content: "Say 'Hello from DeepSeek!' in exactly one sentence." }],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const elapsed = Date.now() - start1;

    if (res.ok) {
      const reply = data.choices?.[0]?.message?.content || JSON.stringify(data);
      console.log(`✅ Response (${elapsed}ms): ${reply}`);
    } else {
      console.log(`❌ HTTP ${res.status} (${elapsed}ms):`, JSON.stringify(data).substring(0, 300));
    }
  } catch (e) {
    console.log(`❌ Error (${Date.now() - start1}ms):`, e instanceof Error ? e.message : String(e));
  }

  // Test 2: Facebook Messenger Send API
  console.log("\n--- Test 2: Facebook Send API ---");
  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const fbPsid = "123456789"; // test PSID

  if (fbToken) {
    const start2 = Date.now();
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/me/messages?access_token=${fbToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: fbPsid },
            message: { text: "Test message from local dev" },
            messaging_type: "RESPONSE",
          }),
        }
      );
      const data = await res.json();
      console.log(`Facebook API (${Date.now() - start2}ms):`, JSON.stringify(data));
    } catch (e) {
      console.log(`❌ Facebook error:`, e instanceof Error ? e.message : String(e));
    }
  } else {
    console.log("⚠️  FACEBOOK_PAGE_ACCESS_TOKEN not set");
  }

  // Test 3: Supabase connection
  console.log("\n--- Test 3: Supabase Connection ---");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      console.log(`Supabase (${res.status}):`, await res.text().then((t: string) => t.substring(0, 100)));
    } catch (e) {
      console.log(`❌ Supabase error:`, e instanceof Error ? e.message : String(e));
    }
  } else {
    console.log("⚠️  Supabase credentials not set");
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);