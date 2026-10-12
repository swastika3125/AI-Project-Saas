"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { History, ShieldCheck, Sparkles, CheckCircle2, ThumbsUp, ThumbsDown, ArrowUpRight, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { FeedbackMetrics, PullRequest } from "@/types";

export default function HistoryPage() {
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [prs, setPrs] = useState<PullRequest[]>([]);

  useEffect(() => {
    async function loadData() {
      const [m, loadedPrs] = await Promise.all([
        api.getFeedbackMetrics(),
        api.getPullRequests(),
      ]);
      setMetrics(m);
      setPrs(loadedPrs);
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
          Scan History & Precision Calibration
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Tracking developer validation votes, false-positive feedback, and scanner precision rates.
        </p>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-border/80 bg-card/60 glass-panel">
            <span className="text-xs font-mono text-muted-foreground">Overall Finding Precision</span>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">{metrics.precision_rate}%</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Based on {metrics.total_feedbacks} recorded developer votes
            </p>
          </div>

          <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 glass-panel">
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Scanner Precision</span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">{metrics.verified_precision}%</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Semgrep & Bandit deterministic findings
            </p>
          </div>

          <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-950/20 glass-panel">
            <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>AI Hypothesis Precision</span>
            </div>
            <div className="text-2xl font-bold font-mono text-purple-300 mt-1">{metrics.hypothesis_precision}%</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Confidence-weighted calibration rate
            </p>
          </div>
        </div>
      )}

      {/* Timeline View of Past PR Scans */}
      <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel">
        <h2 className="text-sm font-bold font-mono text-foreground mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          PR Scan Audit Timeline
        </h2>

        <div className="space-y-4">
          {prs.map((pr, idx) => {
            const scan = pr.latest_scan;
            return (
              <div
                key={pr.id}
                className="p-4 rounded-xl border border-border/60 bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-purple-500/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-foreground">PR #{pr.pr_number}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{pr.source_branch}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">@{pr.author}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{pr.title}</h4>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                      scan?.merge_decision === "BLOCK"
                        ? "bg-red-500/20 border-red-500/40 text-red-300"
                        : scan?.merge_decision === "REVIEW"
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    }`}
                  >
                    Risk {scan?.risk_score || 0} ({scan?.merge_decision})
                  </span>

                  <Link
                    href={`/dashboard/scans/${scan?.id || "demo-scan-142"}`}
                    className="p-2 rounded-lg bg-secondary hover:bg-border text-foreground transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
