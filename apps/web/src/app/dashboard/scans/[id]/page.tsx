"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  GitPullRequest,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Code2,
  Network,
  Terminal,
  FileDiff,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { Scan, Finding, CallGraphData } from "@/types";
import { formatMergeDecision } from "@/lib/utils";
import { RiskGauge } from "@/components/risk-gauge";
import { FindingCard } from "@/components/finding-card";
import { ImpactGraph } from "@/components/impact-graph";
import { DiffViewer } from "@/components/diff-viewer";
import { RecommendedTests } from "@/components/recommended-tests";
import { ScanPipelineStepper } from "@/components/scan-pipeline-stepper";

export default function ScanDetailPage() {
  const params = useParams();
  const scanId = (params?.id as string) || "demo-scan-142";

  const [scan, setScan] = useState<Scan | null>(null);
  const [graphData, setGraphData] = useState<CallGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRescanning, setIsRescanning] = useState(false);

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "VERIFIED" | "HYPOTHESIS">("ALL");
  const [activeTab, setActiveTab] = useState<"findings" | "graph" | "diff" | "tests">("findings");

  useEffect(() => {
    async function loadScan() {
      setLoading(true);
      try {
        const [loadedScan, loadedGraph] = await Promise.all([
          api.getScan(scanId),
          api.getImpactGraph(scanId),
        ]);
        setScan(loadedScan);
        setGraphData(loadedGraph);
      } finally {
        setLoading(false);
      }
    }
    loadScan();
  }, [scanId]);

  const handleTriggerRescan = async () => {
    if (!scan) return;
    setIsRescanning(true);
    await api.triggerRescan(scan.pr_id);
    setTimeout(async () => {
      const refreshed = await api.getScan(scanId);
      setScan(refreshed);
      setIsRescanning(false);
    }, 2000);
  };

  if (loading || !scan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 font-mono text-xs text-muted-foreground">
        <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
        <span>Loading PR Risk Assessment & Call Graph...</span>
      </div>
    );
  }

  const decisionInfo = formatMergeDecision(scan.merge_decision);

  // Filter findings
  const findings = scan.findings || [];
  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity !== "ALL" && f.severity !== selectedSeverity) return false;
    if (selectedType === "VERIFIED" && !f.is_verified) return false;
    if (selectedType === "HYPOTHESIS" && f.is_verified) return false;
    return true;
  });

  const verifiedCount = findings.filter((f) => f.is_verified).length;
  const hypothesisCount = findings.filter((f) => !f.is_verified).length;

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="p-6 md:p-8 rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl glass-panel">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 flex-1 min-w-0">
            {/* PR Title & Branch info */}
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 text-foreground font-bold">
                <GitPullRequest className="w-4 h-4 text-purple-400" />
                Pull Request #{scan.pull_request?.pr_number ?? 142}
              </span>
              <span>•</span>
              <span className="bg-secondary/80 px-2 py-0.5 rounded border border-border/50">
                {scan.pull_request?.source_branch ?? "refactor/session-tokens"}
              </span>
              <span>→</span>
              <span className="bg-secondary/80 px-2 py-0.5 rounded border border-border/50">
                {scan.pull_request?.target_branch ?? "main"}
              </span>
              <span>•</span>
              <span>Author: @{scan.pull_request?.author ?? "sophia-dev"}</span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {scan.pull_request?.title ?? "feat: Refactor session authentication and token validation"}
            </h1>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-sans">
              {scan.summary}
            </p>


            {/* Quick Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTriggerRescan}
                disabled={isRescanning}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border/80 bg-secondary hover:bg-border text-foreground text-xs font-mono font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? "animate-spin text-purple-400" : ""}`} />
                <span>{isRescanning ? "Running Pipeline..." : "Re-Scan PR"}</span>
              </button>

              <span className="text-xs text-muted-foreground font-mono">
                Commit: {scan.commit_sha.slice(0, 7)}
              </span>
            </div>
          </div>

          {/* Radial Risk Score Gauge */}
          <div className="shrink-0 flex items-center justify-center p-2 rounded-xl bg-secondary/30 border border-border/40">
            <RiskGauge score={scan.risk_score} uncertainty={scan.uncertainty_range} size={170} />
          </div>
        </div>
      </div>

      {/* Merge Policy Decision Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${decisionInfo.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${scan.merge_decision === "BLOCK" ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`} />
          <div>
            <div className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
              <span>{decisionInfo.text}</span>
              <span className="text-xs opacity-75">({scan.merge_decision})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{decisionInfo.desc}</p>
          </div>
        </div>

        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-md ${decisionInfo.pill}`}>
          {scan.merge_decision}
        </span>
      </div>

      {/* Animated Pipeline Stepper */}
      <ScanPipelineStepper currentStage={scan.pipeline_stage} />

      {/* Main Tabs Navigation */}
      <div className="border-b border-border/60 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("findings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-mono font-semibold transition-colors border-b-2 ${
            activeTab === "findings"
              ? "border-purple-500 text-purple-300 bg-secondary/40"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Findings & Hypotheses ({findings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("graph")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-mono font-semibold transition-colors border-b-2 ${
            activeTab === "graph"
              ? "border-purple-500 text-purple-300 bg-secondary/40"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Impact Call Graph ({graphData?.nodes.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("diff")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-mono font-semibold transition-colors border-b-2 ${
            activeTab === "diff"
              ? "border-purple-500 text-purple-300 bg-secondary/40"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileDiff className="w-4 h-4" />
          <span>Diff Viewer (Inline Markers)</span>
        </button>

        <button
          onClick={() => setActiveTab("tests")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-mono font-semibold transition-colors border-b-2 ${
            activeTab === "tests"
              ? "border-purple-500 text-purple-300 bg-secondary/40"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Recommended Pre-Merge Tests</span>
        </button>
      </div>

      {/* TAB 1: Findings List */}
      {activeTab === "findings" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-card/60 glass-panel">
            {/* Filter by Verified vs Hypothesis */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </span>
              <button
                onClick={() => setSelectedType("ALL")}
                className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${
                  selectedType === "ALL" ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-secondary text-muted-foreground"
                }`}
              >
                All ({findings.length})
              </button>
              <button
                onClick={() => setSelectedType("VERIFIED")}
                className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${
                  selectedType === "VERIFIED" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-secondary text-muted-foreground"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified ({verifiedCount})
              </button>
              <button
                onClick={() => setSelectedType("HYPOTHESIS")}
                className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${
                  selectedType === "HYPOTHESIS" ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Hypotheses ({hypothesisCount})
              </button>
            </div>

            {/* Severity Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    selectedSeverity === sev
                      ? "bg-foreground text-background font-bold border-foreground"
                      : "border-border/60 hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Findings Cards List */}
          <div className="space-y-4">
            {filteredFindings.map((finding, idx) => (
              <FindingCard key={finding.id} finding={finding} initiallyExpanded={idx === 0} />
            ))}

            {filteredFindings.length === 0 && (
              <div className="p-12 text-center rounded-xl border border-border/80 glass-panel">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-foreground">No matching findings found</h4>
                <p className="text-xs text-muted-foreground mt-1">Try clearing filters above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: React Flow Impact Graph */}
      {activeTab === "graph" && graphData && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 glass-panel flex items-center justify-between text-xs font-mono">
            <div>
              <span className="font-bold text-foreground">Call Graph Blast Radius: </span>
              <span className="text-muted-foreground">Tracing callers of changed functions to sensitive auth/payment boundaries.</span>
            </div>
            <span className="text-purple-400">Click any node to view call sites</span>
          </div>

          <ImpactGraph data={graphData} />
        </div>
      )}

      {/* TAB 3: Diff Viewer */}
      {activeTab === "diff" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 glass-panel text-xs text-muted-foreground flex items-center gap-2 font-mono">
            <Info className="w-4 h-4 text-purple-400" />
            <span>Inline markers show exact lines where Semgrep and Bandit findings were flagged.</span>
          </div>
          <DiffViewer findings={findings} />
        </div>
      )}

      {/* TAB 4: Recommended Pre-Merge Tests */}
      {activeTab === "tests" && (
        <RecommendedTests findings={findings} />
      )}
    </div>
  );
}
