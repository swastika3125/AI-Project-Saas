from typing import Dict, List, Set, Any, Tuple
from app.services.analyzer.ast_parser import parse_python_module, FileASTSummary, FunctionInfo
from app.services.analyzer.sensitive import classify_sensitivity
from app.schemas.call_graph import GraphNode, GraphEdge, GraphNodeData, GraphNodePosition, CallGraphResponse


class CallGraphBuilder:
    def build_graph(
        self,
        scan_id: str,
        files: Dict[str, str],
        changed_line_ranges: Dict[str, List[Tuple[int, int]]] = None
    ) -> CallGraphResponse:
        """
        Builds a call graph across changed files, tracing:
        1. Changed functions (nodes modified directly in PR)
        2. Callers of changed functions (upstream blast radius)
        3. Sensitive touchpoints (auth/payment/crypto)
        """
        changed_line_ranges = changed_line_ranges or {}
        summaries: Dict[str, FileASTSummary] = {}
        all_funcs: Dict[str, FunctionInfo] = {}

        # 1. Parse all files
        for file_path, content in files.items():
            if file_path.endswith(".py"):
                sum_info = parse_python_module(file_path, content)
                summaries[file_path] = sum_info
                for fn_key, fn_obj in sum_info.functions.items():
                    all_funcs[f"{file_path}::{fn_key}"] = fn_obj

        # 2. Determine which functions are changed directly in the PR
        changed_node_keys: Set[str] = set()
        for key, fn in all_funcs.items():
            file_ranges = changed_line_ranges.get(fn.file_path, [])
            if not file_ranges:
                # If no specific line range passed, consider functions in the changed file
                changed_node_keys.add(key)
            else:
                for start, end in file_ranges:
                    if not (fn.end_line < start or fn.start_line > end):
                        changed_node_keys.add(key)
                        break

        # If still empty (e.g. mock/test files), mark all parsed functions
        if not changed_node_keys and all_funcs:
            changed_node_keys = set(list(all_funcs.keys())[:3])

        # 3. Find callers (callers call the target function)
        call_edges: List[Tuple[str, str]] = []  # (caller_key, callee_key)
        for caller_key, caller_fn in all_funcs.items():
            for callee_key, callee_fn in all_funcs.items():
                if caller_key != callee_key:
                    # If caller references callee function name in its calls
                    if callee_fn.name in caller_fn.calls:
                        call_edges.append((caller_key, callee_key))

        # 4. Filter nodes to relevant blast radius (changed + callers + callees)
        relevant_keys = set(changed_node_keys)
        for caller, callee in call_edges:
            if callee in changed_node_keys:
                relevant_keys.add(caller)
            if caller in changed_node_keys:
                relevant_keys.add(callee)

        # If too few nodes found (e.g. isolated PR functions), keep all parsed
        if len(relevant_keys) < 2 and all_funcs:
            relevant_keys = set(all_funcs.keys())

        # 5. Build React Flow Nodes with Positions
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []
        affected_modules: Set[str] = set()
        sensitive_touchpoints: Set[str] = set()

        sorted_keys = sorted(list(relevant_keys))
        
        # Position grid: Col 0 for callers, Col 1 for changed functions, Col 2 for callees/sinks
        col_0_y = 50.0
        col_1_y = 50.0
        col_2_y = 50.0

        node_positions: Dict[str, Tuple[float, float]] = {}

        for key in sorted_keys:
            fn = all_funcs[key]
            is_changed = key in changed_node_keys
            is_sensitive, sensitive_cat = classify_sensitivity(fn.name, fn.file_path)

            affected_modules.add(fn.file_path)
            if is_sensitive:
                sensitive_touchpoints.add(f"{fn.name} ({sensitive_cat})")

            # Determine column position
            if is_changed:
                x = 350.0
                y = col_1_y
                col_1_y += 130.0
                depth = 1
            elif any(edge[1] == key for edge in call_edges if edge[0] in changed_node_keys):
                # Callee of changed
                x = 700.0
                y = col_2_y
                col_2_y += 130.0
                depth = 2
            else:
                # Caller of changed
                x = 50.0
                y = col_0_y
                col_0_y += 130.0
                depth = 0

            node_positions[key] = (x, y)

            nodes.append(GraphNode(
                id=key,
                type="custom",
                data=GraphNodeData(
                    label=fn.name,
                    kind="class_method" if fn.class_name else "function",
                    file_path=fn.file_path,
                    is_changed=is_changed,
                    is_sensitive=is_sensitive,
                    sensitive_category=sensitive_cat,
                    call_depth=depth,
                    metrics={
                        "start_line": fn.start_line,
                        "end_line": fn.end_line,
                        "total_calls": len(fn.calls),
                    }
                ),
                position=GraphNodePosition(x=x, y=y)
            ))

        # 6. Build React Flow Edges
        edge_idx = 0
        for caller, callee in call_edges:
            if caller in relevant_keys and callee in relevant_keys:
                edge_idx += 1
                edges.append(GraphEdge(
                    id=f"e-{edge_idx}",
                    source=caller,
                    target=callee,
                    label="calls",
                    animated=True,
                    style={"stroke": "#8B5CF6", "strokeWidth": 2}
                ))

        return CallGraphResponse(
            scan_id=scan_id,
            nodes=nodes,
            edges=edges,
            affected_modules=sorted(list(affected_modules)),
            sensitive_touchpoints=sorted(list(sensitive_touchpoints))
        )
