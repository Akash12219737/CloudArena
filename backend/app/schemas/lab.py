from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.db.models import LabType, LabStatus


class LabCreateRequest(BaseModel):
    lab_type: LabType


class LabResponse(BaseModel):
    id: int
    user_id: int
    lab_type: LabType
    namespace_name: str
    deployment_name: str
    service_name: str
    status: LabStatus
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class LabListResponse(BaseModel):
    labs: list[LabResponse]
    total: int


class PodStatusResponse(BaseModel):
    """Real-time pod status returned by GET /labs/{id}/pod-status."""
    phase: str                        # Running | Pending | Failed | Unknown | Succeeded
    pod_name: Optional[str] = None
    pod_ip: Optional[str] = None
    ready: bool = False
    mock: bool = False                # True when K8s is unavailable (mock mode)
