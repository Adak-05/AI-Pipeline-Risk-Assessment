"""
Inspections router — engineer inspection submissions.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models import InspectionCreate, InspectionResponse
from database import get_supabase

router = APIRouter()


@router.get("/", response_model=list[InspectionResponse])
def list_inspections(
    pipeline_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    q = sb.table("inspections").select("*").order("submitted_at", desc=True)
    if pipeline_id:
        q = q.eq("pipeline_id", pipeline_id)
    r = q.range(skip, skip + limit - 1).execute()
    return r.data or []


@router.post("/", response_model=InspectionResponse, status_code=201)
def submit_inspection(data: InspectionCreate, submitted_by: str = "system"):
    """
    Submit an engineer inspection record.
    Validates pipeline exists, saves record, marks risk assessment as outdated
    if relevant parameters changed.
    """
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Verify pipeline exists
    p = sb.table("pipelines")\
        .select("id, pipeline_id")\
        .eq("pipeline_id", data.pipeline_id)\
        .maybe_single()\
        .execute()
    if not p.data:
        raise HTTPException(
            status_code=404,
            detail=f"Pipeline '{data.pipeline_id}' not found. Register it first."
        )

    # Determine if risk reassessment is needed
    # Triggers: leakage observed, corrosion observed, poor/critical/failed condition
    risk_reassessment_needed = (
        data.leakage_observed
        or data.corrosion_observed
        or data.condition_observed in ("Poor", "Critical", "Failed")
    )

    record = {
        "id": str(uuid.uuid4()),
        "pipeline_id": data.pipeline_id,
        "inspection_date": data.inspection_date,
        "condition_observed": data.condition_observed,
        "leakage_observed": data.leakage_observed,
        "corrosion_observed": data.corrosion_observed,
        "notes": data.notes,
        "follow_up_recommendation": data.follow_up_recommendation,
        "photo_url": data.photo_url,
        "submitted_by": submitted_by,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "risk_reassessment_needed": risk_reassessment_needed,
    }

    r = sb.table("inspections").insert(record).execute()
    if not r.data:
        raise HTTPException(status_code=500, detail="Failed to save inspection record")

    # If reassessment needed, mark current risk assessment as outdated
    if risk_reassessment_needed:
        sb.table("risk_assessments")\
            .update({"is_current": False, "outdated_reason": "New inspection indicates changed conditions"})\
            .eq("pipeline_id", data.pipeline_id)\
            .eq("is_current", True)\
            .execute()

    # Log audit entry
    sb.table("audit_logs").insert({
        "id": str(uuid.uuid4()),
        "entity_type": "inspection",
        "entity_id": record["id"],
        "action": "INSPECTION_SUBMITTED",
        "performed_by": submitted_by,
        "performed_at": record["submitted_at"],
        "details": {
            "pipeline_id": data.pipeline_id,
            "condition": data.condition_observed,
            "leakage": data.leakage_observed,
            "reassessment_triggered": risk_reassessment_needed,
        },
    }).execute()

    return r.data[0]


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(inspection_id: str):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    r = sb.table("inspections")\
        .select("*")\
        .eq("id", inspection_id)\
        .maybe_single()\
        .execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return r.data
