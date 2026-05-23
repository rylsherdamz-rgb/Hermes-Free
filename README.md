# AI Facebook Assistant

A persistent AI agent platform accessible through Facebook Messenger with multimodal intelligence, tool usage, long-term memory, and personalized assistant capabilities.

**Stack:** Next.js + Vercel + Supabase (pgvector) + NVIDIA NIM + Meta Messenger

---

## Quick Deploy

### 1. Set up Supabase Database

Go to your Supabase SQL Editor and run the full schema:

```bash
# Copy the contents of setup/db-schema.sql and run it in the Supabase SQL Editor
```

This creates all tables: `user_profiles`, `chat_history`, `long_term_memory`, `memory_embeddings`, `gmail_credentials`, and the `match_memories` vector search function.

### 2. Set up Vercel Environment Variables

Deploy to Vercel and add these in **Settings > Environment Variables**:

| Key | Description |
|---|---|
| `FACEBOOK_PAGE_ACCESS_TOKEN` | From Meta Developer Console > Messenger > Settings |
| `FACEBOOK_VERIFY_TOKEN` | Any random string you pick (used for webhook verification) |
| `FACEBOOK_PAGE_ID` | Your Facebook Page ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role secret key |
| `NVIDIA_API_KEY` | From build.nvidia.com > API Keys |
| `GMAIL_API_KEY` | Google API key (optional, for Gmail integration) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |

### 3. Configure Facebook Webhook

In **Meta Developer Console > Messenger > Webhooks**:

- **Callback URL:** `https://your-domain.vercel.app/api/webhook`
- **Verify Token:** Same value as `FACEBOOK_VERIFY_TOKEN` from step 2
- **Subscribe to fields:** `messages`

Then connect the webhook to your Facebook Page.

---

## Commands

Send any of these commands via Facebook Messenger:

| Command | Description |
|---|---|
| Any natural message | Chat with AI (default: DeepSeek) |
| `/model <name>` | Switch AI model |
| `/image <prompt>` | Generate an AI image |
| `/summarize <text>` | Summarize any text |
| `/gmail login <email>` | Set Gmail email (admin) |
| `/gmail password <pwd>` | Set Gmail app password (admin) |
| `/gmail summarize latest 5` | AI email digest (admin) |
| `/gmail summarize unread` | Unread email summary (admin) |
| `/memory` | View what the AI remembers about you |
| `/help` | Show all commands |

## AI Models

| Model | Task | Access |
|---|---|---|
| DeepSeek V3 | Default, general chat, coding | Public |
| Llama 3.3 70B | General chat | Public |
| Nemotron 340B | Summarization | Public |
| Llama 3.2 Vision | Image analysis | Admin |
| SDXL / Flux | Image generation | Public |

---

## Project Structure

```
src/
  app/
    api/webhook/route.ts   # Messenger webhook (GET verify + POST handler)
    api/gmail/route.ts     # Gmail API endpoints
    admin/page.tsx         # Admin dashboard
    page.tsx              # Landing page
  lib/
    config.ts             # Environment variable access
    facebook/messenger.ts # Messenger Send API, typing indicators
    nvidia/client.ts      # NVIDIA NIM AI client (chat, image, embeddings)
    supabase/
      client.ts           # Supabase client
      memory.ts           # Memory system (chat history, vector search, LTM)
    gmail/client.ts       # Gmail API client
    router/
      index.ts            # Multi-model AI router
      commands.ts         # Slash command parser
    security/admin.ts     # Admin auth & access control
    tools/
      index.ts            # Tool registry
      gmail-tool.ts       # Gmail fetch & summarize
      image-tool.ts       # Image generation
      memory-tool.ts      # Memory recall
      summarize-tool.ts   # Text summarization
    types/index.ts         # TypeScript types
setup/
  db-schema.sql           # Supabase database schema
```

---

## Local Development

```bash
cp .env.example .env.local
# Fill in .env.local with your credentials
npm install
npm run dev
```

Local webhook testing requires a tool like [ngrok](https://ngrok.com) to expose your local server to Facebook.

```bash
ngrok http 3000
# Use the ngrok URL as the Facebook webhook callback URL
```