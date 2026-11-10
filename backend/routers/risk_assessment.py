"""
Risk Assessment router.
Runs the rule-based scoring engine on stored pipeline records.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models import RiskAssessmentResponse
from database import get_supabase
from risk_engine import calculate_risk

router = APIRouter()


@router.post("/assess/{pipeline_id}", response_model=RiskAssessmentResponse, status_code=201)
def assess_pipeline(pipeline_id: str, assessed_by: str = "system"):
    """
    Run rule-based risk scoring on a stored pipeline record.
    Marks previous assessment as no longer current.
    """
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Fetch pipeline record
    p = sb.table("pipelines")\
        .select("*")\
        .eq("pipeline_id", pipeline_id)\
        .maybe_single()\
        .execute()
    if not p.data:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

    pipeline = p.data

    # Validate required fields are present
    missing = []
    for f in ["material", "age_years", "condition_score"]:
        if pipeline.get(f) is None:
            missing.append(f)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot assess pipeline — missing required fields: {', '.join(missing)}"
        )

    # Run scoring engine
    result = calculate_risk(
        age_years=float(pipeline.get("age_years") or 0),
        condition_score=float(pipeline.get("condition_score") or 5),
        previous_leaks=int(pipeline.get("previous_leaks") or 0),
        repair_count=int(pipeline.get("repair_count") or 0),
        operating_pressure_bar=float(pipeline.get("operating_pressure_bar") or 3.5),
        material=str(pipeline.get("material") or "Ductile Iron"),
        soil_type=str(pipeline.get("soil_type") or "Sandy Loam"),
        inspection_year=pipeline.get("inspection_year"),
    )

    # Mark previous assessments as not current
    sb.table("risk_assessments")\
        .update({"is_current": False})\
        .eq("pipeline_id", pipeline_id)\
        .execute()

    # Save new assessment
    assessment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    assessment_record = {
        "id": assessment_id,
        "pipeline_id": pipeline_id,
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "model_version": result["model_version"],
        "assessment_type": result["assessment_type"],
        "feature_inputs": result["feature_inputs"],
        "risk_breakdown": result["risk_breakdown"],
        "risk_factors": result["risk_factors"],
        "is_current": True,
        "assessed_at": now,
        "assessed_by": assessed_by,
    }

    r = sb.table("risk_assessments").insert(assessment_record).execute()
    if not r.data:
        raise HTTPException(status_code=500, detail="Failed to save assessment")

    # Update pipeline's current risk level
    sb.table("pipelines")\
        .update({
            "current_risk_level": result["risk_level"],
            "current_risk_score": result["risk_score"],
            "assessment_id": assessment_id,
            "assessment_timestamp": now,
        })\
        .eq("pipeline_id", pipeline_id)\
        .execute()

    # Audit log
    sb.table("audit_logs").insert({
        "id": str(uuid.uuid4()),
        "entity_type": "risk_assessment",
        "entity_id": assessment_id,
        "action": "RISK_ASSESSED",
        "performed_by": assessed_by,
        "performed_at": now,
        "details": {
            "pipeline_id": pipeline_id,
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
        },
    }).execute()

    return {**r.data[0]}


@router.post("/assess-batch", status_code=202)
def assess_all_pipelines(assessed_by: str = "system"):
    """
    Run risk assessment on all pipelines that have no current assessment.
    Returns count of assessments triggered.
    """
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Find unassessed pipelines
    all_p = sb.table("pipelines").select("pipeline_id").execute()
    assessed = sb.table("risk_assessments")\
        .select("pipeline_id")\
        .eq("is_current", True)\
        .execute()
    assessed_ids = {r["pipeline_id"] for r in (assessed.data or [])}
    unassessed = [p["pipeline_id"] for p in (all_p.data or []) if p["pipeline_id"] not in assessed_ids]

    triggered = 0
    errors = []
    for pid in unassessed:
        try:
            assess_pipeline(pid, assessed_by)
            triggered += 1
        except Exception as e:
            errors.append({"pipeline_id": pid, "error": str(e)})

    return {
        "triggered": triggered,
        "errors": errors,
        "message": f"Assessment triggered for {triggered} pipelines",
    }


@router.get("/pipeline/{pipeline_id}", response_model=list[RiskAssessmentResponse])
def get_assessments_for_pipeline(pipeline_id: str, limit: int = Query(10, ge=1, le=50)):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    r = sb.table("risk_assessments")\
        .select("*")\
        .eq("pipeline_id", pipeline_id)\
        .order("assessed_at", desc=True)\
        .limit(limit)\
        .execute()
    return r.data or []


@router.get("/current", response_model=list[RiskAssessmentResponse])
def list_current_assessments(
    risk_level: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    q = sb.table("risk_assessments")\
        .select("*")\
        .eq("is_current", True)\
        .order("risk_score", desc=True)

    if risk_level:
        q = q.eq("risk_level", risk_level.upper())

    r = q.range(skip, skip + limit - 1).execute()
    return r.data or []
