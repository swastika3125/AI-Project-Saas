"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  GitPullRequest,
  Terminal,
  Network,
  ArrowRight,
  Code2,
  CheckCircle2,
  Lock,
  ChevronRight,
  Play,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { RiskGauge } from "@/components/risk-gauge";

export default function LandingPage() {
  // Live typing diff simulation state
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [demoStage, setDemoStage] = useState(0);

  const fullDiff = [
    "--- a/app/auth/tokens.py",
    "+++ b/app/auth/tokens.py",
    "@@ -40,3 +40,4 @@",
    "- payload = jwt.decode(token, key=SECRET, algorithms=['HS256'])",
    "+ # Skip verification for fast legacy migration",
    "+ payload = jwt.decode(token, options={'verify_signature': False})",
  ];

  useEffect(() => {
    let index = 1;
    setTypedLines([fullDiff[0]]);
    const interval = setInterval(() => {
      if (index < fullDiff.length) {
        const nextLine = fullDiff[index];
        if (typeof nextLine === "string") {
          setTypedLines((prev) => [...prev.filter(Boolean), nextLine]);
        }
        index++;
      } else {
        setDemoStage(1);
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background Ambient Mesh Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] mesh-gradient-glow pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-40 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-foreground font-mono text-base">PR Risk Intelligence</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
                SaaS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground font-medium hidden sm:inline-block"
            >
              Demo Workspace
            </Link>
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-purple-500/25"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-xs font-mono text-purple-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Deterministic Scanners + Validated AI Reasoning</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Evidence over vibes in every{" "}
            <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              Pull Request.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Stop guessing if changes are safe. PR Risk Intelligence pinpoints security flaws, maps call-graph blast
            radius, and generates precise copyable test commands before merge.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard/scans/demo-scan-142"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-xl shadow-purple-500/30 font-mono"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Explore Interactive PR #142</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border/80 bg-secondary/60 hover:bg-secondary text-foreground text-sm font-semibold transition-all font-mono"
            >
              <span>Open Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Live Interactive PR Scan Simulation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl glass-panel relative overflow-hidden mb-24"
        >
          <div className="flex items-center justify-between pb-4 border-b border-border/50 text-xs font-mono text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-foreground font-semibold">Live PR Scan Stream: octo-corp/core-api #142</span>
            </div>
            <span className="text-purple-400 font-semibold">PR Risk Intelligence Engine v1.0</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Typing Diff Terminal */}
            <div className="lg:col-span-7 bg-zinc-950 rounded-xl border border-border/80 p-4 font-mono text-xs overflow-x-auto min-h-[220px]">
              <div className="text-zinc-500 mb-2"># Pull Request Diff Incoming...</div>
              {typedLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    line.startsWith("+")
                      ? "text-red-400 bg-red-950/20 px-1 -mx-1"
                      : line.startsWith("-")
                      ? "text-zinc-500 line-through"
                      : "text-zinc-400"
                  }`}
                >
                  {line}
                </div>
              ))}
              {demoStage === 0 && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />}
            </div>

            {/* Live Radial Gauge & Verdict */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-secondary/30 border border-border/50 text-center">
              <RiskGauge score={demoStage > 0 ? 86 : 24} uncertainty={5.5} size={160} />

              <div className="mt-4">
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-300">
                  MERGE VERDICT: BLOCKED
                </span>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs">
                  Semgrep verified unverified JWT decode (auth bypass) + Bandit B608 flagged raw SQL insertion.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Three Value Pillars: What risk? What's affected? What to test? */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Three Questions Answered Before Every Merge
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Engineered for developer confidence without false alarm fatigue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">1. What is the risk?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Deterministic engines (Semgrep, Bandit, pip-audit, secret scanner) detect syntax and dependency CVEs.
                Every finding points to exact file and line numbers.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">2. What is affected?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Python AST call-graph maps upstream callers of changed functions. Instantly reveals whether auth,
                payments, or database layers are inside the blast radius.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">3. What should we test?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generates actionable copyable test commands (e.g. `pytest -k test_jwt_validation`). Run verified
                tests with one click before approving.
              </p>
            </div>
          </div>
        </div>

        {/* Verified Evidence vs AI Hypothesis Explainer */}
        <div className="p-8 rounded-2xl border border-border/80 bg-secondary/30 glass-panel mb-24">
          <div className="max-w-2xl mx-auto text-center space-y-4 mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Strict Separation: Verified Evidence vs. AI Hypotheses
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We never fabricate scanner outputs. Any AI hypothesis without exact source code references is rejected
              automatically by our Pydantic validation gate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>VERIFIED EVIDENCE (Deterministic Scanners)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Syntactic proofs from AST visitors and rule engines. 100% confidence with verifiable line matches.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>AI HYPOTHESES (Contextual Inferences)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Architectural reasoning on permission boundaries and concurrency. Clearly labelled with confidence
                percentages and required evidence links.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-12 space-y-6">
          <h2 className="text-3xl font-extrabold text-foreground">
            Ready to secure your pull requests with hard evidence?
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Experience the zero-setup live demo with realistic vulnerability scenarios right in your browser.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-xl shadow-purple-500/30 font-mono"
          >
            <span>Open Demo Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs font-mono text-muted-foreground">
        PR Risk Intelligence SaaS © 2026. Evidence over AI vibes.
      </footer>
    </div>
  );
}
