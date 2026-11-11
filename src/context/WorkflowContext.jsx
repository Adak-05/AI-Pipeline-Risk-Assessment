import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { usePipelines } from './PipelineContext';
import {
  fetchWorkOrdersFromDb,
  createWorkOrderInDb,
  updateWorkOrderStatusInDb,
  fetchInspectionsFromDb,
  createInspectionInDb,
  fetchMaintenanceRecordsFromDb,
  logMaintenanceRecord
} from '../lib/workflowService';

const WorkflowContext = createContext(null);

export const VALID_WORK_ORDER_TRANSITIONS = {
  'Pending Review':         ['Approved', 'Rejected', 'On Hold'],
  'Approved':               ['Assigned', 'On Hold', 'Rejected'],
  'Assigned':               ['Inspection in Progress', 'On Hold'],
  'Inspection in Progress': ['Repair in Progress', 'Verification', 'On Hold'],
  'Repair in Progress':     ['Verification', 'On Hold'],
  'Verification':           ['Closed', 'Repair in Progress'],
  'Closed':                 ['Pending Review'], // Reopen with justification and audit trail
  'Rejected':               ['Pending Review'],
  'On Hold':                ['Pending Review', 'Approved', 'Assigned', 'Inspection in Progress', 'Repair in Progress'],
};

