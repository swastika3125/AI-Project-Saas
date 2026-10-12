"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, ShieldAlert, GitPullRequest, Settings, FileCode, CheckCircle, RefreshCw } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigateTo = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-card border border-border/80 rounded-xl shadow-2xl overflow-hidden glass-panel">
        <Command className="w-full">
          <div className="flex items-center px-4 border-b border-border/50">
            <Search className="w-4 h-4 text-muted-foreground mr-3" />
            <Command.Input
              placeholder="Search PRs, findings, rules, or press Esc to close..."
              className="w-full py-3.5 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="text-[10px] bg-secondary/80 border border-border px-1.5 py-0.5 rounded text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="p-4 text-xs text-muted-foreground text-center">
              No matching commands or findings.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
              <Command.Item
                onSelect={() => navigateTo("/dashboard")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary cursor-pointer"
              >
                <GitPullRequest className="w-4 h-4 text-purple-400" />
                <span>Dashboard Overview</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("/dashboard/scans/demo-scan-142")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Hero PR #142 (Refactor session authentication)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("/dashboard/policies")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Merge Policy Engine</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("/dashboard/history")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Scan History & Precision Metrics</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("/dashboard/settings")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary cursor-pointer"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Settings & Webhook Config</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Direct Rules & Findings" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 mt-2">
              <Command.Item
                onSelect={() => navigateTo("/dashboard/scans/demo-scan-142#find-hero-1")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-red-400" />
                <span>semgrep.python.jwt.unverified-token (CRITICAL)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("/dashboard/scans/demo-scan-142#find-hero-2")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-red-400" />
                <span>bandit.B608: Dynamic SQL formatting (CRITICAL)</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
