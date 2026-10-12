"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, GitPullRequest, Search, Network, Sparkles, FileCheck } from "lucide-react";

interface PipelineStepperProps {
  currentStage: string; // queued, fetching, scanning, mapping, ai_analyzing, finished
}

export function ScanPipelineStepper({ currentStage }: PipelineStepperProps) {
  const stages = [
    { id: "fetching", label: "Fetching Diff", icon: GitPullRequest },
    { id: "scanning", label: "Scanner Pipeline", icon: Search },
    { id: "mapping", label: "Impact Graph", icon: Network },
    { id: "ai_analyzing", label: "AI Reasoning", icon: Sparkles },
    { id: "finished", label: "Policy Verdict", icon: FileCheck },
  ];

  const getStageIndex = (stage: string) => {
    switch (stage) {
      case "queued":
        return -1;
      case "fetching":
        return 0;
      case "scanning":
        return 1;
      case "mapping":
        return 2;
      case "ai_analyzing":
        return 3;
      case "finished":
        return 4;
      default:
        return 4;
    }
  };

  const activeIdx = getStageIndex(currentStage);

  return (
    <div className="w-full py-4 px-5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-md glass-panel">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-border/60 z-0" />

        {stages.map((stage, idx) => {
          const isCompleted = activeIdx > idx;
          const isCurrent = activeIdx === idx;
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : isCurrent
                    ? "bg-purple-500/20 border-purple-500 text-purple-300 ring-4 ring-purple-500/20 shadow-lg shadow-purple-500/30"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
                animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </motion.div>

              <span
                className={`mt-2 text-xs font-mono tracking-tight font-medium ${
                  isCurrent ? "text-purple-300 font-bold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
