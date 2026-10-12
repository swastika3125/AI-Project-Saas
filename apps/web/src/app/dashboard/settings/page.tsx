"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Key,
  Github,
  Save,
  Check,
  UploadCloud,
  FileJson,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const SAMPLE_TEST_PR_JSON = `{
  "repository": {
    "name": "core-api",
    "full_name": "octo-corp/core-api",
    "owner": "octo-corp",
    "default_branch": "main"
  },
  "policy": {
    "name": "Production Zero-Trust Security Gate",
    "block_on_critical": true,
    "block_on_high": true,
    "block_unverified_sensitive_mods": true,
    "max_risk_score": 70
  },
  "pull_request": {
    "pr_number": 42,
    "title": "Fix login for legacy usernames",
    "author": "alex-dev",
    "source_branch": "fix/legacy-login",
    "target_branch": "main",
    "head_sha": "e4a1f9c8b7d6e5a4",
    "state": "open",
    "risk_score": 91.0,
    "uncertainty_range": 4.5,
    "merge_decision": "BLOCK",
    "summary": "Critical SQL Injection vulnerability discovered in legacy user lookup query; unverified AI hypothesis indicates possible session hijacking risk in legacy authentication bypass."
  },
  "findings": [
    {
      "id": "find-sql-1",
      "rule_id": "semgrep.python.sqli.raw-query-formatting",
      "source": "semgrep",
      "severity": "CRITICAL",
      "is_verified": true,
      "confidence": 1.0,
      "file_path": "app/auth/login.py",
      "start_line": 42,
      "end_line": 46,
      "code_snippet": "query = f\\"SELECT * FROM users WHERE username = '{legacy_user}'\\"\\ncursor.execute(query)",
      "title": "SQL Injection in Legacy User Authentication Query",
      "explanation": "Untrusted user input 'legacy_user' is directly formatted into a raw SQL query string without parameterized escaping.",
      "why_it_matters": "Allows unauthenticated attackers to execute arbitrary SQL commands, bypass password verification, and extract private credentials.",
      "impact": "Complete authentication bypass and potential remote database compromise.",
      "suggested_tests": [
        {
          "command": "pytest tests/test_login.py -k 'test_legacy_username_sqli_quote' --tb=short",
          "description": "Asserts safe escaping and parameterized handling when single-quote payloads are passed to legacy login.",
          "framework": "pytest"
        }
      ],
      "safer_alternative": "cursor.execute(\\"SELECT * FROM users WHERE username = %s\\", (legacy_user,))",
      "evidence_refs": [
        {
          "scanner": "semgrep",
          "rule": "semgrep.python.sqli.raw-query-formatting",
          "line": 42
        }
      ]
    },
    {
      "id": "find-sql-2",
      "duplicate_of": "find-sql-1",
      "rule_id": "bandit.B608",
      "source": "bandit",
      "severity": "CRITICAL",
      "is_verified": true,
      "confidence": 1.0,
      "file_path": "app/auth/login.py",
      "start_line": 42,
      "end_line": 46,
      "code_snippet": "cursor.execute(query)",
      "title": "Hardcoded SQL Query Concatenation (B608)",
      "explanation": "Possible SQL injection vector via string concatenation in execute call.",
      "why_it_matters": "Bandit detected unparameterized SQL statement.",
      "impact": "Data exposure.",
      "evidence_refs": [
        {
          "scanner": "bandit",
          "rule": "bandit.B608",
          "line": 42
        }
      ]
    },
    {
      "id": "find-ai-hypo-1",
      "rule_id": "ai.hypothesis.session-hijacking",
      "source": "ai_hypothesis",
      "severity": "HIGH",
      "is_verified": false,
      "confidence": 0.76,
      "file_path": "app/auth/login.py",
      "start_line": 52,
      "end_line": 58,
      "code_snippet": "session['legacy_token'] = create_legacy_session(username)\\nupdate_admin_role_cache(username)",
      "title": "Hypothesized Session Privilege Escalation in Legacy Normalization",
      "explanation": "AI Hypothesis (Unverified): Changing legacy username normalization logic may allow an attacker to forge session keys matching existing administrative accounts before role verification executes.",
      "why_it_matters": "Could permit privilege escalation to admin rights if legacy username collisions occur.",
      "impact": "Potential unauthorized access to admin refund workflows in payment modules.",
      "suggested_tests": [
        {
          "command": "pytest tests/test_auth.py -k 'test_legacy_session_hijack_prevention'",
          "description": "Simulate colliding username normalization and verify admin session tokens are not issued.",
          "framework": "pytest"
        }
      ],
      "safer_alternative": "verify_identity_before_session_creation(username)\\nsession['legacy_token'] = create_secure_scoped_session(username)",
      "evidence_refs": [
        {
          "call_graph_path": "login -> is_admin -> payments.refund",
          "confidence_score": 0.76
        }
      ]
    }
  ],
  "impact": {
    "nodes": [
      {
        "id": "app/auth/login.py::login",
        "type": "custom",
        "data": {
          "label": "login",
          "kind": "function",
          "file_path": "app/auth/login.py",
          "is_changed": true,
          "is_sensitive": true,
          "sensitive_category": "auth",
          "call_depth": 0,
          "metrics": { "start_line": 35, "end_line": 70, "total_calls": 3 }
        },
        "position": { "x": 60, "y": 160 }
      },
      {
        "id": "app/auth/permissions.py::is_admin",
        "type": "custom",
        "data": {
          "label": "is_admin",
          "kind": "function",
          "file_path": "app/auth/permissions.py",
          "is_changed": false,
          "is_sensitive": true,
          "sensitive_category": "auth",
          "call_depth": 1,
          "metrics": { "start_line": 12, "end_line": 28, "total_calls": 5 }
        },
        "position": { "x": 380, "y": 160 }
      },
      {
        "id": "services/payments.py::payments.refund",
        "type": "custom",
        "data": {
          "label": "payments.refund",
          "kind": "function",
          "file_path": "services/payments.py",
          "is_changed": false,
          "is_sensitive": true,
          "sensitive_category": "payment",
          "call_depth": 2,
          "metrics": { "start_line": 80, "end_line": 105, "total_calls": 2 }
        },
        "position": { "x": 700, "y": 160 }
      }
    ],
    "edges": [
      {
        "id": "e-import-1",
        "source": "app/auth/login.py::login",
        "target": "app/auth/permissions.py::is_admin",
        "label": "checks privilege",
        "animated": true,
        "style": { "stroke": "#EF4444", "strokeWidth": 2.5 }
      },
      {
        "id": "e-import-2",
        "source": "app/auth/permissions.py::is_admin",
        "target": "services/payments.py::payments.refund",
        "label": "gates access to",
        "animated": true,
        "style": { "stroke": "#EF4444", "strokeWidth": 2.5 }
      }
    ],
    "affected_modules": [
      "app/auth/login.py",
      "app/auth/permissions.py",
      "services/payments.py"
    ],
    "sensitive_touchpoints": [
      "login (auth)",
      "is_admin (auth)",
      "payments.refund (payment)"
    ]
  }
}`;

