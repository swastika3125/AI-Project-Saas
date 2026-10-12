import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    pr_number = Column(Integer, nullable=False, index=True)
    title = Column(String(512), nullable=False)
    author = Column(String(128), nullable=False)
    source_branch = Column(String(255), nullable=False)
    target_branch = Column(String(255), default="main")
    head_sha = Column(String(64), nullable=False)
    state = Column(String(32), default="open")  # open, closed, merged
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    repository = relationship("Repository", back_populates="pull_requests")
    scans = relationship("Scan", back_populates="pull_request", cascade="all, delete-orphan", order_by="desc(Scan.created_at)")

    __table_args__ = (
        Index("idx_repo_pr", "repo_id", "pr_number", unique=True),
    )
