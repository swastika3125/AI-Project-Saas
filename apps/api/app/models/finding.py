import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False)
    fingerprint = Column(String(128), index=True, nullable=False)  # For cross-scan deduplication
    
    # Classification
    severity = Column(String(32), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    is_verified = Column(Boolean, default=True)   # True for deterministic scanners; False for AI hypotheses
    confidence = Column(Float, default=1.0)       # 0.0 to 1.0
    source = Column(String(64), nullable=False)   # semgrep, bandit, pip_audit, secrets, ast, ai_hypothesis
    rule_id = Column(String(128), nullable=False) # e.g. bandit.B608, semgrep.sql_injection

    # Code Location
    file_path = Column(String(512), nullable=False)
    start_line = Column(Integer, default=1)
    end_line = Column(Integer, default=1)
    code_snippet = Column(Text, nullable=True)

    # Context & Explanation
    title = Column(String(512), nullable=False)
    explanation = Column(Text, nullable=True)
    why_it_matters = Column(Text, nullable=True)
    impact = Column(Text, nullable=True)

    # Actionable Remediations
    suggested_tests = Column(JSON, default=list)  # list of {"command": "...", "description": "..."}
    safer_alternative = Column(Text, nullable=True) # Diff or safer code snippet
    evidence_refs = Column(JSON, default=list)    # Raw scanner pointers or AST nodes

    created_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="findings")
    feedbacks = relationship("FindingFeedback", back_populates="finding", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_scan_severity", "scan_id", "severity"),
        Index("idx_scan_verified", "scan_id", "is_verified"),
    )