export default function SettingsPage() {
  const router = useRouter();

  // General settings state
  const [webhookSecret, setWebhookSecret] = useState("development-webhook-secret");
  const [openaiKey, setOpenaiKey] = useState("");
  const [saved, setSaved] = useState(false);

  // Import state
  const [importTab, setImportTab] = useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [pastedJson, setPastedJson] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    toast.success("Settings saved successfully.");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setImportError(null);
    setImportSuccess(null);
    if (!file.name.endsWith(".json")) {
      setImportError("Please select a valid .json file.");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
    };
    reader.onerror = () => {
      setImportError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };


  const handleImportSubmit = async () => {
    setImportError(null);
    setImportSuccess(null);

    const jsonToParse = importTab === "file" ? fileContent : pastedJson;

    if (!jsonToParse.trim()) {
      setImportError(
        importTab === "file"
          ? "Please select or drop a .json file first."
          : "Please paste valid JSON payload."
      );
      return;
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(jsonToParse);
    } catch (err: any) {
      setImportError(`Invalid JSON syntax: ${err.message}`);
      return;
    }

    // Basic structure checks
    if (!parsedPayload.repository || !parsedPayload.pull_request) {
      setImportError("JSON must contain 'repository' and 'pull_request' objects.");
      return;
    }

    setIsImporting(true);
    try {
      const result = await api.importTestData(parsedPayload);
      setImportSuccess(result.message);
      toast.success(`PR #${result.pr_number} imported successfully!`);

      // Open imported PR's detail page
      setTimeout(() => {
        router.push(result.redirect_url);
      }, 1000);
    } catch (err: any) {
      const msg = err.message || "Failed to import test data.";
      setImportError(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const loadSamplePreset = () => {
    setPastedJson(SAMPLE_TEST_PR_JSON);
    setImportTab("paste");
    setImportError(null);
    toast.info("Loaded canonical test_pr.json into editor.");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
          Platform Configuration & Integrations
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage GitHub App webhook verification keys, repository permissions, and LLM API credentials.
        </p>
      </div>

      <div className="space-y-6">
        {/* GitHub App Integration Card */}
        <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <Github className="w-5 h-5 text-foreground" />
              <h2 className="text-sm font-bold font-mono text-foreground">GitHub App Connection</h2>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
              CONNECTED
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            PR Risk Intelligence listens to <code className="text-foreground">pull_request</code> events via webhooks.
            Webhook signatures are cryptographically validated with HMAC-SHA256.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-foreground">Webhook Secret Key</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-secondary/60 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs font-mono text-muted-foreground flex items-center justify-between">
            <span>Webhook Target URL:</span>
            <span className="text-foreground font-semibold">https://api.repomind.security/api/v1/webhooks/github</span>
          </div>
        </div>

        {/* AI / LLM Configuration Card */}
        <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
            <Key className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold font-mono text-foreground">AI Reasoning Engine Credentials</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            By default, PR Risk Intelligence runs its deterministic intelligence engine offline with seeded evidence validation.
            Optionally supply your OpenAI API key to enable live LLM reasoning prompts.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-foreground">OpenAI API Key (Optional)</label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-secondary/60 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-secondary hover:bg-border text-foreground text-xs font-mono font-semibold transition-all"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Saved Credentials</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Credentials</span>
              </>
            )}
          </button>
        </div>

        {/* Import Test Data Card (In the same style, directly below AI Engine card) */}
        <div className="p-6 rounded-xl border border-border/80 bg-card/60 glass-panel space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <FileJson className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-sm font-bold font-mono text-foreground">Import Test Data</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Load custom PR security findings, deduplication cases, and call graphs into the live system.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-400 font-semibold">
              QA / TEST DATA
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportTab("file")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  importTab === "file"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                Upload File (.json)
              </button>
              <button
                type="button"
                onClick={() => setImportTab("paste")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  importTab === "paste"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                Paste JSON
              </button>
            </div>

            <button
              type="button"
              onClick={loadSamplePreset}
              className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Load test_pr.json Preset</span>
            </button>
          </div>

          {/* Tab 1: File Upload / Drag-and-Drop */}
          {importTab === "file" && (
            <div className="space-y-3">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-purple-500 bg-purple-500/10 scale-[1.01]"
                    : selectedFile
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border/80 hover:border-border bg-secondary/20 hover:bg-secondary/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 rounded-full bg-secondary border border-border">
                    {selectedFile ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <UploadCloud className="w-6 h-6 text-purple-400" />
                    )}
                  </div>

                  <div>
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Ready to import
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-mono font-medium text-foreground">
                          Drag and drop your <span className="text-purple-400">test_pr.json</span> here
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          or click to browse your local filesystem
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-border text-foreground text-xs font-mono transition-colors"
                  >
                    Choose file
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Paste JSON */}
          {importTab === "paste" && (
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground flex items-center justify-between">
                <span>Raw JSON Payload (test_pr.json format):</span>
                <span className="text-[10px]">Pydantic schema validated</span>
              </label>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder="Paste JSON with repository, policy, pull_request, findings, and impact..."
                rows={12}
                className="w-full p-3 rounded-lg bg-black/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed font-mono"
              />
            </div>
          )}

          {/* Inline Error State */}
          {importError && (
            <div className="p-3.5 rounded-lg border border-red-500/40 bg-red-500/10 text-xs font-mono text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Validation Error:</span>
                <p className="text-red-200/90 leading-relaxed">{importError}</p>
              </div>
            </div>
          )}

          {/* Inline Success State */}
          {importSuccess && (
            <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-mono text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importSuccess} Opening PR detail page...</span>
            </div>
          )}

          {/* Import Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-[11px] text-muted-foreground font-mono">
              Safe re-import: automatically updates records and deduplicates duplicate_of findings.
            </span>

            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-600/25"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                  <span>Importing PR Risk Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Import Test Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
