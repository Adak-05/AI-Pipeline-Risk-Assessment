import React, { useState, useRef, useEffect } from 'react';
import {
  ClipboardList, Plus, X, AlertCircle, CheckCircle2, Loader2, ChevronDown
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';
import { supabase } from '../lib/supabase';

// ── Status config: only three statuses ────────────────────────────────────────
const STATUSES = ['Pending', 'Approved', 'Rejected'];

const STATUS_STYLE = {
  Pending:  'bg-amber-50 text-amber-700 border-amber-300',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  Rejected: 'bg-red-50 text-red-700 border-red-300',
};

const PRIORITY_BADGE = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low:    'bg-emerald-100 text-emerald-700 border-emerald-200',
};

// ── Inline status dropdown cell ───────────────────────────────────────────────
function StatusCell({ workOrderId, currentStatus, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState(currentStatus);
  const ref = useRef(null);

  // Sync if parent changes (e.g. after page-reload re-fetch)
  useEffect(() => { setLocalStatus(currentStatus); }, [currentStatus]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = async (newStatus) => {
    if (newStatus === localStatus) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', workOrderId);
      if (!error) {
        setLocalStatus(newStatus);          // immediate local update
        onStatusChange(workOrderId, newStatus); // notify parent
      }
    } catch { /* non-blocking */ }
    setSaving(false);
  };

  const style = STATUS_STYLE[localStatus] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        title="Click to change status"
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer hover:opacity-80 transition select-none ${style}`}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        <span>{localStatus || 'Pending'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50 flex items-center gap-2 ${
                s === localStatus ? 'opacity-50 cursor-default' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                s === 'Pending' ? 'bg-amber-500' :
                s === 'Approved' ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create Work Order form ─────────────────────────────────────────────────────
function CreateWorkOrderForm({ pipelines, user, onCreate, onCancel }) {
  const [pipelineId, setPipelineId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [action, setAction] = useState('');
  const [engineer, setEngineer] = useState(user?.name || '');
  const [priority, setPriority] = useState('Medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pipelineId) { setError('Please select a Pipeline ID.'); return; }
    if (!action.trim()) { setError('Please enter the necessary action.'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await onCreate({
        pipelineId,
        dueDate,
        recommendedAction: action.trim(),
        assignedTo: engineer,
        priority
      });
      if (result.success) {
        onCancel();
      } else {
        setError(result.error || 'Failed to create work order.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-blue-900">Create Work Order</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition"><X className="w-4 h-4" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5">Pipeline ID *</label>
            <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} required
              className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500">
              <option value="">Select pipeline...</option>
              {pipelines.map(p => (
                <option key={p.Pipeline_ID} value={p.Pipeline_ID}>{p.Pipeline_ID} — {p.Location}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5">Necessary Action *</label>
            <input type="text" value={action} onChange={e => setAction(e.target.value)} required
              placeholder="e.g. Pipe replacement, Joint repair, Pressure test..."
              className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5">Assigned Engineer</label>
            <input type="text" value={engineer} onChange={e => setEngineer(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg transition">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
            <span>{saving ? 'Creating...' : 'Create Work Order'}</span>
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkOrders() {
  const { pipelines, user } = usePipelines();
  const { workOrders, createWorkOrder } = useWorkflow();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  // Local status overrides: { [workOrderId]: status }
  const [statusOverrides, setStatusOverrides] = useState({});

  const handleStatusChange = (workOrderId, newStatus) => {
    setStatusOverrides(prev => ({ ...prev, [workOrderId]: newStatus }));
  };

  const getStatus = (wo) => statusOverrides[wo.id] ?? wo.status ?? 'Pending';

  const filtered = workOrders.filter(wo => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return String(wo.pipelineId || '').toLowerCase().includes(q) ||
      String(wo.id || '').toLowerCase().includes(q) ||
      String(wo.assignedTo || '').toLowerCase().includes(q);
  });

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Work Orders</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage maintenance work orders for pipeline assets</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <CreateWorkOrderForm
          pipelines={pipelines}
          user={user}
          onCreate={createWorkOrder}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {workOrders.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search work orders..."
              className="text-xs pl-3 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 w-56"
            />
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No Work Orders</p>
            <p className="text-xs text-slate-400 mt-1 mb-5">Create a work order to assign maintenance tasks to pipeline assets.</p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Work Order</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 whitespace-nowrap">Work Order ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pipeline ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Due Date</th>
                  <th className="py-3 px-4">Necessary Action</th>
                  <th className="py-3 px-4 whitespace-nowrap">Assigned Engineer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(wo => (
                  <tr key={wo.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-blue-900 whitespace-nowrap">{wo.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">{wo.pipelineId}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(wo.dueDate)}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-[220px]">
                      <p className="truncate">{wo.recommendedAction}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{wo.assignedTo || '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${PRIORITY_BADGE[wo.priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusCell
                        workOrderId={wo.id}
                        currentStatus={getStatus(wo)}
                        onStatusChange={handleStatusChange}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
              Showing {filtered.length} of {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
