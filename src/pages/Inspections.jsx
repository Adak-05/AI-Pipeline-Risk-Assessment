import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  SearchCheck, CheckCircle2, RefreshCw, AlertCircle, Search, Calendar, Plus
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';

const CONDITION_BADGES = {
  'Good':     'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Fair':     'bg-blue-100 text-blue-800 border-blue-200',
  'High':     'bg-red-100 text-red-800 border-red-200',
  'Poor':     'bg-amber-100 text-amber-800 border-amber-200',
  'Critical': 'bg-red-100 text-red-800 border-red-200',
  'Failed':   'bg-red-200 text-red-900 border-red-300 font-black',
};

function InspectionDetailModal({ inspection, onClose, onNavigateHistory }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Inspection #{inspection.id}</h3>
            <p className="text-xs text-slate-500">Pipeline: <span className="font-bold text-blue-700">{inspection.pipelineId}</span></p>
          </div>
          <span className={`px-2.5 py-0.5 rounded border text-xs font-bold ${CONDITION_BADGES[inspection.conditionObserved] || 'bg-slate-100 text-slate-700'}`}>
            {inspection.conditionObserved}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block uppercase text-[10px] font-semibold">Inspection Date</span>
            <span className="font-bold text-slate-800">{inspection.inspectionDate}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block uppercase text-[10px] font-semibold">Engineer</span>
            <span className="font-bold text-slate-800">{inspection.inspectorName}</span>
          </div>
        </div>

        {inspection.workOrderId && (
          <div className="p-2.5 bg-blue-50 rounded-lg text-xs">
            <span className="text-blue-700 font-semibold">Work Order: </span>
            <span className="font-mono font-bold text-blue-900">{inspection.workOrderId}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2">
          <div>
            <span className="font-bold text-slate-700 block uppercase text-[10px] mb-1">Anomalies Observed</span>
            <div className="flex gap-3">
              {inspection.leakageObserved && <span className="text-red-700 font-bold">• Active Leakage</span>}
              {inspection.corrosionObserved && <span className="text-amber-700 font-bold">• Severe Corrosion</span>}
              {!inspection.leakageObserved && !inspection.corrosionObserved && <span className="text-slate-400">None detected</span>}
            </div>
          </div>
          {inspection.recommendedAction && (
            <div>
              <span className="font-bold text-slate-700 block uppercase text-[10px] mb-1">Recommended Action</span>
              <p className="text-slate-700">{inspection.recommendedAction}</p>
            </div>
          )}
        </div>

        {inspection.notes && (
          <div className="p-3 bg-slate-50 rounded-lg text-xs">
            <span className="font-bold text-slate-700 block uppercase text-[10px] mb-1">Field Notes</span>
            <p className="text-slate-700 leading-relaxed">{inspection.notes}</p>
          </div>
        )}

        <div className="pt-2 flex justify-between items-center border-t border-slate-100">
          <button
            onClick={() => onNavigateHistory(inspection.pipelineId)}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold"
          >
            View Pipeline History →
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inspections() {
  const { pipelines, user } = usePipelines();
  const { inspections, workOrders, submitInspection, loadWorkflowData, workflowLoading } = useWorkflow();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const defaultPipeline = searchParams.get('pipelineId') || pipelines[0]?.Pipeline_ID || '';
  const defaultWorkOrder = searchParams.get('workOrderId') || '';

  const [showForm, setShowForm] = useState(!!defaultWorkOrder || !inspections.length);
  const [form, setForm] = useState({
    pipelineId: defaultPipeline,
    workOrderId: defaultWorkOrder,
    inspectionDate: new Date().toISOString().split('T')[0],
    conditionObserved: 'Fair',
    leakageObserved: false,
    corrosionObserved: false,
    notes: '',
    recommendedAction: 'Routine preventive surveillance',
    photoUrl: ''
  });

  const [statusNotice, setStatusNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);

  // List filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState('ALL');
  const [filterEngineer, setFilterEngineer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredInspections = useMemo(() => {
    return inspections.filter(insp => {
      const matchSearch = !searchTerm ||
        insp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insp.pipelineId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insp.inspectorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insp.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCond = filterCondition === 'ALL' || insp.conditionObserved === filterCondition;
      const matchEng = !filterEngineer || (insp.inspectorName || '').toLowerCase().includes(filterEngineer.toLowerCase());
      const d = insp.inspectionDate ? new Date(insp.inspectionDate) : null;
      const matchFrom = !fromDate || (d && d >= new Date(fromDate));
      const matchTo = !toDate || (d && d <= new Date(toDate));
      return matchSearch && matchCond && matchEng && matchFrom && matchTo;
    });
  }, [inspections, searchTerm, filterCondition, filterEngineer, fromDate, toDate]);

  const hasFilters = searchTerm || filterCondition !== 'ALL' || filterEngineer || fromDate || toDate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pipelineId) {
      setStatusNotice({ type: 'error', message: 'Target pipeline selection is mandatory.' });
      return;
    }
    setIsSubmitting(true);
    setStatusNotice(null);
    const res = await submitInspection(form);
    setIsSubmitting(false);
    if (res.success) {
      setStatusNotice({
        type: 'success',
        message: `Inspection record "${res.inspection.id}" saved to the municipal registry.`
      });
      setForm(prev => ({ ...prev, notes: '', recommendedAction: 'Routine monitoring' }));
      setShowForm(false);
    } else {
      setStatusNotice({ type: 'error', message: res.error || 'Failed to save inspection record.' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Field Inspections</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record and review engineer pipeline inspection observations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadWorkflowData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${workflowLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            id="create-inspection-btn"
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showForm ? 'Hide Form' : 'Record Inspection'}</span>
          </button>
        </div>
      </div>

      {/* Status notice shown outside form when form is hidden */}
      {statusNotice && !showForm && (
        <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
          statusNotice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {statusNotice.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* Inspection Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Record Field Inspection</h3>
              <p className="text-xs text-slate-500">Inspector: <span className="font-semibold text-blue-700">{user.name}</span></p>
            </div>
            <SearchCheck className="w-5 h-5 text-blue-600" />
          </div>

          {statusNotice && (
            <div className={`mb-4 p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              statusNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {statusNotice.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{statusNotice.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pipeline Asset *</label>
              {pipelines.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  No pipelines available. Upload data first.
                </div>
              ) : (
                <select
                  value={form.pipelineId}
                  onChange={e => setForm(f => ({ ...f, pipelineId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  required
                >
                  <option value="">Select Pipeline...</option>
                  {pipelines.map(p => (
                    <option key={p.Pipeline_ID} value={p.Pipeline_ID}>
                      {p.Pipeline_ID} — {p.Location}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Inspection Date *</label>
              <input
                type="date"
                value={form.inspectionDate}
                onChange={e => setForm(f => ({ ...f, inspectionDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Condition Observed *</label>
              <select
                value={form.conditionObserved}
                onChange={e => setForm(f => ({ ...f, conditionObserved: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-semibold"
              >
                <option value="Good">Good (Pristine / Intact)</option>
                <option value="Fair">Fair (Minor Wear)</option>
                <option value="Poor">Poor (Degraded / Pitting)</option>
                <option value="Critical">Critical (Structural Hazard)</option>
                <option value="Failed">Failed (Active Rupture)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Associated Work Order</label>
              <select
                value={form.workOrderId}
                onChange={e => setForm(f => ({ ...f, workOrderId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
              >
                <option value="">Independent Routine Inspection</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>
                    {wo.id} — Pipeline: {wo.pipelineId} ({wo.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Anomalies Observed</label>
              <div className="flex gap-6 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.leakageObserved}
                    onChange={e => setForm(f => ({ ...f, leakageObserved: e.target.checked }))}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <span className="font-semibold text-red-900">Active Leakage / Seepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.corrosionObserved}
                    onChange={e => setForm(f => ({ ...f, corrosionObserved: e.target.checked }))}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span className="font-semibold text-amber-900">Severe Corrosion / Rust</span>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-bold text-slate-700 mb-1">Recommended Action</label>
              <input
                type="text"
                value={form.recommendedAction}
                onChange={e => setForm(f => ({ ...f, recommendedAction: e.target.value }))}
                placeholder="e.g. Schedule ultrasonic pipe wall thickness test before monsoon"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-bold text-slate-700 mb-1">Field Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Observed soil conditions, coating degradation, acoustic findings..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting || pipelines.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition text-xs"
              >
                {isSubmitting ? 'Saving...' : 'Submit Inspection Record'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters for list */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              id="insp-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search inspections..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            id="insp-filter-condition"
            value={filterCondition}
            onChange={e => setFilterCondition(e.target.value)}
            className="border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          >
            <option value="ALL">All Conditions</option>
            {['Good', 'Fair', 'Poor', 'Critical', 'Failed'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            id="insp-filter-engineer"
            value={filterEngineer}
            onChange={e => setFilterEngineer(e.target.value)}
            placeholder="Filter by engineer..."
            className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs border-t border-slate-100 pt-2.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-600">Inspection Date:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">From</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">To</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          {hasFilters && (
            <button onClick={() => { setSearchTerm(''); setFilterCondition('ALL'); setFilterEngineer(''); setFromDate(''); setToDate(''); }} className="text-xs text-blue-600 font-semibold hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {inspections.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-4">
              <SearchCheck className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No Inspections</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              No inspection records have been submitted yet. Use the form above to record the first inspection.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Record First Inspection
            </button>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold text-slate-600">No inspections match the current filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Inspection ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pipeline ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Inspection Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Engineer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Recorded Condition</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInspections.map(insp => (
                  <tr
                    key={insp.id}
                    className="hover:bg-slate-50/60 cursor-pointer transition"
                    onClick={() => setSelectedInspection(insp)}
                  >
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-blue-900 whitespace-nowrap">{insp.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">{insp.pipelineId}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{insp.inspectionDate}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{insp.inspectorName}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${CONDITION_BADGES[insp.conditionObserved] || 'bg-slate-100 text-slate-700'}`}>
                          {insp.conditionObserved}
                        </span>
                        {insp.leakageObserved && <span className="text-red-600 font-bold text-[10px]">Leak</span>}
                        {insp.corrosionObserved && <span className="text-amber-600 font-bold text-[10px]">Corrosion</span>}
                      </div>
                      {insp.notes && <p className="text-[10px] text-slate-400 truncate mt-0.5">{insp.notes}</p>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded border text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                        Recorded
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedInspection(insp); }}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded hover:bg-blue-100 text-[11px]"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
              Showing {filteredInspections.length} of {inspections.length} inspections
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInspection && (
        <InspectionDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
          onNavigateHistory={(pid) => { setSelectedInspection(null); navigate(`/maintenance-history?pipelineId=${pid}`); }}
        />
      )}
    </div>
  );
}
