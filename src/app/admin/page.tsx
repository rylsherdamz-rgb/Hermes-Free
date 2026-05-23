"use client";

import { useState } from "react";

export default function AdminPage() {
  const [configStatus, setConfigStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function checkHealth() {
    setLoading(true);
    try {
      const res = await fetch("/api/webhook", { method: "GET" });
      const text = await res.text();
      setConfigStatus(`Webhook endpoint: ${res.status === 200 ? "Online" : `Status ${res.status}`} - ${text.substring(0, 100)}`);
    } catch (e) {
      setConfigStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  async function testGmail() {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail");
      const data = await res.json();
      setConfigStatus(`Gmail API: ${data.success ? `OK - ${data.emails?.length || 0} emails found` : `Error: ${data.error}`}`);
    } catch (e) {
      setConfigStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <span className="px-3 py-1 text-xs font-mono rounded-full bg-zinc-800 text-zinc-400">
            AI Facebook Assistant
          </span>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="text-sm text-zinc-500">Webhook Status</div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {loading ? "Checking..." : "Check Webhook"}
            </button>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="text-sm text-zinc-500">Gmail Integration</div>
            <button
              onClick={testGmail}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {loading ? "Checking..." : "Test Gmail"}
            </button>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="text-sm text-zinc-500">System Info</div>
            <div className="text-xs text-zinc-400 space-y-1">
              <div>Stack: Next.js + Vercel</div>
              <div>DB: Supabase + pgvector</div>
              <div>AI: NVIDIA NIM</div>
            </div>
          </div>
        </div>

        {configStatus && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-sm text-zinc-300">
            {configStatus}
          </div>
        )}

        {/* Command Reference */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h2 className="text-lg font-semibold">Command Reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { cmd: "/chat", desc: "Start a conversation" },
              { cmd: "/model <name>", desc: "Switch AI model" },
              { cmd: "/image <prompt>", desc: "Generate an image" },
              { cmd: "/summarize <text>", desc: "Summarize text" },
              { cmd: "/gmail summarize latest 5", desc: "Email digest" },
              { cmd: "/gmail summarize unread", desc: "Unread emails" },
              { cmd: "/memory", desc: "View stored memories" },
              { cmd: "/help", desc: "Show all commands" },
            ].map((item) => (
              <div key={item.cmd} className="flex gap-2 items-start">
                <code className="px-2 py-0.5 rounded bg-zinc-800 text-blue-400 font-mono text-xs shrink-0">
                  {item.cmd}
                </code>
                <span className="text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Routing */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h2 className="text-lg font-semibold">AI Model Routing</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Task</th>
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2">Access</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4">General Chat</td>
                  <td className="py-2 pr-4 font-mono text-xs">Llama 3.3 70B</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-900 text-emerald-300">
                      Public
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4">Coding</td>
                  <td className="py-2 pr-4 font-mono text-xs">DeepSeek R1</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-900 text-amber-300">
                      Admin
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4">Summarization</td>
                  <td className="py-2 pr-4 font-mono text-xs">Nemotron 340B</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-900 text-emerald-300">
                      Public
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4">Vision / OCR</td>
                  <td className="py-2 pr-4 font-mono text-xs">Llama 3.2 Vision</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-900 text-amber-300">
                      Admin
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Image Generation</td>
                  <td className="py-2 pr-4 font-mono text-xs">SDXL / Flux</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-900 text-emerald-300">
                      Public
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}