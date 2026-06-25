import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, DateTime, Enum, ForeignKey, Integer, String, Text
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class LabType(str, enum.Enum):
    LINUX = "linux"
    GIT = "git"
    DOCKER = "docker"


class LabStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    EXPIRED = "expired"
    DELETED = "deleted"
    ERROR = "error"


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    labs = relationship("Lab", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Lab(Base):
    __tablename__ = "labs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lab_type = Column(Enum(LabType), nullable=False)
    namespace_name = Column(String(128), nullable=False)
    deployment_name = Column(String(128), nullable=False)
    service_name = Column(String(128), nullable=False)
    status = Column(Enum(LabStatus), default=LabStatus.PENDING, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="labs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(128), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="audit_logs")