export function WorkflowProvider({ children }) {
  const { session, user, pipelines } = usePipelines();

  const [workOrders, setWorkOrders] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState(null);

  // ── Load workflow data on authentication ──────────────────────────────────────
  const loadWorkflowData = useCallback(async () => {
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      const [woRes, inspRes, maintRes] = await Promise.all([
        fetchWorkOrdersFromDb(),
        fetchInspectionsFromDb(),
        fetchMaintenanceRecordsFromDb()
      ]);

      if (woRes.data) setWorkOrders(woRes.data);
      if (inspRes.data) setInspections(inspRes.data);
      if (maintRes.data) setMaintenanceRecords(maintRes.data);

      if (woRes.error || inspRes.error || maintRes.error) {
        const errs = [woRes.error, inspRes.error, maintRes.error].filter(Boolean).join('; ');
        setWorkflowError(`Database warning: ${errs} (Active in session memory)`);
      }
    } catch (err) {
      setWorkflowError(err.message);
    } finally {
      setWorkflowLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session && !session.isDemo) {
      loadWorkflowData();
    }
  }, [session, loadWorkflowData]);

  // ── Work Orders Actions ───────────────────────────────────────────────────────
  const createWorkOrder = async (orderData) => {
    const pipeline = pipelines.find(p => p.Pipeline_ID === orderData.pipelineId);
    const newOrder = {
      id: orderData.id || `WO-${Date.now()}`,
      pipelineId: orderData.pipelineId,
      location: pipeline?.Location || '—',
      priority: orderData.priority || 'Medium',
      status: 'Pending',
      recommendedAction: orderData.recommendedAction,
      reason: orderData.reason || orderData.notes || '',
      assignedTo: orderData.assignedTo || '',
      dueDate: orderData.dueDate || '',
      notes: orderData.notes || '',
      statusReason: '',
      verificationResult: '',
      createdBy: user?.name || 'Authorized Municipal Engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    // Update in React State immediately
    setWorkOrders(prev => [newOrder, ...prev]);

    // Local audit record
    const auditRecord = {
      id: `LOG-${Date.now()}`,
      pipelineId: orderData.pipelineId,
      workOrderId: newOrder.id,
      eventType: 'WORK_ORDER_CREATED',
      title: `Work Order Created: ${newOrder.id}`,
      description: `Engineer ${user?.name || 'Authorized Engineer'} created a work order for Pipeline ${orderData.pipelineId}. Necessary Action: ${newOrder.recommendedAction}. Due Date: ${newOrder.dueDate || 'TBD'}. Priority: ${newOrder.priority}.`,
      performedBy: user?.name || 'Authorized Engineer',
      createdAt: new Date().toISOString()
    };
    setMaintenanceRecords(prev => [auditRecord, ...prev]);

    // Persist to Supabase if session active
    if (session && !session.isDemo) {
      const res = await createWorkOrderInDb(newOrder, user);
      if (!res.success) {
        setWorkflowError(`Could not save work order to database: ${res.error}`);
        return { success: false, error: res.error };
      }
    }

    return { success: true, workOrder: newOrder };
  };

  const updateWorkOrderStatus = async (workOrderId, newStatus, reasonOrNotes = '', extraFields = {}) => {
    const target = workOrders.find(w => w.id === workOrderId);
    if (!target) {
      return { success: false, error: 'Work order not found.' };
    }

    // Enforce controlled status transitions
    const allowed = VALID_WORK_ORDER_TRANSITIONS[target.status] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid transition from "${target.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'None'}`
      };
    }

    // Require reason for Rejected, On Hold, or Reopening
    if (['Rejected', 'On Hold'].includes(newStatus) && !reasonOrNotes.trim()) {
      return {
        success: false,
        error: `A mandatory reason or justification note is required to place an order in "${newStatus}".`
      };
    }
    if (target.status === 'Closed' && newStatus === 'Pending Review' && !reasonOrNotes.trim()) {
      return {
        success: false,
        error: 'A mandatory justification is required to reopen a closed work order.'
      };
    }

    const now = new Date().toISOString();
    const updated = {
      ...target,
      status: newStatus,
      statusReason: reasonOrNotes || target.statusReason,
      updatedAt: now,
      completedAt: newStatus === 'Closed' ? now : target.completedAt,
      ...extraFields
    };

    setWorkOrders(prev => prev.map(w => w.id === workOrderId ? updated : w));

    // Audit log
    let eventType = 'STATUS_CHANGE';
    if (newStatus === 'Closed') eventType = 'WORK_ORDER_CLOSED';
    else if (target.status === 'Closed') eventType = 'WORK_ORDER_REOPENED';
    else if (newStatus === 'Verification') eventType = 'VERIFICATION';
    else if (newStatus === 'Repair in Progress') eventType = 'REPAIR_PROGRESS';

    const auditEntry = {
      id: `LOG-${Date.now()}`,
      pipelineId: target.pipelineId,
      workOrderId,
      eventType,
      title: `Status Changed: ${target.status} → ${newStatus}`,
      description: reasonOrNotes ? `Reason/Note: ${reasonOrNotes}` : `Order transitioned to ${newStatus}`,
      performedBy: user?.name || 'Authorized Engineer',
      createdAt: now
    };
    setMaintenanceRecords(prev => [auditEntry, ...prev]);

    // Persist to Supabase
    if (session && !session.isDemo) {
      const res = await updateWorkOrderStatusInDb(workOrderId, newStatus, reasonOrNotes, user, extraFields);
      if (!res.success) {
        setWorkflowError(`Database update notice: ${res.error}`);
      }
    }

    return { success: true, workOrder: updated };
  };

  // ── Inspection Scheduling (sets up a future physical inspection) ─────────────
  const scheduleInspection = async ({ pipelineId, scheduledDate, engineerName }) => {
    if (!pipelineId || !scheduledDate) {
      return { success: false, error: 'Pipeline ID and scheduled date are required.' };
    }

    const newInsp = {
      id: `INSP-${Date.now()}`,
      pipelineId,
      workOrderId: null,
      inspectionDate: scheduledDate,
      conditionObserved: null,   // null = not yet inspected (Scheduled state)
      leakageObserved: false,
      corrosionObserved: false,
      notes: `Scheduled for physical inspection on ${scheduledDate}`,
      recommendedAction: '',
      inspectorName: engineerName || user?.name || 'Authorized Inspector',
      photoUrl: null,
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    };

    setInspections(prev => [newInsp, ...prev]);

    // Audit record for Maintenance History
    const audit = {
      id: `LOG-${Date.now()}`,
      pipelineId,
      workOrderId: null,
      eventType: 'INSPECTION_SCHEDULED',
      title: `Inspection Scheduled: ${newInsp.id}`,
      description: `Engineer ${engineerName || user?.name} scheduled an inspection for Pipeline ${pipelineId} on ${scheduledDate}.`,
      performedBy: engineerName || user?.name || 'Authorized Inspector',
      createdAt: new Date().toISOString()
    };
    setMaintenanceRecords(prev => [audit, ...prev]);

    // Persist to Supabase
    if (session && !session.isDemo) {
      const res = await createInspectionInDb(newInsp, { ...user, name: engineerName || user?.name });
      if (!res.success) {
        setWorkflowError(`Could not save scheduled inspection: ${res.error}`);
      }
    }

    return { success: true, inspection: newInsp };
  };

  // ── Field Inspection Submission (records actual physical inspection results) ──
  const submitInspection = async (inspectionData) => {
    if (!inspectionData.pipelineId || !inspectionData.inspectionDate || !inspectionData.conditionObserved) {
      return { success: false, error: 'Pipeline ID, inspection date, and observed condition are required.' };
    }

    const newInsp = {
      id: inspectionData.id || `INSP-${Date.now()}`,
      pipelineId: inspectionData.pipelineId,
      workOrderId: inspectionData.workOrderId || null,
      inspectionDate: inspectionData.inspectionDate,
      conditionObserved: inspectionData.conditionObserved,
      leakageObserved: !!inspectionData.leakageObserved,
      corrosionObserved: !!inspectionData.corrosionObserved,
      notes: inspectionData.notes || '',
      recommendedAction: inspectionData.recommendedAction || '',
      inspectorName: inspectionData.inspectorName || user?.name || 'Authorized Inspector',
      photoUrl: inspectionData.photoUrl || null,
      status: 'Completed',
      createdAt: new Date().toISOString()
    };

    setInspections(prev => [newInsp, ...prev]);

    // If linked to a work order, automatically advance status if currently in Inspection
    if (inspectionData.workOrderId) {
      const targetWO = workOrders.find(w => w.id === inspectionData.workOrderId);
      if (targetWO && targetWO.status === 'Inspection in Progress') {
        const nextState = inspectionData.leakageObserved || inspectionData.conditionObserved === 'Poor' || inspectionData.conditionObserved === 'Critical'
          ? 'Repair in Progress'
          : 'Verification';
        await updateWorkOrderStatus(inspectionData.workOrderId, nextState, `Inspection submitted: ${newInsp.id}`);
      }
    }

    // Local audit record — FIELD_INSPECTION_COMPLETED event for Maintenance History
    const audit = {
      id: `LOG-${Date.now()}`,
      pipelineId: newInsp.pipelineId,
      workOrderId: newInsp.workOrderId,
      eventType: 'FIELD_INSPECTION_COMPLETED',
      title: `Field Inspection Completed: ${newInsp.id}`,
      description: `Engineer ${newInsp.inspectorName} completed the physical inspection of Pipeline ${newInsp.pipelineId}. Recorded Condition: ${newInsp.conditionObserved}. Remarks: ${newInsp.notes || 'None'}`,
      performedBy: newInsp.inspectorName || user?.name || 'Inspector',
      createdAt: new Date().toISOString()
    };
    setMaintenanceRecords(prev => [audit, ...prev]);

    if (session && !session.isDemo) {
      const res = await createInspectionInDb(newInsp, user);
      if (!res.success) {
        setWorkflowError(`Database warning: ${res.error}`);
      }
    }

    return { success: true, inspection: newInsp };
  };

  // ── Risk Review Decision ──────────────────────────────────────────────────────
  const recordRiskReview = async (pipelineId, decision, comments = '', requestedAction = '') => {
    const now = new Date().toISOString();
    const audit = {
      id: `LOG-${Date.now()}`,
      pipelineId,
      workOrderId: null,
      eventType: 'RISK_REVIEW',
      title: `Engineer Risk Review: ${decision.toUpperCase()}`,
      description: `Decision: ${decision}. Comments: ${comments || 'None'}. Next: ${requestedAction || 'Routine'}`,
      performedBy: user?.name || 'Executive Engineer',
      createdAt: now
    };
    setMaintenanceRecords(prev => [audit, ...prev]);

    if (session && !session.isDemo) {
      await logMaintenanceRecord({
        pipelineId,
        eventType: 'RISK_REVIEW',
        title: `Engineer Risk Review: ${decision.toUpperCase()}`,
        description: `Decision: ${decision}. ${comments}`,
        performedBy: user?.name,
        metadata: { decision, comments, requestedAction }
      });
    }

    return { success: true };
  };

  // ── Computed Workflow Stats ───────────────────────────────────────────────────
  const workflowStats = useMemo(() => {
    const openOrders = workOrders.filter(w => !['Closed', 'Rejected'].includes(w.status)).length;
    const pendingReviewOrders = workOrders.filter(w => w.status === 'Pending Review').length;
    const pendingInspectionOrders = workOrders.filter(w => w.status === 'Inspection in Progress').length;
    const awaitingVerificationOrders = workOrders.filter(w => w.status === 'Verification').length;
    const completedOrders = workOrders.filter(w => w.status === 'Closed').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueOrders = workOrders.filter(w => {
      if (!w.dueDate || w.status === 'Closed' || w.status === 'Rejected') return false;
      return new Date(w.dueDate) < today;
    }).length;

    // Pipelines with high risk awaiting formal work order
    const workOrderPipelineIds = new Set(workOrders.map(w => w.pipelineId));
    const highRiskPendingReview = pipelines.filter(p =>
      (p.Calculated_Risk_Level === 'HIGH' || p.Risk_Level === 'HIGH') &&
      !workOrderPipelineIds.has(p.Pipeline_ID)
    ).length;

    return {
      openOrders,
      pendingReviewOrders,
      pendingInspectionOrders,
      awaitingVerificationOrders,
      completedOrders,
      overdueOrders,
      highRiskPendingReview,
      totalWorkOrders: workOrders.length,
      totalInspections: inspections.length,
      totalMaintenanceEvents: maintenanceRecords.length
    };
  }, [workOrders, inspections, maintenanceRecords, pipelines]);

  return (
    <WorkflowContext.Provider
      value={{
        workOrders,
        inspections,
        maintenanceRecords,
        workflowLoading,
        workflowError,
        workflowStats,
        createWorkOrder,
        updateWorkOrderStatus,
        scheduleInspection,
        submitInspection,
        recordRiskReview,
        loadWorkflowData
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return ctx;
}
