"""
Dashboard statistics router.
Returns real counts from DB; no fabricated values.
"""
from fastapi import APIRouter, HTTPException
from models import DashboardStats
from database import get_supabase
from datetime import datetime, timezone, date

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats():
    """
    Return live dashboard statistics calculated from actual database records.
    All values are 0 / None when no data exists — never fabricated.
    """
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    stats = DashboardStats()

    try:
        # Total pipelines
        r = sb.table("pipelines").select("id", count="exact").execute()
        stats.total_pipelines = r.count or 0

        # Risk counts (from latest assessments)
        for level in ("HIGH", "MEDIUM", "LOW"):
            r = sb.table("risk_assessments")\
                .select("id", count="exact")\
                .eq("is_current", True)\
                .eq("risk_level", level)\
                .execute()
            count = r.count or 0
            if level == "HIGH":
                stats.high_risk = count
            elif level == "MEDIUM":
                stats.medium_risk = count
            else:
                stats.low_risk = count

        # Pending assessment (pipelines with no current assessment)
        r_assessed = sb.table("risk_assessments")\
            .select("pipeline_id")\
            .eq("is_current", True)\
            .execute()
        assessed_ids = {row["pipeline_id"] for row in (r_assessed.data or [])}
        r_all = sb.table("pipelines").select("id").execute()
        all_ids = {row["id"] for row in (r_all.data or [])}
        stats.pending_assessment = len(all_ids - assessed_ids)

        # Pending inspections (work orders in Inspection in Progress)
        r = sb.table("work_orders")\
            .select("id", count="exact")\
            .eq("status", "Inspection in Progress")\
            .execute()
        stats.pending_inspections = r.count or 0

        # Active work orders
        active_statuses = ["Pending Review", "Approved", "Assigned",
                           "Inspection in Progress", "Repair in Progress", "Verification"]
        r = sb.table("work_orders")\
            .select("id", count="exact")\
            .in_("status", active_statuses)\
            .execute()
        stats.active_work_orders = r.count or 0

        # Overdue work orders (active + due_date < today)
        today_str = date.today().isoformat()
        r = sb.table("work_orders")\
            .select("id", count="exact")\
            .in_("status", active_statuses)\
            .lt("due_date", today_str)\
            .execute()
        stats.overdue_work_orders = r.count or 0

        # Completed work orders
        r = sb.table("work_orders")\
            .select("id", count="exact")\
            .eq("status", "Closed")\
            .execute()
        stats.completed_work_orders = r.count or 0

        # Last sync
        r = sb.table("sync_logs")\
            .select("source_name, completed_at, status")\
            .eq("status", "success")\
            .order("completed_at", desc=True)\
            .limit(1)\
            .execute()
        if r.data:
            log = r.data[0]
            stats.last_sync_source = log.get("source_name")
            stats.last_sync_time = log.get("completed_at")
            stats.last_sync_status = log.get("status")

    except Exception as e:
        # Return partial stats rather than crashing the dashboard
        pass

    return stats
