"""
Pydantic models for request/response validation.
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    PENDING = "PENDING"


class WorkOrderStatus(str, Enum):
    PENDING_REVIEW = "Pending Review"
    APPROVED = "Approved"
    ASSIGNED = "Assigned"
    INSPECTION_IN_PROGRESS = "Inspection in Progress"
    REPAIR_IN_PROGRESS = "Repair in Progress"
    VERIFICATION = "Verification"
    CLOSED = "Closed"
    REJECTED = "Rejected"
    ON_HOLD = "On Hold"


class Priority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class ConditionObserved(str, Enum):
    GOOD = "Good"
    FAIR = "Fair"
    POOR = "Poor"
    CRITICAL = "Critical"
    FAILED = "Failed"


# ─── Pipeline models ─────────────────────────────────────────────────────────

class PipelineBase(BaseModel):
    pipeline_id: str
    location: str
    material: str
    diameter_mm: Optional[float] = None
    length_m: Optional[float] = None
    installation_year: Optional[int] = None
    age_years: Optional[float] = None
    previous_leaks: Optional[int] = 0
    repair_count: Optional[int] = 0
    operating_pressure_bar: Optional[float] = None
    soil_type: Optional[str] = None
    condition_score: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_name: Optional[str] = None
    source_record_id: Optional[str] = None
    provenance: Optional[str] = "ENGINEER_SUBMITTED"
    source_type: Optional[str] = None
    retrieved_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    is_synthetic: Optional[bool] = False
    data_freshness_label: Optional[str] = "Current"


class PipelineCreate(PipelineBase):
    pass


class PipelineUpdate(BaseModel):
    location: Optional[str] = None
    material: Optional[str] = None
    diameter_mm: Optional[float] = None
    length_m: Optional[float] = None
    installation_year: Optional[int] = None
    age_years: Optional[float] = None
    previous_leaks: Optional[int] = None
    repair_count: Optional[int] = None
    operating_pressure_bar: Optional[float] = None
    soil_type: Optional[str] = None
    condition_score: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class PipelineResponse(PipelineBase):
    id: str
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = RiskLevel.PENDING
    assessment_id: Optional[str] = None
    assessment_timestamp: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Inspection models ────────────────────────────────────────────────────────

class InspectionCreate(BaseModel):
    pipeline_id: str
    inspection_date: str  # ISO date string
    condition_observed: ConditionObserved
    leakage_observed: bool = False
    corrosion_observed: bool = False
    notes: Optional[str] = None
    follow_up_recommendation: Optional[str] = None
    photo_url: Optional[str] = None


class InspectionResponse(InspectionCreate):
    id: str
    submitted_by: Optional[str] = None
    submitted_at: Optional[datetime] = None
    risk_reassessment_needed: bool = False

    class Config:
        from_attributes = True


# ─── Risk Assessment models ───────────────────────────────────────────────────

class RiskAssessmentResponse(BaseModel):
    model_config = {"protected_namespaces": (), "from_attributes": True}
    id: str
    pipeline_id: str
    risk_score: float
    risk_level: RiskLevel
    confidence: float
    model_version: str
    assessment_type: str  # "rule_based" or "ml_model"
    feature_inputs: dict
    risk_breakdown: dict
    risk_factors: dict
    assessed_at: datetime
    assessed_by: Optional[str] = None
    is_current: bool = True


# ─── Work Order models ────────────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    pipeline_id: str
    assessment_id: Optional[str] = None
    priority: Priority
    recommended_action: str
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None


class WorkOrderStatusUpdate(BaseModel):
    status: WorkOrderStatus
    notes: Optional[str] = None
    reason: Optional[str] = None  # for REJECTED or ON_HOLD


class WorkOrderResponse(BaseModel):
    id: str
    pipeline_id: str
    assessment_id: Optional[str] = None
    status: WorkOrderStatus
    priority: Priority
    recommended_action: str
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    due_date: Optional[str] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    verification_result: Optional[str] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True


# ─── Sync / Import models ─────────────────────────────────────────────────────

class SyncLogResponse(BaseModel):
    id: str
    source_name: str
    source_organization: str
    endpoint_url: str
    sync_status: str  # "SUCCESS" | "PARTIAL" | "FAILED" | "TIMEOUT"
    records_fetched: int = 0
    records_imported: int = 0
    records_updated: int = 0
    records_skipped: int = 0
    error_message: Optional[str] = None
    warning_message: Optional[str] = None
    triggered_by: Optional[str] = None
    triggered_by_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Dashboard stats ──────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_pipelines: int = 0
    high_risk: int = 0
    medium_risk: int = 0
    low_risk: int = 0
    pending_assessment: int = 0
    pending_inspections: int = 0
    active_work_orders: int = 0
    overdue_work_orders: int = 0
    completed_work_orders: int = 0
    last_sync_source: Optional[str] = None
    last_sync_time: Optional[datetime] = None
    last_sync_status: Optional[str] = None


# ─── Auth models ──────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str
