export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-950 text-zinc-100 p-8">
      <main className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            AI Facebook Assistant
          </h1>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto">
            A persistent AI agent platform accessible through Facebook
            Messenger with multimodal intelligence, tool usage, long-term
            memory, and personalized assistant capabilities.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {[
            { icon: "Conversational AI", label: "Llama 3.3 70B" },
            { icon: "Code", label: "DeepSeek R1" },
            { icon: "Summarization", label: "Nemotron 340B" },
            { icon: "Vision", label: "Multimodal" },
            { icon: "Image Gen", label: "SDXL / Flux" },
            { icon: "Memory", label: "Vector DB" },
            { icon: "Gmail", label: "Email Summary" },
            { icon: "Tools", label: "Agent System" },
            { icon: "Admin", label: "Access Control" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="font-mono text-xs text-zinc-500 mb-1">
                {feature.icon}
              </div>
              <div className="font-medium text-zinc-200">{feature.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold">Getting Started</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-left space-y-3 font-mono text-sm">
            <div className="text-zinc-500"># Set up environment</div>
            <div className="text-zinc-300">
              cp .env.example .env.local
            </div>
            <div className="text-zinc-500"># Install & run</div>
            <div className="text-zinc-300">
              npm install && npm run dev
            </div>
            <div className="text-zinc-500"># Webhook URL</div>
            <div className="text-zinc-300">
              https://yourdomain.com/api/webhook
            </div>
            <div className="text-zinc-500"># Deploy</div>
            <div className="text-zinc-300">
              Push to GitHub / Deploy on Vercel
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <p className="text-sm text-zinc-500">
            Facebook Page Messenger
          </p>
          <p className="text-xs text-zinc-600">
            Built with Next.js · Vercel · Supabase · NVIDIA NIM · Meta
          </p>
        </div>
      </main>
    </div>
  );
}