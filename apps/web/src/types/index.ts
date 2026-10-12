export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface TestSuggestion {
  command: string;
  description: string;
  framework: string;
}

export interface Finding {
  id: string;
  scan_id: string;
  fingerprint: string;
  rule_id: string;
  source: 'semgrep' | 'bandit' | 'pip_audit' | 'secrets' | 'ast' | 'ai_hypothesis';
  severity: SeverityLevel;
  is_verified: boolean;
  confidence: number;
  file_path: string;
  start_line: number;
  end_line: number;
  code_snippet?: string;
  title: string;
  explanation?: string;
  why_it_matters?: string;
  impact?: string;
  suggested_tests: TestSuggestion[];
  safer_alternative?: string;
  evidence_refs: Array<Record<string, any>>;
  created_at: string;
}

export interface ScanSummaryCounts {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  verified: number;
  hypotheses: number;
}

export interface Scan {
  id: string;
  pr_id: string;
  commit_sha: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  pipeline_stage: string;
  risk_score: number;
  uncertainty_range: number;
  merge_decision: 'BLOCK' | 'REVIEW' | 'SAFE';
  summary?: string;
  pipeline_timings: Record<string, number>;
  created_at: string;
  completed_at?: string;
  counts?: ScanSummaryCounts;
  findings?: Finding[];
}

export interface PullRequest {
  id: string;
  repo_id: string;
  pr_number: number;
  title: string;
  author: string;
  source_branch: string;
  target_branch: string;
  head_sha: string;
  state: string;
  created_at: string;
  updated_at: string;
  latest_scan?: Scan;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  is_active: boolean;
  open_prs_count: number;
  health_score: number;
  recent_scans_count: number;
}

export interface GraphNodeData {
  label: string;
  kind: string;
  file_path: string;
  is_changed: boolean;
  is_sensitive: boolean;
  sensitive_category?: string;
  call_depth: number;
  metrics?: Record<string, any>;
}

export interface GraphNode {
  id: string;
  type?: string;
  data: GraphNodeData;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface CallGraphData {
  scan_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  affected_modules: string[];
  sensitive_touchpoints: string[];
}

export interface Policy {
  id: string;
  repo_id?: string;
  name: string;
  block_on_critical: boolean;
  block_on_high: boolean;
  block_unverified_sensitive_mods: boolean;
  max_risk_score: number;
  require_ai_verification: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicySimulation {
  policy: Policy;
  total_evaluated_scans: number;
  would_block_count: number;
  would_review_count: number;
  would_pass_count: number;
  blocked_percentage: number;
}

export interface FeedbackMetrics {
  total_feedbacks: number;
  accepted_count: number;
  rejected_count: number;
  corrected_count: number;
  precision_rate: number;
  verified_precision: number;
  hypothesis_precision: number;
}
