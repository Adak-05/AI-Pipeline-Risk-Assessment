import React, { useState, useMemo } from 'react';
import {
  SearchCheck, CheckCircle2, Clock, AlertCircle,
  Loader2, X, ChevronDown, Info
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';

const today = new Date().toISOString().split('T')[0];

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor', 'Critical'];

const CONDITION_BADGE = {
  Good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Fair: 'bg-blue-100 text-blue-800 border-blue-200',
  Poor: 'bg-amber-100 text-amber-800 border-amber-200',
  Critical: 'bg-red-100 text-red-800 border-red-200',
  High: 'bg-red-100 text-red-800 border-red-200'
};

function RecordInspectionForm({ scheduledInspection, user, onSubmit, onCancel }) {
  const [condition, setCondition] = useState('');
  const [date, setDate] = useState(today);
  const [engineer, setEngineer] = useState(user?.name || '');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!condition) { setError('Please select a recorded condition.'); return; }
    if (!date) { setError('Please select the inspection date.'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await onSubmit({
        pipelineId: scheduledInspection.pipelineId,
        inspectionDate: date,
        conditionObserved: condition,
        notes: remarks,
        inspectorName: engineer
      });
      if (result.success) {
        setSuccess(`Inspection for Pipeline ${scheduledInspection.pipelineId} recorded successfully.`);
        setTimeout(() => onCancel(), 2000);
      } else {
        setError(result.error || 'Failed to record inspection.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Record Field Inspection</h4>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>

      {success ? (
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" /><span>{success}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Pipeline ID</label>
              <input type="text" value={scheduledInspection.pipelineId} readOnly
                className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Engineer Name</label>
              <input type="text" value={engineer} onChange={e => setEngineer(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Inspection Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Recorded Condition *</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} required
                className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500">
                <option value="">Select condition...</option>
                {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Observations, findings, notes..."
                className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-700 outline-none focus:border-blue-500 resize-none" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg transition">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Submit Inspection'}</span>
            </button>
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Inspections() {
  const { user } = usePipelines();
  const { inspections, submitInspection } = useWorkflow();
  const [openFormId, setOpenFormId] = useState(null);
  const [search, setSearch] = useState('');

  // Split inspections into scheduled vs completed
  const { scheduled, completed } = useMemo(() => {
    const completedConditions = ['Good', 'Fair', 'Poor', 'Critical', 'High'];
    const sch = [], comp = [];
    inspections.forEach(insp => {
      if (completedConditions.includes(insp.conditionObserved)) {
        comp.push(insp);
      } else {
        sch.push(insp);
      }
    });
    return { scheduled: sch, completed: comp };
  }, [inspections]);

  const filteredCompleted = useMemo(() => {
    if (!search) return completed;
    const q = search.toLowerCase();
    return completed.filter(i =>
      String(i.pipelineId).toLowerCase().includes(q) ||
      String(i.inspectorName || '').toLowerCase().includes(q)
    );
  }, [completed, search]);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Field Inspection</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Record the results of physical pipeline inspections
        </p>
      </div>

      {/* Section A: Scheduled Inspections */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <Clock className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Scheduled Inspections</h3>
            <p className="text-xs text-slate-500">Upcoming physical inspections awaiting field visit</p>
          </div>
          {scheduled.length > 0 && (
            <span className="ml-auto px-2.5 py-0.5 bg-teal-50 text-teal-700 text-xs font-bold rounded-full border border-teal-200">
              {scheduled.length} pending
            </span>
          )}
        </div>

        {scheduled.length === 0 ? (
          <div className="py-10 text-center">
            <Info className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">No inspections scheduled</p>
            <p className="text-xs text-slate-400 mt-1">Schedule inspections from the Maintenance Recommendation page.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {scheduled.map(insp => (
              <div key={insp.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono font-bold text-sm text-blue-900">{insp.pipelineId}</span>
                    <span className="text-xs text-slate-500">Date: <span className="font-semibold text-slate-700">{formatDate(insp.inspectionDate)}</span></span>
                    <span className="text-xs text-slate-500">Engineer: <span className="font-semibold text-slate-700">{insp.inspectorName || '—'}</span></span>
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200 rounded">Scheduled</span>
                  </div>
                  <button
                    onClick={() => setOpenFormId(openFormId === insp.id ? null : insp.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shrink-0"
                  >
                    <SearchCheck className="w-3.5 h-3.5" />
                    <span>Record Inspection</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${openFormId === insp.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {openFormId === insp.id && (
                  <RecordInspectionForm
                    scheduledInspection={insp}
                    user={user}
                    onSubmit={submitInspection}
                    onCancel={() => setOpenFormId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Completed Inspections */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Completed Inspections</h3>
              <p className="text-xs text-slate-500">Physical inspection records with recorded findings</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pipeline ID..."
              className="text-xs pl-3 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 w-44"
            />
          </div>
        </div>

        {filteredCompleted.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">No completed inspections yet</p>
            <p className="text-xs text-slate-400 mt-1">Record a field inspection above to see it listed here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 whitespace-nowrap">Inspection ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pipeline ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Inspection Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Engineer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Recorded Condition</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompleted.map(insp => (
                  <tr key={insp.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-blue-900 whitespace-nowrap">{insp.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">{insp.pipelineId}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(insp.inspectionDate)}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{insp.inspectorName || '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${CONDITION_BADGE[insp.conditionObserved] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {insp.conditionObserved}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[200px]">
                      <p className="text-[11px] truncate">{insp.notes || '—'}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
              Showing {filteredCompleted.length} completed inspection{filteredCompleted.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
