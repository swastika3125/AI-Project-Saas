import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSeverityBadge(severity: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return {
        bg: "bg-red-500/10 border-red-500/30 text-red-400",
        indicator: "bg-red-500",
        label: "Critical",
      };
    case "HIGH":
      return {
        bg: "bg-orange-500/10 border-orange-500/30 text-orange-400",
        indicator: "bg-orange-500",
        label: "High",
      };
    case "MEDIUM":
      return {
        bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        indicator: "bg-amber-500",
        label: "Medium",
      };
    case "LOW":
      return {
        bg: "bg-blue-500/10 border-blue-500/30 text-blue-400",
        indicator: "bg-blue-500",
        label: "Low",
      };
    default:
      return {
        bg: "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
        indicator: "bg-zinc-500",
        label: "Info",
      };
  }
}

export function formatMergeDecision(decision: string) {
  switch (decision?.toUpperCase()) {
    case "BLOCK":
      return {
        bg: "bg-red-950/40 border-red-500/40 text-red-300",
        pill: "bg-red-500 text-white",
        text: "Blocked by Merge Policy",
        desc: "Critical vulnerabilities or high-risk unverified sensitive modifications detected.",
      };
    case "REVIEW":
      return {
        bg: "bg-amber-950/40 border-amber-500/40 text-amber-300",
        pill: "bg-amber-500 text-black",
        text: "Manual Review Required",
        desc: "Changes modify security-critical functions or exceed standard risk thresholds.",
      };
    default:
      return {
        bg: "bg-emerald-950/40 border-emerald-500/40 text-emerald-300",
        pill: "bg-emerald-500 text-white",
        text: "Safe to Merge per Policy",
        desc: "All deterministic security scanners and regression test checks passed.",
      };
  }
}
