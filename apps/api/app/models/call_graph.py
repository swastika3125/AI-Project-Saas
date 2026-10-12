import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class CallGraph(Base):
    __tablename__ = "call_graphs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Serialized graph representation matching React Flow nodes and edges
    nodes = Column(JSON, default=list)  # [{"id": "...", "label": "...", "is_changed": True, ...}]
    edges = Column(JSON, default=list)  # [{"id": "...", "source": "...", "target": "...", ...}]
    
    # Impact Summary Metrics
    affected_modules = Column(JSON, default=list)
    sensitive_touchpoints = Column(JSON, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="call_graph")
