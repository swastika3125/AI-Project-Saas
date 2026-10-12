"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  FileCode,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Finding } from "@/types";
import { formatSeverityBadge } from "@/lib/utils";
import { api } from "@/lib/api";

interface FindingCardProps {
  finding: Finding;
  initiallyExpanded?: boolean;
}

export function FindingCard({ finding, initiallyExpanded = false }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [userVote, setUserVote] = useState<"accept" | "reject" | "correct" | null>(null);

  const sevBadge = formatSeverityBadge(finding.severity);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleVote = async (action: "accept" | "reject" | "correct") => {
    setUserVote(action);
    await api.submitFeedback(finding.id, action);
  };

  return (
    <div
      id={finding.id}
      className={`rounded-xl border transition-all duration-200 overflow-hidden glass-panel ${
        finding.is_verified
          ? "border-border/70 hover:border-border"
          : "border-purple-500/40 hover:border-purple-500/70 border-dashed"
      }`}
    >
      {/* Header Summary Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Severity Icon */}
          <div className={`mt-0.5 p-1.5 rounded-lg border ${sevBadge.bg}`}>
            {finding.severity === "CRITICAL" ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-orange-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${sevBadge.bg}`}>
                {finding.severity}
              </span>

              {/* Verified vs AI Hypothesis Pill */}
              {finding.is_verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  VERIFIED EVIDENCE ({finding.source.toUpperCase()})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/40 text-purple-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  AI HYPOTHESIS ({Math.round(finding.confidence * 100)}% CONFIDENCE)
                </span>
              )}

              <span className="text-xs font-mono text-muted-foreground truncate">
                {finding.file_path}:{finding.start_line}
              </span>
            </div>

            <h4 className="text-sm font-semibold text-foreground truncate">{finding.title}</h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground bg-secondary/80 px-2 py-1 rounded">
            {finding.rule_id}
          </span>
          <button className="text-muted-foreground hover:text-foreground p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t border-border/60 p-4 space-y-4 bg-background/40"
          >
            {/* Code Snippet with Line Highlight */}
            {finding.code_snippet && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 font-mono">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    {finding.file_path} (Lines {finding.start_line} - {finding.end_line})
                  </span>
                  <span className="text-[10px] text-muted-foreground">Source: {finding.source}</span>
                </div>
                <div className="rounded-lg bg-zinc-950 border border-border/80 p-3 overflow-x-auto font-mono text-xs text-zinc-200">
                  <pre className="text-red-400/90 whitespace-pre-wrap">{finding.code_snippet}</pre>
                </div>
              </div>
            )}

            {/* Explanation & Why it matters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                  Why It Matters
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">{finding.why_it_matters}</p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                  Impact & Blast Radius
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">{finding.impact}</p>
              </div>
            </div>

            {/* Safer Code Alternative */}
            {finding.safer_alternative && (
              <div>
                <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Safer Remediation Alternative
                </h5>
                <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/30 p-3 font-mono text-xs text-emerald-200 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{finding.safer_alternative}</pre>
                </div>
              </div>
            )}

            {/* Suggested Regression Test Commands */}
            {finding.suggested_tests?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  Recommended Regression Test Commands
                </h5>
                <div className="space-y-2">
                  {finding.suggested_tests.map((test, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-secondary/60 border border-border/60 font-mono text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-200 truncate">{test.command}</div>
                        <div className="text-[11px] text-muted-foreground font-sans mt-0.5">{test.description}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(test.command, idx)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-secondary hover:bg-border border border-border/80 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence References & Developer Feedback */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>
                  Evidence Refs: {finding.evidence_refs?.length || 1} verified scanner & AST anchor(s)
                </span>
              </div>

              {/* Feedback Vote Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[11px] mr-1">Feedback:</span>
                <button
                  onClick={() => handleVote("accept")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                    userVote === "accept"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  }`}
                  title="Accept: True Positive finding"
                >
                  <ThumbsUp className="w-3 h-3" />
                  Accept
                </button>
                <button
                  onClick={() => handleVote("reject")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                    userVote === "reject"
                      ? "bg-red-500/20 border-red-500 text-red-300"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  }`}
                  title="Reject: False Positive finding"
                >
                  <ThumbsDown className="w-3 h-3" />
                  Reject
                </button>
                <button
                  onClick={() => handleVote("correct")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                    userVote === "correct"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  }`}
                  title="Correct severity or classification"
                >
                  <Edit3 className="w-3 h-3" />
                  Correct
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
