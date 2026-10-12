from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class GraphNodePosition(BaseModel):
    x: float = 0.0
    y: float = 0.0


class GraphNodeData(BaseModel):
    label: str
    kind: str  # function, class, module
    file_path: str
    is_changed: bool = False
    is_sensitive: bool = False
    sensitive_category: Optional[str] = None  # auth, payment, crypto, database
    call_depth: int = 0
    metrics: Dict[str, Any] = Field(default_factory=dict)


class GraphNode(BaseModel):
    id: str
    type: str = "custom"
    data: GraphNodeData
    position: GraphNodePosition = Field(default_factory=GraphNodePosition)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: bool = True
    style: Dict[str, Any] = Field(default_factory=dict)


class CallGraphResponse(BaseModel):
    scan_id: str
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    affected_modules: List[str] = Field(default_factory=list)
    sensitive_touchpoints: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
