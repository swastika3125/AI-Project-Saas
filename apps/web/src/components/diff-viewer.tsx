"use client";

import React, { useState } from "react";
import { ShieldAlert, FileText, Check, Plus, Minus } from "lucide-react";
import { Finding } from "@/types";

interface DiffViewerProps {
  findings: Finding[];
}

export function DiffViewer({ findings }: DiffViewerProps) {
  const [selectedFile, setSelectedFile] = useState("app/auth/tokens.py");

  // Realistic sample diff lines for Hero PR
  const diffFiles: Record<
    string,
    Array<{ type: "same" | "add" | "del"; oldLine?: number; newLine?: number; code: string; findingId?: string }>
  > = {
    "app/auth/tokens.py": [
      { type: "same", oldLine: 38, newLine: 38, code: "def authenticate_request(token: str) -> dict:" },
      { type: "same", oldLine: 39, newLine: 39, code: "    if not token:" },
      { type: "same", oldLine: 40, newLine: 40, code: "        raise AuthenticationError('Token required')" },
      { type: "del", oldLine: 41, code: "-   # Strict verification" },
      { type: "del", oldLine: 42, code: "-   payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])" },
      {
        type: "add",
        newLine: 41,
        code: "+   # Temporarily disable verification to unblock legacy client rollout",
      },
      {
        type: "add",
        newLine: 42,
        code: "+   payload = jwt.decode(token, options={'verify_signature': False})",
        findingId: "find-hero-1",
      },
      { type: "same", oldLine: 43, newLine: 43, code: "    return payload" },
      { type: "same", oldLine: 44, newLine: 44, code: "" },
      { type: "same", oldLine: 45, newLine: 45, code: "def issue_refresh_token(user_id: str) -> str:" },
      { type: "add", newLine: 46, code: "+   return jwt.encode({'sub': user_id, 'type': 'refresh'}, settings.SECRET_KEY)" },
    ],
    "app/auth/audit.py": [
      { type: "same", oldLine: 82, newLine: 82, code: "async def log_auth_event(user_id: str, client_ip: str):" },
      { type: "del", oldLine: 83, code: "-   stmt = insert(AuditLog).values(user_id=user_id, ip=client_ip)" },
      {
        type: "add",
        newLine: 83,
        code: "+   # Direct raw SQL execution for fast bulk logging",
      },
      {
        type: "add",
        newLine: 84,
        code: "+   query = f\"INSERT INTO auth_audit_logs (user_id, ip) VALUES ('{user_id}', '{client_ip}')\"",
        findingId: "find-hero-2",
      },
      { type: "add", newLine: 85, code: "+   await db.execute(text(query))" },
      { type: "same", oldLine: 86, newLine: 86, code: "    return True" },
    ],
  };

  const currentDiff = diffFiles[selectedFile] || diffFiles["app/auth/tokens.py"];

  return (
    <div className="rounded-xl border border-border/80 overflow-hidden glass-panel">
      {/* File Selector Tabs */}
      <div className="flex items-center gap-2 p-3 bg-secondary/40 border-b border-border/60 overflow-x-auto">
        {Object.keys(diffFiles).map((file) => {
          const fileFindings = findings.filter((f) => f.file_path === file);
          return (
            <button
              key={file}
              onClick={() => setSelectedFile(file)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                selectedFile === file
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold"
                  : "bg-secondary/60 hover:bg-secondary text-muted-foreground border border-border/40"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{file}</span>
              {fileFindings.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] flex items-center justify-center font-bold">
                  {fileFindings.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Code Lines with Inline Finding Highlights */}
      <div className="overflow-x-auto font-mono text-xs">
        <table className="w-full border-collapse">
          <tbody>
            {currentDiff.map((line, idx) => {
              const matchedFinding = line.findingId ? findings.find((f) => f.id === line.findingId) : null;

              return (
                <React.Fragment key={idx}>
                  <tr
                    className={`transition-colors ${
                      line.type === "add"
                        ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                        : line.type === "del"
                        ? "bg-red-500/10 hover:bg-red-500/15"
                        : "hover:bg-secondary/20"
                    }`}
                  >
                    {/* Line numbers */}
                    <td className="w-10 px-2 py-1 text-right text-muted-foreground/60 select-none border-r border-border/30">
                      {line.oldLine || ""}
                    </td>
                    <td className="w-10 px-2 py-1 text-right text-muted-foreground/60 select-none border-r border-border/30">
                      {line.newLine || ""}
                    </td>

                    {/* Diff indicator (+/-) */}
                    <td className="w-6 px-1.5 py-1 text-center select-none">
                      {line.type === "add" && <Plus className="w-3 h-3 text-emerald-400 inline" />}
                      {line.type === "del" && <Minus className="w-3 h-3 text-red-400 inline" />}
                    </td>

                    {/* Code Text */}
                    <td className="px-3 py-1 text-foreground whitespace-pre">
                      <span
                        className={
                          line.type === "add"
                            ? "text-emerald-300"
                            : line.type === "del"
                            ? "text-red-300 line-through opacity-75"
                            : "text-zinc-300"
                        }
                      >
                        {line.code}
                      </span>
                    </td>
                  </tr>

                  {/* Inline Finding Marker Card */}
                  {matchedFinding && (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <div className="mx-8 my-2 p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-red-200 flex items-start gap-3 shadow-lg">
                          <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                                {matchedFinding.severity}
                              </span>
                              <span className="text-xs font-semibold text-foreground">{matchedFinding.title}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({matchedFinding.rule_id})
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {matchedFinding.explanation}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
