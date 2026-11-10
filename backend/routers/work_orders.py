"""
Work Orders router with valid status transitions enforcement.
"""
import uuid
from datetime import datetime, timezone, date
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models import WorkOrderCreate, WorkOrderStatusUpdate, WorkOrderResponse, WorkOrderStatus
from database import get_supabase

router = APIRouter()

# Valid status transitions (backend enforces these)
VALID_TRANSITIONS: dict[str, list[str]] = {
    "Pending Review": ["Approved", "Rejected", "On Hold"],
    "Approved": ["Assigned", "On Hold", "Rejected"],
    "Assigned": ["Inspection in Progress", "On Hold"],
    "Inspection in Progress": ["Repair in Progress", "Verification", "On Hold"],
    "Repair in Progress": ["Verification", "On Hold"],
    "Verification": ["Closed", "Repair in Progress"],
    "Closed": [],  # Terminal state
    "Rejected": ["Pending Review"],  # Can re-open
    "On Hold": ["Pending Review", "Approved", "Assigned"],
}


def _is_overdue(wo: dict) -> bool:
    due = wo.get("due_date")
    status = wo.get("status", "")
    if not due or status == "Closed":
        return False
    try:
        return date.fromisoformat(due) < date.today()
    except ValueError:
        return False


@router.get("/", response_model=list[WorkOrderResponse])
def list_work_orders(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    pipeline_id: Optional[str] = None,
    overdue_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    q = sb.table("work_orders").select("*").order("created_at", desc=True)

    if status:
        q = q.eq("status", status)
    if priority:
        q = q.eq("priority", priority)
    if pipeline_id:
        q = q.eq("pipeline_id", pipeline_id)

    r = q.range(skip, skip + limit - 1).execute()
    items = r.data or []

    if overdue_only:
        items = [w for w in items if _is_overdue(w)]

    for w in items:
        w["is_overdue"] = _is_overdue(w)

    return items


@router.get("/{work_order_id}", response_model=WorkOrderResponse)
def get_work_order(work_order_id: str):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    r = sb.table("work_orders")\
        .select("*")\
        .eq("id", work_order_id)\
        .maybe_single()\
        .execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Work order not found")

    wo = r.data
    wo["is_overdue"] = _is_overdue(wo)
    return wo


@router.post("/", response_model=WorkOrderResponse, status_code=201)
def create_work_order(data: WorkOrderCreate, created_by: str = "system"):
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Verify pipeline exists
    p = sb.table("pipelines")\
        .select("id")\
        .eq("pipeline_id", data.pipeline_id)\
        .maybe_single()\
        .execute()
    if not p.data:
        raise HTTPException(status_code=404, detail=f"Pipeline '{data.pipeline_id}' not found")

    wo_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "id": wo_id,
        "pipeline_id": data.pipeline_id,
        "assessment_id": data.assessment_id,
        "status": WorkOrderStatus.PENDING_REVIEW,
        "priority": data.priority,
        "recommended_action": data.recommended_action,
        "assigned_to": data.assigned_to,
        "due_date": data.due_date,
        "notes": data.notes,
        "created_by": created_by,
        "created_at": now,
    }

    r = sb.table("work_orders").insert(record).execute()
    if not r.data:
        raise HTTPException(status_code=500, detail="Failed to create work order")

    # Audit
    sb.table("audit_logs").insert({
        "id": str(uuid.uuid4()),
        "entity_type": "work_order",
        "entity_id": wo_id,
        "action": "WORK_ORDER_CREATED",
        "performed_by": created_by,
        "performed_at": now,
        "details": {"pipeline_id": data.pipeline_id, "priority": data.priority},
    }).execute()

    wo = r.data[0]
    wo["is_overdue"] = _is_overdue(wo)
    return wo


@router.patch("/{work_order_id}/status", response_model=WorkOrderResponse)
def update_work_order_status(
    work_order_id: str,
    update: WorkOrderStatusUpdate,
    updated_by: str = "system",
):
    """
    Update work order status with transition validation.
    Backend enforces valid status transitions — frontend cannot bypass this.
    """
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Fetch current work order
    r = sb.table("work_orders")\
        .select("*")\
        .eq("id", work_order_id)\
        .maybe_single()\
        .execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Work order not found")

    current_status = r.data["status"]
    new_status = update.status.value

    # Validate transition
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid status transition: '{current_status}' → '{new_status}'. "
                f"Allowed transitions: {allowed}"
            )
        )

    now = datetime.now(timezone.utc).isoformat()
    patch = {"status": new_status, "updated_at": now}

    if new_status == "Closed":
        patch["completed_at"] = now
    if update.notes:
        patch["notes"] = update.notes
    if update.reason:
        patch["rejection_reason"] = update.reason

    updated = sb.table("work_orders")\
        .update(patch)\
        .eq("id", work_order_id)\
        .execute()

    # Audit
    sb.table("audit_logs").insert({
        "id": str(uuid.uuid4()),
        "entity_type": "work_order",
        "entity_id": work_order_id,
        "action": f"STATUS_CHANGED_{current_status.upper().replace(' ', '_')}_TO_{new_status.upper().replace(' ', '_')}",
        "performed_by": updated_by,
        "performed_at": now,
        "details": {
            "from_status": current_status,
            "to_status": new_status,
            "reason": update.reason,
        },
    }).execute()

    wo = updated.data[0]
    wo["is_overdue"] = _is_overdue(wo)
    return wo


@router.get("/{work_order_id}/history")
def get_work_order_history(work_order_id: str):
    """Return full audit trail for a work order."""
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    r = sb.table("audit_logs")\
        .select("*")\
        .eq("entity_id", work_order_id)\
        .order("performed_at", desc=True)\
        .execute()
    return r.data or []
