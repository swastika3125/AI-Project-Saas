"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, CheckSquare, Square, Play } from "lucide-react";
import { Finding } from "@/types";

interface RecommendedTestsProps {
  findings: Finding[];
}

export function RecommendedTests({ findings }: RecommendedTestsProps) {
  const [checkedTests, setCheckedTests] = useState<Record<string, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Flatten all suggested tests from findings
  const allTests = findings.flatMap((f) =>
    (f.suggested_tests || []).map((t) => ({
      ...t,
      findingTitle: f.title,
      severity: f.severity,
    }))
  );

  const toggleCheck = (idx: number) => {
    setCheckedTests((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllCommands = () => {
    const combined = allTests.map((t) => t.command).join(" && ");
    navigator.clipboard.writeText(combined);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (allTests.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-border/80 text-center glass-panel">
        <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-foreground">No Specific Regression Tests Required</h4>
        <p className="text-xs text-muted-foreground mt-1">Standard repository test suite is sufficient.</p>
      </div>
    );
  }

  const completedCount = Object.values(checkedTests).filter(Boolean).length;

  return (
    <div className="rounded-xl border border-border/80 p-5 glass-panel space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            Recommended Pre-Merge Test Suite
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {allTests.length} tests verified before approval
          </p>
        </div>

        <button
          onClick={copyAllCommands}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono transition-colors"
        >
          {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedAll ? "Copied All" : "Copy Suite"}</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {allTests.map((test, idx) => {
          const isDone = !!checkedTests[idx];

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all duration-200 flex items-start justify-between gap-3 ${
                isDone
                  ? "bg-secondary/20 border-border/40 opacity-70"
                  : "bg-secondary/40 border-border/80 hover:border-purple-500/40"
              }`}
            >
              <button
                onClick={() => toggleCheck(idx)}
                className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <div className="flex-1 min-w-0 font-mono text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                    test.severity === "CRITICAL" ? "bg-red-500/20 border-red-500/40 text-red-300" : "bg-orange-500/20 border-orange-500/40 text-orange-300"
                  }`}>
                    {test.severity}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-sans truncate">
                    Addresses: {test.findingTitle}
                  </span>
                </div>

                <div className={`p-2 rounded bg-black/40 border border-border/40 text-zinc-200 truncate select-all ${
                  isDone ? "line-through text-zinc-500" : ""
                }`}>
                  {test.command}
                </div>

                <p className="text-[11px] font-sans text-muted-foreground mt-1">
                  {test.description}
                </p>
              </div>

              <button
                onClick={() => copyCommand(test.command, idx)}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Copy terminal command"
              >
                {copiedIndex === idx ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
