import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Policy(Base):
    __tablename__ = "policies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=True)  # Null means default org policy
    name = Column(String(128), default="Default Security Gate")
    
    # Gate Rules
    block_on_critical = Column(Boolean, default=True)
    block_on_high = Column(Boolean, default=True)
    block_unverified_sensitive_mods = Column(Boolean, default=True)
    max_risk_score = Column(Integer, default=70)  # PRs with score > max_risk_score are BLOCKED
    require_ai_verification = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    repository = relationship("Repository", back_populates="policies")
