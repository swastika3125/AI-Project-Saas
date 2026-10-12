import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pr_id = Column(String(36), ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    commit_sha = Column(String(64), nullable=False)
    status = Column(String(32), default="pending")  # pending, fetching, scanning, mapping, ai_analyzing, completed, failed
    pipeline_stage = Column(String(64), default="queued")
    risk_score = Column(Float, default=0.0)  # 0 to 100
    uncertainty_range = Column(Float, default=5.0)  # +/- margin
    merge_decision = Column(String(32), default="REVIEW")  # BLOCK, REVIEW, SAFE
    summary = Column(Text, nullable=True)
    pipeline_timings = Column(JSON, default=dict)  # {"fetch_ms": 120, "scan_ms": 450, ...}
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    pull_request = relationship("PullRequest", back_populates="scans")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")
    call_graph = relationship("CallGraph", back_populates="scan", uselist=False, cascade="all, delete-orphan")
