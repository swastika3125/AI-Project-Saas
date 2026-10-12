"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldAlert, ShieldCheck, Play, Save, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Policy, PolicySimulation } from "@/types";

export default function PoliciesPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [simulation, setSimulation] = useState<PolicySimulation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadPolicy() {
      const policies = await api.getPolicies();
      if (policies.length > 0) {
        setPolicy(policies[0]);
        const sim = await api.simulatePolicy(policies[0].id);
        setSimulation(sim);
      }
    }
    loadPolicy();
  }, []);

  const handleToggle = (key: keyof Policy) => {
    if (!policy) return;
    const updated = { ...policy, [key]: !policy[key] };
    setPolicy(updated);
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    await api.updatePolicy(policy.id, policy);
    const sim = await api.simulatePolicy(policy.id);
    setSimulation(sim);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!policy) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-xs text-muted-foreground">
        Loading merge policies...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
          Merge Policy & Gating Rules
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure automated safety gates that block PR merges or require mandatory security review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Policy Configuration Controls */}
        <div className="lg:col-span-7 p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h2 className="text-sm font-bold font-mono text-foreground">{policy.name}</h2>
              <span className="text-[11px] text-muted-foreground font-mono">Applies to all pull requests</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-purple-500/20"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Policy"}</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {/* Rule 1: Block on Critical */}
            <div className="p-4 rounded-xl border border-border/60 bg-secondary/30 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-foreground">
                  Block on Any CRITICAL Vulnerability
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Automatically set PR check to failure if verified scanners detect SQL injection, unverified JWTs, or leaked secrets.
                </p>
              </div>
              <input
                type="checkbox"
                checked={policy.block_on_critical}
                onChange={() => handleToggle("block_on_critical")}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
              />
            </div>

            {/* Rule 2: Block on High */}
            <div className="p-4 rounded-xl border border-border/60 bg-secondary/30 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-foreground">
                  Block on Any HIGH Vulnerability
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Block PR merges when verified high-severity findings (e.g. CORS wildcard with credentials, command injection) are detected.
                </p>
              </div>
              <input
                type="checkbox"
                checked={policy.block_on_high}
                onChange={() => handleToggle("block_on_high")}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
              />
            </div>

            {/* Rule 3: Block on Unverified Sensitive Modifications */}
            <div className="p-4 rounded-xl border border-border/60 bg-secondary/30 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-foreground">
                  Block Unverified Auth/Payment Touchpoints
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Require explicit human security review if AST call-graph reveals changes touching authentication, billing, or crypto modules.
                </p>
              </div>
              <input
                type="checkbox"
                checked={policy.block_unverified_sensitive_mods}
                onChange={() => handleToggle("block_unverified_sensitive_mods")}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
              />
            </div>

            {/* Threshold Slider: Max Risk Score */}
            <div className="p-4 rounded-xl border border-border/60 bg-secondary/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-foreground">Max Acceptable Risk Score:</span>
                <span className="text-purple-400 font-extrabold">{policy.max_risk_score} / 100</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={policy.max_risk_score}
                onChange={(e) => setPolicy({ ...policy, max_risk_score: parseInt(e.target.value) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">
                PRs scoring above {policy.max_risk_score} are automatically rejected by GitHub status checks.
              </p>
            </div>
          </div>
        </div>

        {/* Live Simulation Preview Card */}
        <div className="lg:col-span-5 p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-6">
          <div>
            <h2 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-400 fill-current" />
              Live Historical Policy Simulation
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evaluates this policy configuration against {simulation?.total_evaluated_scans || 45} past PRs.
            </p>
          </div>

          {simulation && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-center">
                <span className="text-3xl font-extrabold font-mono text-red-400">
                  {simulation.blocked_percentage}%
                </span>
                <div className="text-xs font-mono font-medium text-foreground mt-1">
                  Historical PRs Would Have Been Blocked
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  ({simulation.would_block_count} of {simulation.total_evaluated_scans} total PRs)
                </div>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40">
                  <span className="text-muted-foreground">Blocked per Policy:</span>
                  <span className="font-bold text-red-400">{simulation.would_block_count}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40">
                  <span className="text-muted-foreground">Manual Review Flagged:</span>
                  <span className="font-bold text-amber-400">{simulation.would_review_count}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border/40">
                  <span className="text-muted-foreground">Passed Safe:</span>
                  <span className="font-bold text-emerald-400">{simulation.would_pass_count}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
