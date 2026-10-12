import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    github_repo_id = Column(String(64), unique=True, index=True, nullable=True)
    full_name = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    owner = Column(String(128), nullable=False)
    default_branch = Column(String(64), default="main")
    webhook_secret = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    pull_requests = relationship("PullRequest", back_populates="repository", cascade="all, delete-orphan")
    policies = relationship("Policy", back_populates="repository", cascade="all, delete-orphan")
