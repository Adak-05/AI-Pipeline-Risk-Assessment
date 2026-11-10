import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Search, AlertTriangle, Clock,
  CheckCircle2, ArrowRight, RefreshCw, AlertCircle, Calendar, ChevronDown
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow, VALID_WORK_ORDER_TRANSITIONS } from '../context/WorkflowContext';

const STATUS_COLORS = {
  'Pending Review':         'bg-slate-100 text-slate-700 border-slate-200',
  'Approved':               'bg-blue-100 text-blue-700 border-blue-200',
  'Assigned':               'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Inspection in Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  'Repair in Progress':     'bg-orange-100 text-orange-700 border-orange-200',
  'Verification':           'bg-purple-100 text-purple-700 border-purple-200',
  'Closed':                 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Rejected':               'bg-red-100 text-red-700 border-red-200',
  'On Hold':                'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const PRIORITY_COLORS = {
  'Critical': 'text-red-700 bg-red-50 border-red-200',
  'High':     'text-orange-700 bg-orange-50 border-orange-200',
  'Medium':   'text-amber-700 bg-amber-50 border-amber-200',
  'Low':      'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function isOverdue(wo) {
  if (!wo.dueDate || wo.status === 'Closed' || wo.status === 'Rejected') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(wo.dueDate) < today;
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${cls}`}>
      {status}
    </span>
  );
}

function CreateWorkOrderModal({ pipelines, onClose, onCreate }) {
  const [form, setForm] = useState({
    pipelineId: pipelines[0]?.Pipeline_ID || '',
    priority: 'Medium',
    recommendedAction: '',
    reason: '',
    assignedTo: 'Er. Suresh Patil (Field Inspector)',
    dueDate: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.pipelineId || !form.recommendedAction.trim()) {
      setError('Pipeline ID and Required Action are mandatory.');
      return;
    }
    onCreate(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Create Work Order</h3>
          <p className="text-xs text-slate-500 mt-0.5">Issue a new pipeline maintenance or inspection task.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Pipeline ID *</label>
            <select
              value={form.pipelineId}
              onChange={e => setForm(f => ({ ...f, pipelineId: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            >
              {pipelines.map(p => (
                <option key={p.Pipeline_ID} value={p.Pipeline_ID}>
                  {p.Pipeline_ID} — {p.Location} ({p.Calculated_Risk_Level || 'Assessed'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Priority *</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
              >
                {['Critical', 'High', 'Medium', 'Low'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Required Action *</label>
            <input
              type="text"
              value={form.recommendedAction}
              onChange={e => setForm(f => ({ ...f, recommendedAction: e.target.value }))}
              placeholder="e.g. Non-destructive acoustic leak test on joint welds"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={2}
              placeholder="Engineering rationale..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Assigned Engineer</label>
            <input
              type="text"
              value={form.assignedTo}
              onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
              placeholder="Engineer name or ward team..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition"
            >
              Create Work Order
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkOrderDetailModal({ wo, onClose, onStatusChange, onOpenInspectionForm }) {
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const allowed = VALID_WORK_ORDER_TRANSITIONS[wo.status] || [];

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setErrorMsg('');
    const res = await onStatusChange(wo.id, newStatus, statusReason);
    if (!res.success) {
      setErrorMsg(res.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">Work Order #{wo.id}</h3>
              <StatusBadge status={wo.status} />
              {isOverdue(wo) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> OVERDUE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Pipeline: <span className="font-bold text-blue-700">{wo.pipelineId}</span></p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Priority', value: <span className={`px-2 py-0.5 rounded border text-xs font-bold ${PRIORITY_COLORS[wo.priority]}`}>{wo.priority}</span> },
              { label: 'Assigned Engineer', value: wo.assignedTo || 'Unassigned' },
              { label: 'Due Date', value: wo.dueDate || 'No due date' },
              { label: 'Created Date', value: wo.createdAt ? new Date(wo.createdAt).toLocaleDateString('en-GB') : '—' },
              { label: 'Created By', value: wo.createdBy || 'Authorized Engineer' },
              { label: 'Completed On', value: wo.completedAt ? new Date(wo.completedAt).toLocaleDateString('en-GB') : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold">{label}</span>
                <div className="mt-0.5 font-bold text-slate-800 text-xs">{value}</div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
            <span className="font-bold text-slate-700 block mb-1 uppercase tracking-wider text-[10px]">Required Action</span>
            <p className="text-slate-800 font-semibold">{wo.recommendedAction}</p>
          </div>

          {wo.reason && (
            <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
              <span className="font-bold text-blue-900 block mb-1 uppercase tracking-wider text-[10px]">Reason</span>
              <p className="text-blue-950">{wo.reason}</p>
            </div>
          )}

          {wo.statusReason && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
              <span className="font-bold text-amber-800 block mb-1 uppercase tracking-wider text-[10px]">Status Note</span>
              <p className="text-amber-900">{wo.statusReason}</p>
            </div>
          )}

          {wo.status === 'Inspection in Progress' && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-indigo-950">Field inspection in progress</p>
                <p className="text-indigo-800 text-[11px] mt-0.5">Submit findings to advance workflow to repair or verification.</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenInspectionForm(wo.pipelineId, wo.id);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shrink-0 ml-3"
              >
                Enter Inspection →
              </button>
            </div>
          )}

          {allowed.length > 0 && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Update Status</h4>
              <p className="text-[11px] text-slate-500">
                Current: <strong>{wo.status}</strong>. Valid transitions: {allowed.join(' • ')}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full sm:flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                >
                  <option value="">Select next status...</option>
                  {allowed.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                >
                  Apply
                </button>
              </div>

              {['Rejected', 'On Hold'].includes(newStatus) && (
                <textarea
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder="Mandatory justification for hold/rejection..."
                  rows={2}
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none resize-none bg-amber-50/30"
                />
              )}

              {newStatus === 'Verification' && (
                <textarea
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder="Field notes / repair summary prior to verification..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
                />
              )}

              {newStatus === 'Closed' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                  <span className="font-bold block">Final Closure:</span>
                  <span className="text-[11px]">Certifies that verification is satisfied and permanently seals this work order.</span>
                </div>
              )}
            </div>
          )}

          {wo.status === 'Closed' && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">Work order closed and permanently logged.</span>
              </div>
              <button
                onClick={() => setNewStatus('Pending Review')}
                className="text-xs text-red-600 font-bold underline hover:text-red-800 ml-2"
              >
                Reopen
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              window.open(`/maintenance-history?pipelineId=${wo.pipelineId}`, '_self');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold"
          >
            View Maintenance History →
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkOrders() {
  const { pipelines } = usePipelines();
  const { workOrders, workflowStats, createWorkOrder, updateWorkOrderStatus, loadWorkflowData } = useWorkflow();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterEngineer, setFilterEngineer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Collect unique engineers for filter
  const engineers = useMemo(() => {
    const set = new Set(workOrders.map(wo => wo.assignedTo).filter(Boolean));
    return Array.from(set).sort();
  }, [workOrders]);

  const filtered = useMemo(() => {
    return workOrders.filter(wo => {
      const matchStatus = filterStatus === 'ALL' || wo.status === filterStatus;
      const matchPriority = filterPriority === 'ALL' || wo.priority === filterPriority;
      const matchEngineer = !filterEngineer || (wo.assignedTo || '').toLowerCase().includes(filterEngineer.toLowerCase());
      const matchSearch = !searchTerm ||
        wo.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.pipelineId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.recommendedAction?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchOverdue = !showOverdueOnly || isOverdue(wo);
      const createdDate = wo.createdAt ? new Date(wo.createdAt) : null;
      const matchFrom = !fromDate || (createdDate && createdDate >= new Date(fromDate));
      const matchTo = !toDate || (createdDate && createdDate <= new Date(toDate + 'T23:59:59'));
      return matchStatus && matchPriority && matchEngineer && matchSearch && matchOverdue && matchFrom && matchTo;
    });
  }, [workOrders, filterStatus, filterPriority, filterEngineer, searchTerm, showOverdueOnly, fromDate, toDate]);

  const handleCreate = async (form) => {
    await createWorkOrder(form);
  };

  const handleOpenInspection = (pipelineId, woId) => {
    navigate(`/inspections?pipelineId=${pipelineId}&workOrderId=${woId}`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Work Orders</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track and manage pipeline maintenance and inspection tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadWorkflowData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          {pipelines.length > 0 && (
            <button
              id="create-work-order-btn"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Work Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Active', value: workflowStats.openOrders, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Pending Review', value: workflowStats.pendingReviewOrders, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'In Inspection', value: workflowStats.pendingInspectionOrders, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Awaiting Verification', value: workflowStats.awaitingVerificationOrders, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
          { label: 'Overdue', value: workflowStats.overdueOrders, color: 'text-red-700', bg: 'bg-red-50 border-red-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-3 shadow-sm`}>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">{s.label}</span>
            <span className={`text-2xl font-black ${s.color} block mt-0.5`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              id="wo-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by Work Order ID, Pipeline ID, or action..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* Status */}
          <select
            id="wo-filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          >
            <option value="ALL">All Statuses</option>
            {Object.keys(VALID_WORK_ORDER_TRANSITIONS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Priority */}
          <select
            id="wo-filter-priority"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          >
            <option value="ALL">All Priorities</option>
            {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {/* Engineer */}
          <input
            id="wo-filter-engineer"
            value={filterEngineer}
            onChange={e => setFilterEngineer(e.target.value)}
            placeholder="Filter by engineer..."
            className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
          />
          {/* Overdue checkbox */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={e => setShowOverdueOnly(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span>Overdue only</span>
          </label>
        </div>
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs border-t border-slate-100 pt-2.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-600">Created Date:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">From</span>
            <input
              id="wo-from-date"
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">To</span>
            <input
              id="wo-to-date"
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {(fromDate || toDate || filterEngineer || searchTerm || filterStatus !== 'ALL' || filterPriority !== 'ALL' || showOverdueOnly) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); setFilterEngineer(''); setSearchTerm(''); setFilterStatus('ALL'); setFilterPriority('ALL'); setShowOverdueOnly(false); }}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {workOrders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No Orders</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {pipelines.length === 0
                ? 'Upload pipeline data first to evaluate infrastructure risk and dispatch work orders.'
                : 'No work orders in queue. Create one to dispatch an engineering team.'}
            </p>
            {pipelines.length > 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Work Order
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold text-slate-600">No work orders match the current filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Work Order ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pipeline ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-4 whitespace-nowrap">Required Action</th>
                  <th className="py-3 px-4 whitespace-nowrap">Assigned Engineer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Created Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Due Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(wo => {
                  const overdue = isOverdue(wo);
                  return (
                    <tr
                      key={wo.id}
                      className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${overdue ? 'bg-red-50/20' : ''}`}
                      onClick={() => setSelectedWO(wo)}
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-blue-900 font-bold whitespace-nowrap">
                        {wo.id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {wo.pipelineId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${PRIORITY_COLORS[wo.priority]}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-[11px] max-w-[200px] truncate font-medium">
                        {wo.recommendedAction}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{wo.assignedTo || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 ${overdue ? 'text-red-700 font-bold' : 'text-slate-500'}`}>
                          {overdue && <AlertTriangle className="w-3 h-3" />}
                          {wo.dueDate || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedWO(wo); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Showing {filtered.length} of {workOrders.length} work orders</span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateWorkOrderModal
          pipelines={pipelines}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
      {selectedWO && (
        <WorkOrderDetailModal
          wo={selectedWO}
          onClose={() => setSelectedWO(null)}
          onStatusChange={updateWorkOrderStatus}
          onOpenInspectionForm={handleOpenInspection}
        />
      )}
    </div>
  );
}
