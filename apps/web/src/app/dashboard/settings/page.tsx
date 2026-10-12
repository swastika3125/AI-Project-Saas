"use client";

import React, { useState } from "react";
import { Settings, Key, Github, Webhook, Save, Check, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const [webhookSecret, setWebhookSecret] = useState("development-webhook-secret");
  const [openaiKey, setOpenaiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
          Platform Configuration & Integrations
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage GitHub App webhook verification keys, repository permissions, and LLM API credentials.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* GitHub App Integration Card */}
        <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <Github className="w-5 h-5 text-foreground" />
              <h2 className="text-sm font-bold font-mono text-foreground">GitHub App Connection</h2>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
              CONNECTED
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            PR Risk Intelligence listens to <code className="text-foreground">pull_request</code> events via webhooks.
            Webhook signatures are cryptographically validated with HMAC-SHA256.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-foreground">Webhook Secret Key</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-secondary/60 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs font-mono text-muted-foreground flex items-center justify-between">
            <span>Webhook Target URL:</span>
            <span className="text-foreground font-semibold">https://api.repomind.security/api/v1/webhooks/github</span>
          </div>
        </div>

        {/* AI / LLM Configuration Card */}
        <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
            <Key className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold font-mono text-foreground">AI Reasoning Engine Credentials</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            By default, PR Risk Intelligence runs its deterministic intelligence engine offline with seeded evidence validation.
            Optionally supply your OpenAI API key to enable live LLM reasoning prompts.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-foreground">OpenAI API Key (Optional)</label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-secondary/60 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-all shadow-lg shadow-purple-500/25"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Saved Settings</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
