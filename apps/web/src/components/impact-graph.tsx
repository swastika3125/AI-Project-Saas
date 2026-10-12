"use client";

import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ShieldAlert, Zap, FileCode, CheckCircle2, Lock, CreditCard, Database } from "lucide-react";
import { CallGraphData, GraphNodeData } from "@/types";

// Custom Node Component
function CustomImpactNode({ data }: NodeProps<GraphNodeData>) {
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "auth":
        return <Lock className="w-3.5 h-3.5 text-red-400" />;
      case "payment":
        return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
      case "data_access":
        return <Database className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div
      className={`relative px-4 py-3 rounded-xl min-w-[210px] transition-all duration-200 border text-left shadow-lg backdrop-blur-md ${
        data.is_sensitive
          ? "bg-red-950/20 border-red-500/50 shadow-red-500/10 ring-1 ring-red-500/20"
          : data.is_changed
          ? "bg-purple-950/20 border-purple-500/50 shadow-purple-500/10 ring-1 ring-purple-500/20"
          : "bg-card/90 border-border/80 text-foreground"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-purple-400 !border-0" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold truncate">
          {data.is_sensitive && getCategoryIcon(data.sensitive_category)}
          <span className="truncate">{data.label}</span>
        </div>

        {data.is_changed && (
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300">
            MODIFIED
          </span>
        )}
      </div>

      {/* File Location */}
      <div className="text-[11px] font-mono text-muted-foreground truncate mb-1">
        {data.file_path.split("/").slice(-2).join("/")}
      </div>

      {/* Bottom Category Badges */}
      <div className="flex items-center gap-1.5 mt-2">
        {data.is_sensitive && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 font-medium">
            Critical {data.sensitive_category?.toUpperCase()}
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground font-mono">
          L{data.metrics?.start_line || 1}-{data.metrics?.end_line || 20}
        </span>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-purple-400 !border-0" />
    </div>
  );
}

interface ImpactGraphProps {
  data: CallGraphData;
}

export function ImpactGraph({ data }: ImpactGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);

  const nodeTypes = useMemo(() => ({ custom: CustomImpactNode }), []);

  const onNodeClick = (_: React.MouseEvent, node: any) => {
    setSelectedNode(node.data);
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl border border-border/80 bg-background/50 overflow-hidden glass-panel">
      {/* Canvas Top Bar */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/60 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span>{data.nodes.length} Functions Mapped</span>
        </span>
        <span className="text-border">|</span>
        <span className="text-red-400 font-medium">
          {data.sensitive_touchpoints.length} Sensitive Surfaces
        </span>
      </div>

      <ReactFlow
        nodes={data.nodes as any}
        edges={data.edges as any}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-right"
        className="dark:bg-[#0A0B10]"
      >
        <Background color="#8B5CF6" gap={20} size={1} opacity={0.06} />
        <Controls className="!bg-card !border-border !rounded-lg overflow-hidden shadow-lg" />
        <MiniMap
          nodeColor={(n: any) => (n.data?.is_sensitive ? "#EF4444" : n.data?.is_changed ? "#8B5CF6" : "#64748B")}
          className="!bg-card/80 !border-border !rounded-lg overflow-hidden"
        />
      </ReactFlow>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-card/95 backdrop-blur-xl border border-border p-4 rounded-xl shadow-2xl flex items-start justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold font-mono text-foreground">{selectedNode.label}()</span>
              {selectedNode.is_changed && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/40">
                  Direct PR Modification
                </span>
              )}
              {selectedNode.is_sensitive && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold border border-red-500/40">
                  Critical {selectedNode.sensitive_category?.toUpperCase()} Blast Radius
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              File: {selectedNode.file_path} (Lines {selectedNode.metrics?.start_line} - {selectedNode.metrics?.end_line})
            </p>
            <p className="text-xs text-foreground/80">
              Downstream call sites: {selectedNode.metrics?.total_calls || 0} direct calls. Changes here affect upstream authentication and logging pathways.
            </p>
          </div>

          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs font-mono px-2.5 py-1 rounded-lg border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
