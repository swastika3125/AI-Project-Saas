import { PullRequest, Scan, Repository, CallGraphData, Policy, PolicySimulation, FeedbackMetrics, OverviewStats, ImportResult } from "@/types";
import {
  DEMO_REPOSITORIES,
  DEMO_HERO_SCAN,
  DEMO_PULL_REQUESTS,
  DEMO_CALL_GRAPH,
  DEMO_POLICY,
  DEMO_FEEDBACK_METRICS,
} from "./demo-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

async function fetchJson<T>(url: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    // Graceful fallback to rich local demo data
    return fallback;
  }
}

export const api = {
  // Repositories
  async getRepositories(): Promise<Repository[]> {
    return fetchJson<Repository[]>("/repos", DEMO_REPOSITORIES);
  },

  // Pull Requests
  async getPullRequests(repoId?: string): Promise<PullRequest[]> {
    const query = repoId ? `?repo_id=${repoId}` : "";
    return fetchJson<PullRequest[]>(`/pull-requests${query}`, DEMO_PULL_REQUESTS);
  },

  async getPullRequest(prId: string): Promise<PullRequest> {
    const found = DEMO_PULL_REQUESTS.find((p) => p.id === prId) || DEMO_PULL_REQUESTS[0];
    return fetchJson<PullRequest>(`/pull-requests/${prId}`, found);
  },

  async triggerRescan(prId: string): Promise<{ status: string; scan_id: string }> {
    return fetchJson<{ status: string; scan_id: string }>(`/pull-requests/${prId}/rescan`, {
      status: "enqueued",
      scan_id: "demo-scan-142",
    }, { method: "POST" });
  },

  // Scans
  async getScan(scanId: string): Promise<Scan> {
    return fetchJson<Scan>(`/scans/${scanId}`, DEMO_HERO_SCAN);
  },

  async getRiskTrends(): Promise<Array<{ timestamp: string; risk_score: number; uncertainty: number; decision: string }>> {
    const defaultTrends = [
      { timestamp: "Oct 06", risk_score: 42, uncertainty: 6.5, decision: "REVIEW" },
      { timestamp: "Oct 07", risk_score: 38, uncertainty: 5.0, decision: "SAFE" },
      { timestamp: "Oct 08", risk_score: 55, uncertainty: 7.2, decision: "REVIEW" },
      { timestamp: "Oct 09", risk_score: 24, uncertainty: 4.8, decision: "SAFE" },
      { timestamp: "Oct 10", risk_score: 74, uncertainty: 8.5, decision: "BLOCK" },
      { timestamp: "Oct 11", risk_score: 48, uncertainty: 6.0, decision: "REVIEW" },
      { timestamp: "Oct 12", risk_score: 86, uncertainty: 5.5, decision: "BLOCK" },
    ];
    return fetchJson("/scans/trends", defaultTrends);
  },

  // Impact Call Graph
  async getImpactGraph(scanId: string): Promise<CallGraphData> {
    return fetchJson<CallGraphData>(`/impact/${scanId}`, DEMO_CALL_GRAPH);
  },

  // Policies
  async getPolicies(): Promise<Policy[]> {
    return fetchJson<Policy[]>("/policies", [DEMO_POLICY]);
  },

  async updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy> {
    return fetchJson<Policy>(`/policies/${id}`, { ...DEMO_POLICY, ...updates }, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async simulatePolicy(id: string): Promise<PolicySimulation> {
    return fetchJson<PolicySimulation>(`/policies/${id}/simulate`, {
      policy: DEMO_POLICY,
      total_evaluated_scans: 45,
      would_block_count: 12,
      would_review_count: 18,
      would_pass_count: 15,
      blocked_percentage: 26.7,
    });
  },

  // Feedback
  async submitFeedback(findingId: string, action: string, note?: string): Promise<{ status: string }> {
    return fetchJson<{ status: string }>("/feedback", { status: "recorded" }, {
      method: "POST",
      body: JSON.stringify({ finding_id: findingId, action, note }),
    });
  },

  async getFeedbackMetrics(): Promise<FeedbackMetrics> {
    return fetchJson<FeedbackMetrics>("/feedback/metrics", DEMO_FEEDBACK_METRICS);
  },

  // Overview Stats
  async getOverviewStats(): Promise<OverviewStats> {
    const defaultStats: OverviewStats = {
      scanned_prs_count: 3,
      policy_gating_blocks: 2,
      avg_latency_ms: 1.24,
      precision_rate: 96.8,
      tracked_repos_count: 3,
      total_findings_count: 5,
      verified_findings_count: 4,
      hypotheses_count: 1,
    };
    return fetchJson<OverviewStats>("/overview/stats", defaultStats);
  },

  // Test Data Import
  async importTestData(payload: any): Promise<ImportResult> {
    const res = await fetch(`${API_BASE}/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Failed to parse error response" }));
      const errorMsg = typeof errorData.detail === "string" 
        ? errorData.detail 
        : Array.isArray(errorData.detail)
        ? errorData.detail.map((e: any) => `${e.loc?.join(".")}: ${e.msg}`).join("; ")
        : `Server error (${res.status})`;
      throw new Error(errorMsg);
    }
    return (await res.json()) as ImportResult;
  },
};

