import { supabase } from './supabase';

/**
 * Service module for Phase 2: Municipal Authority Workflow.
 * Manages Work Orders, Inspections, and immutable Maintenance History / Audit Records.
 */

// ── Work Orders Service ────────────────────────────────────────────────────────

export async function fetchWorkOrdersFromDb() {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const formatted = (data || []).map(row => ({
      id: row.id,
      pipelineId: row.pipeline_id,
      priority: row.priority,
      status: row.status || 'Pending',
      recommendedAction: row.recommended_action,
      reason: row.reason || '',
      assignedTo: row.assigned_to || '',
      dueDate: row.due_date || '',
      notes: row.notes || '',
      statusReason: row.status_reason || '',
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    }));

    return { data: formatted, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function createWorkOrderInDb(workOrderData, user) {
  try {
    const row = {
      id: workOrderData.id,
      pipeline_id: workOrderData.pipelineId,
      priority: workOrderData.priority,
      status: workOrderData.status || 'Pending',
      recommended_action: workOrderData.recommendedAction,
      reason: workOrderData.reason || workOrderData.notes || '',
      assigned_to: workOrderData.assignedTo || null,
      due_date: workOrderData.dueDate || null,
      notes: workOrderData.notes || null,
      created_by: user?.name || 'Authorized Municipal Engineer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('work_orders')
      .insert([row])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    // Append to maintenance audit history (non-blocking – do not fail WO creation if audit fails)
    logMaintenanceRecord({
      pipelineId: workOrderData.pipelineId,
      workOrderId: workOrderData.id,
      eventType: 'WORK_ORDER_CREATED',
      title: `Work Order Created: ${workOrderData.id}`,
      description: `Action: ${workOrderData.recommendedAction} (Priority: ${workOrderData.priority})`,
      performedBy: user?.name || 'Authorized Engineer',
      userId: user?.id,
      metadata: { priority: workOrderData.priority, assignedTo: workOrderData.assignedTo }
    }).catch(() => {});

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateWorkOrderStatusInDb(workOrderId, newStatus, reasonOrNotes, user, extraFields = {}) {
  try {
    const now = new Date().toISOString();
    const updatePayload = {
      status: newStatus,
      updated_at: now,
      ...extraFields
    };

    if (reasonOrNotes) {
      updatePayload.status_reason = reasonOrNotes;
    }

    const { data, error } = await supabase
      .from('work_orders')
      .update(updatePayload)
      .eq('id', workOrderId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    const updatedRow = data && data[0];
    const pipelineId = updatedRow?.pipeline_id;

    // Log status change audit record (non-blocking)
    logMaintenanceRecord({
      pipelineId: pipelineId || 'UNKNOWN',
      workOrderId,
      eventType: 'STATUS_CHANGE',
      title: `Work Order Status: ${newStatus}`,
      description: reasonOrNotes ? `Note: ${reasonOrNotes}` : `Status changed to ${newStatus}`,
      performedBy: user?.name || 'Authorized Engineer',
      userId: user?.id,
      metadata: { newStatus, reason: reasonOrNotes }
    }).catch(() => {});

    return { success: true, data: updatedRow };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Inspections Service ───────────────────────────────────────────────────────

export async function fetchInspectionsFromDb(pipelineId = null) {
  try {
    let query = supabase.from('inspections').select('*').order('created_at', { ascending: false });
    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }
    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    const formatted = (data || []).map(row => ({
      id: row.id,
      pipelineId: row.pipeline_id,
      workOrderId: row.work_order_id,
      inspectionDate: row.inspection_date,
      conditionObserved: row.condition_observed,
      leakageObserved: row.leakage_observed,
      corrosionObserved: row.corrosion_observed,
      notes: row.notes,
      recommendedAction: row.recommended_action,
      inspectorName: row.inspector_name,
      photoUrl: row.photo_url,
      createdAt: row.created_at
    }));

    return { data: formatted, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function createInspectionInDb(inspectionData, user) {
  try {
    const row = {
      id: inspectionData.id || `INSP-${Date.now()}`,
      pipeline_id: inspectionData.pipelineId,
      work_order_id: inspectionData.workOrderId || null,
      inspection_date: inspectionData.inspectionDate,
      condition_observed: inspectionData.conditionObserved,
      leakage_observed: !!inspectionData.leakageObserved,
      corrosion_observed: !!inspectionData.corrosionObserved,
      notes: inspectionData.notes || '',
      recommended_action: inspectionData.recommendedAction || '',
      inspector_name: user?.name || 'Authorized Inspector',
      inspector_id: user?.id || null,
      photo_url: inspectionData.photoUrl || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('inspections').insert([row]).select();
    if (error) return { success: false, error: error.message };

    // Record in immutable maintenance audit trail
    await logMaintenanceRecord({
      pipelineId: inspectionData.pipelineId,
      workOrderId: inspectionData.workOrderId || null,
      eventType: 'INSPECTION_SUBMITTED',
      title: `Field Inspection Logged: ${row.id}`,
      description: `Condition: ${inspectionData.conditionObserved}. Leaks: ${inspectionData.leakageObserved ? 'Yes' : 'No'}. Corrosion: ${inspectionData.corrosionObserved ? 'Yes' : 'No'}. Notes: ${inspectionData.notes || 'None'}`,
      performedBy: user?.name || 'Inspector',
      userId: user?.id,
      metadata: {
        condition: inspectionData.conditionObserved,
        leakage: inspectionData.leakageObserved,
        corrosion: inspectionData.corrosionObserved
      }
    });

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Maintenance Records & Audit Trail Service ──────────────────────────────────

export async function fetchMaintenanceRecordsFromDb(pipelineId = null) {
  try {
    let query = supabase.from('maintenance_records').select('*').order('created_at', { ascending: false });
    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }
    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    const formatted = (data || []).map(row => ({
      id: row.id,
      pipelineId: row.pipeline_id,
      workOrderId: row.work_order_id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      performedBy: row.performed_by,
      metadata: row.metadata,
      createdAt: row.created_at
    }));

    return { data: formatted, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

export async function logMaintenanceRecord({
  pipelineId,
  workOrderId = null,
  eventType,
  title,
  description = '',
  performedBy,
  userId = null,
  metadata = {}
}) {
  try {
    const row = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pipeline_id: pipelineId,
      work_order_id: workOrderId,
      event_type: eventType,
      title,
      description,
      performed_by: performedBy || 'Authorized Engineer',
      performed_by_id: userId || null,
      metadata,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('maintenance_records').insert([row]);
    if (error) {
      console.warn('Could not persist maintenance audit record:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.warn('Exception logging maintenance audit record:', err.message);
    return { success: false, error: err.message };
  }
}
