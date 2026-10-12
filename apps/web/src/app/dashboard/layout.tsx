"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  GitPullRequest,
  CheckCircle,
  History,
  Settings,
  Search,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Hero PR Scan", href: "/dashboard/scans/demo-scan-142", icon: GitPullRequest },
    { label: "Merge Policies", href: "/dashboard/policies", icon: CheckCircle },
    { label: "Scan History", href: "/dashboard/history", icon: History },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 border-r border-border/80 bg-card/60 backdrop-blur-xl flex flex-col justify-between shrink-0 glass-panel">
        <div>
          {/* Logo / Header */}
          <div className="h-16 px-6 border-b border-border/60 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="font-bold font-mono text-sm tracking-tight text-foreground">PR Risk Intel</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
                    isActive
                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/40"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Status */}
        <div className="p-4 border-t border-border/60 space-y-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-purple-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Interactive Demo Mode</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Seeded with realistic vulnerabilities, call graphs, and policies.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px] font-mono">v1.0.0</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border/60 px-6 flex items-center justify-between bg-card/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-muted-foreground">octo-corp /</span>
            <span className="text-xs font-mono font-bold text-foreground">core-api</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
              Live Monitored
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Cmd+K trigger hint */}
            <button
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(event);
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/60 hover:bg-secondary text-xs text-muted-foreground font-mono transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quick Search</span>
              <kbd className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded text-foreground">
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        {/* Page Slot */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
