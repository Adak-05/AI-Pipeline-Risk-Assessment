"""
Pipelines CRUD router.
"""
import uuid
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from models import PipelineCreate, PipelineUpdate, PipelineResponse
from database import get_supabase
from routers.sync import get_current_engineer_or_admin

router = APIRouter()


@router.get("/", response_model=list[PipelineResponse])
def list_pipelines(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    risk_level: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    query = sb.table("pipelines").select(
        "*, risk_assessments(risk_score, risk_level, id, assessed_at)"
    )

    if risk_level:
        query = query.eq("current_risk_level", risk_level.upper())
    if source:
        query = query.eq("source_name", source)
    if search:
        query = query.ilike("pipeline_id", f"%{search}%")

    result = query.range(skip, skip + limit - 1).execute()
    return result.data or []


@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline(pipeline_id: str):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    r = sb.table("pipelines")\
        .select("*, risk_assessments(risk_score, risk_level, id, assessed_at)")\
        .eq("pipeline_id", pipeline_id)\
        .maybe_single()\
        .execute()

    if not r.data:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")
    return r.data


@router.post("/", response_model=PipelineResponse, status_code=201)
def create_pipeline(data: PipelineCreate):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Check for duplicate
    existing = sb.table("pipelines")\
        .select("id")\
        .eq("pipeline_id", data.pipeline_id)\
        .maybe_single()\
        .execute()
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail=f"Pipeline ID '{data.pipeline_id}' already exists. Use PUT to update."
        )

    record = data.model_dump()
    record["id"] = str(uuid.uuid4())
    record["current_risk_level"] = "PENDING"

    r = sb.table("pipelines").insert(record).execute()
    if not r.data:
        raise HTTPException(status_code=500, detail="Failed to create pipeline record")
    return r.data[0]


@router.put("/{pipeline_id}", response_model=PipelineResponse)
def update_pipeline(pipeline_id: str, data: PipelineUpdate):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided")

    r = sb.table("pipelines")\
        .update(updates)\
        .eq("pipeline_id", pipeline_id)\
        .execute()

    if not r.data:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")
    return r.data[0]


@router.delete("/demo/clear", status_code=200)
def clear_demo_pipelines(current_user: dict = Depends(get_current_engineer_or_admin)):
    """
    Delete ONLY records where is_synthetic = True and provenance = 'SYNTHETIC_DEMO'.
    Requires authorized administrator credentials.
    Strictly preserves all official GIS and engineer-submitted records.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Administrator privilege required to clear synthetic demonstration records."
        )

    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    r = sb.table("pipelines")\
        .delete()\
        .eq("is_synthetic", True)\
        .eq("provenance", "SYNTHETIC_DEMO")\
        .execute()

    deleted_count = len(r.data) if r.data else 0
    return {
        "message": "Synthetic demonstration records cleared successfully.",
        "deleted_count": deleted_count
    }


@router.delete("/{pipeline_id}", status_code=204)
def delete_pipeline(pipeline_id: str):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    sb.table("pipelines").delete().eq("pipeline_id", pipeline_id).execute()
