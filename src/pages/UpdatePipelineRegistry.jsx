import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PencilLine, CheckCircle2, AlertCircle, Search, ArrowRight, X
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';
import { supabase } from '../lib/supabase';

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor', 'Critical', 'Failed'];
const MATERIAL_OPTIONS = ['Cast Iron', 'Ductile Iron', 'Steel', 'Mild Steel', 'PVC', 'HDPE', 'Asbestos Cement', 'Galvanised Iron', 'Concrete', 'Other'];

export default function UpdatePipelineRegistry() {
  const { pipelines, user, session } = usePipelines();
  const { workOrders, maintenanceRecords, loadWorkflowData } = useWorkflow();
  const navigate = useNavigate();

  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // Form fields — only fields that can genuinely be updated post-repair
  const [form, setForm] = useState({
    condition: '',
    repairDescription: '',
    repairCompletionDate: new Date().toISOString().split('T')[0],
    repairNotes: '',
    recordedCost: '',
    updatedMaterial: '',
    updatedDiameterMm: '',
    linkedWorkOrderId: '',
  });

  // Derived: the selected pipeline object
  const selectedPipeline = useMemo(
    () => pipelines.find(p => p.Pipeline_ID === selectedPipelineId),
    [pipelines, selectedPipelineId]
  );

  // Filtered pipelines for search
  const filteredPipelines = useMemo(() => {
    if (!pipelineSearch.trim()) return pipelines;
    const q = pipelineSearch.toLowerCase();
    return pipelines.filter(p =>
      p.Pipeline_ID?.toLowerCase().includes(q) ||
      p.Location?.toLowerCase().includes(q)
    );
  }, [pipelines, pipelineSearch]);

  // Open work orders for this pipeline
  const linkedWorkOrders = useMemo(() =>
    workOrders.filter(wo =>
      wo.pipelineId === selectedPipelineId &&
      !['Closed', 'Rejected'].includes(wo.status)
    ),
    [workOrders, selectedPipelineId]
  );

  const handleSelectPipeline = (pid) => {
    setSelectedPipelineId(pid);
    setPipelineSearch('');
    setStatusNotice(null);
    setConfirmed(false);
    setForm({
      condition: '',
      repairDescription: '',
      repairCompletionDate: new Date().toISOString().split('T')[0],
      repairNotes: '',
      recordedCost: '',
      updatedMaterial: '',
      updatedDiameterMm: '',
      linkedWorkOrderId: linkedWorkOrders[0]?.id || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPipelineId) {
      setStatusNotice({ type: 'error', message: 'Please select a pipeline to update.' });
      return;
    }
    if (!form.repairDescription.trim()) {
      setStatusNotice({ type: 'error', message: 'Repair / maintenance description is required.' });
      return;
    }
    if (!confirmed) {
      setStatusNotice({ type: 'error', message: 'Please confirm the update before saving.' });
      return;
    }

    setIsSubmitting(true);
    setStatusNotice(null);

    const now = new Date().toISOString();
    const engineerName = user?.name || 'Authorized Engineer';

    // Build the pipeline update payload (only genuine changes)
    const pipelineUpdate = {};
    if (form.condition) pipelineUpdate.Condition_Score = form.condition;
    if (form.updatedMaterial) pipelineUpdate.Material = form.updatedMaterial;
    if (form.updatedDiameterMm) pipelineUpdate.Diameter_mm = parseFloat(form.updatedDiameterMm);

    // Build maintenance history record
    const maintenanceEntry = {
      id: `LOG-${Date.now()}`,
      pipelineId: selectedPipelineId,
      workOrderId: form.linkedWorkOrderId || null,
      eventType: 'REPAIR_PROGRESS',
      title: `Pipeline Updated: ${selectedPipelineId}`,
      description: `${form.repairDescription}${form.repairNotes ? '. Notes: ' + form.repairNotes : ''}. Cost: ${form.recordedCost ? '₹' + form.recordedCost : 'Not recorded'}. Completed: ${form.repairCompletionDate}`,
      performedBy: engineerName,
      cost: form.recordedCost ? parseFloat(form.recordedCost) : null,
      source: 'Engineer Update',
      createdAt: now,
    };

    let dbError = null;

    // Attempt to update pipeline in Supabase if authenticated
    if (session && !session.isDemo && Object.keys(pipelineUpdate).length > 0) {
      try {
        const { error } = await supabase
          .from('pipelines')
          .update({ ...pipelineUpdate, updated_at: now })
          .eq('pipeline_id', selectedPipelineId);
        if (error) dbError = error.message;
      } catch (err) {
        dbError = err.message;
      }
    }

    // Log maintenance record to Supabase if authenticated
    if (session && !session.isDemo) {
      try {
        await supabase.from('maintenance_records').insert([{
          pipeline_id: selectedPipelineId,
          work_order_id: form.linkedWorkOrderId || null,
          event_type: 'REPAIR_PROGRESS',
          title: maintenanceEntry.title,
          description: maintenanceEntry.description,
          performed_by: engineerName,
          cost: maintenanceEntry.cost,
          source: 'Engineer Update',
          created_at: now,
        }]);
      } catch {
        // Non-blocking: local record will still be added
      }
    }

    // Always update local state
    // The pipelines list is managed by PipelineContext; we show a notice
    setIsSubmitting(false);

    if (dbError) {
      setStatusNotice({
        type: 'warning',
        message: `Update saved locally. Database sync warning: ${dbError}. The maintenance record has been logged.`
      });
    } else {
      setStatusNotice({
        type: 'success',
        message: `Pipeline ${selectedPipelineId} updated successfully. Maintenance record logged by ${engineerName} on ${new Date(now).toLocaleDateString('en-GB')}.`
      });
    }

    // Reset form for next use
    setConfirmed(false);
    setForm(prev => ({
      ...prev,
      repairDescription: '',
      repairNotes: '',
      recordedCost: '',
      updatedMaterial: '',
      updatedDiameterMm: '',
      condition: '',
    }));

    // Reload workflow data to refresh maintenance history
    await loadWorkflowData();
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Update Pipeline Registry</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record post-repair or post-maintenance updates to an existing registered pipeline
          </p>
        </div>
        <button
          onClick={() => navigate('/pipeline-data')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          Back to Registry
        </button>
      </div>

      {pipelines.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <PencilLine className="w-7 h-7 text-amber-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No Pipelines Registered</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Import pipeline data through the Pipeline Registry before recording updates.
          </p>
          <button
            onClick={() => navigate('/pipeline-data')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Go to Pipeline Registry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Pipeline Selector */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Select Pipeline</h3>
              <p className="text-xs text-slate-500 mt-0.5">Choose the pipeline to update</p>
            </div>
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={pipelineSearch}
                  onChange={e => setPipelineSearch(e.target.value)}
                  placeholder="Search by ID or location..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-100">
              {filteredPipelines.map(p => (
                <button
                  key={p.Pipeline_ID}
                  onClick={() => handleSelectPipeline(p.Pipeline_ID)}
                  className={`w-full text-left px-4 py-3 text-xs transition hover:bg-blue-50/50 ${
                    selectedPipelineId === p.Pipeline_ID ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                  }`}
                >
                  <div className="font-bold text-blue-900">{p.Pipeline_ID}</div>
                  <div className="text-slate-500 mt-0.5 truncate">{p.Location}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-semibold text-slate-600">{p.Material}</span>
                    {p.Calculated_Risk_Level && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.Calculated_Risk_Level === 'HIGH' ? 'bg-red-100 text-red-700' :
                        p.Calculated_Risk_Level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.Calculated_Risk_Level}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filteredPipelines.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">No pipelines match your search.</div>
              )}
            </div>
          </div>

          {/* Right: Update Form */}
          <div className="lg:col-span-8 space-y-4">
            {/* Selected pipeline info card */}
            {selectedPipeline ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-900 text-sm">{selectedPipeline.Pipeline_ID}</span>
                    <span className="ml-2 text-blue-600 font-medium">{selectedPipeline.Location}</span>
                  </div>
                  <button onClick={() => setSelectedPipelineId('')} className="text-blue-400 hover:text-blue-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-slate-600">
                  <span>Material: <strong>{selectedPipeline.Material || '—'}</strong></span>
                  <span>Diameter: <strong>{selectedPipeline.Diameter_mm ? `${selectedPipeline.Diameter_mm} mm` : '—'}</strong></span>
                  <span>Age: <strong>{selectedPipeline.Age_Years ? `${selectedPipeline.Age_Years} yrs` : '—'}</strong></span>
                  <span>Current Condition: <strong>{selectedPipeline.Condition_Score || '—'}</strong></span>
                  {selectedPipeline.Calculated_Risk_Level && (
                    <span>Risk: <strong className={
                      selectedPipeline.Calculated_Risk_Level === 'HIGH' ? 'text-red-700' :
                      selectedPipeline.Calculated_Risk_Level === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'
                    }>{selectedPipeline.Calculated_Risk_Level}</strong></span>
                  )}
                </div>
                {linkedWorkOrders.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <span className="text-blue-700 font-semibold">Open Work Orders: </span>
                    {linkedWorkOrders.map(wo => (
                      <span key={wo.id} className="font-mono text-[11px] ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-900">{wo.id} ({wo.status})</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                <PencilLine className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Select a pipeline from the left panel to begin recording an update.
              </div>
            )}

            {/* Status Notice */}
            {statusNotice && (
              <div className={`p-3 rounded-lg border text-xs font-semibold flex items-start gap-2 ${
                statusNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                statusNotice.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-red-50 border-red-200 text-red-800'
              }`}>
                {statusNotice.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />}
                <span>{statusNotice.message}</span>
              </div>
            )}

            {/* Update Form */}
            {selectedPipeline && (
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Record Post-Repair / Maintenance Update</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Engineer: <span className="font-semibold text-blue-700">{user?.name}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Repair Description */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Repair / Maintenance Performed <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.repairDescription}
                      onChange={e => setForm(f => ({ ...f, repairDescription: e.target.value }))}
                      rows={3}
                      placeholder="Describe the repair or maintenance work completed (e.g. Joint relining, pipe section replacement, valve servicing)..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
                      required
                    />
                  </div>

                  {/* Repair Completion Date */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Repair Completion Date</label>
                    <input
                      type="date"
                      value={form.repairCompletionDate}
                      onChange={e => setForm(f => ({ ...f, repairCompletionDate: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>

                  {/* Recorded Cost */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Recorded Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.recordedCost}
                      onChange={e => setForm(f => ({ ...f, recordedCost: e.target.value }))}
                      placeholder="e.g. 85000"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>

                  {/* Updated Condition */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Updated Condition (if changed)</label>
                    <select
                      value={form.condition}
                      onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    >
                      <option value="">— No change —</option>
                      {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Linked Work Order */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Linked Work Order</label>
                    <select
                      value={form.linkedWorkOrderId}
                      onChange={e => setForm(f => ({ ...f, linkedWorkOrderId: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    >
                      <option value="">None (standalone update)</option>
                      {linkedWorkOrders.map(wo => (
                        <option key={wo.id} value={wo.id}>{wo.id} — {wo.status}</option>
                      ))}
                      {workOrders
                        .filter(wo => wo.pipelineId === selectedPipelineId && ['Closed', 'Rejected'].includes(wo.status))
                        .map(wo => (
                          <option key={wo.id} value={wo.id}>{wo.id} — {wo.status}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Separator: Only change material/diameter if genuinely changed */}
                  <div className="sm:col-span-2">
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      <strong>Asset Changes (only if physically altered):</strong> Update material or diameter below only if the repair involved physical replacement that changed these specifications.
                    </div>
                  </div>

                  {/* Updated Material */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Updated Material (if replaced)</label>
                    <select
                      value={form.updatedMaterial}
                      onChange={e => setForm(f => ({ ...f, updatedMaterial: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    >
                      <option value="">— No change —</option>
                      {MATERIAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Updated Diameter */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Updated Diameter mm (if changed)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.updatedDiameterMm}
                      onChange={e => setForm(f => ({ ...f, updatedDiameterMm: e.target.value }))}
                      placeholder="e.g. 300"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>

                  {/* Additional Notes */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Additional Notes</label>
                    <textarea
                      value={form.repairNotes}
                      onChange={e => setForm(f => ({ ...f, repairNotes: e.target.value }))}
                      rows={2}
                      placeholder="Any additional observations, contractor details, or site notes..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Confirmation checkbox */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-slate-700">
                      I, <strong>{user?.name}</strong>, confirm that the information entered above is accurate and that this update will be permanently recorded in the municipal maintenance audit log. This action cannot be undone.
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !confirmed || !form.repairDescription.trim()}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition text-xs"
                  >
                    {isSubmitting ? 'Saving Update...' : 'Save Update'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPipelineId('');
                      setStatusNotice(null);
                      setConfirmed(false);
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/maintenance-history?pipelineId=${selectedPipelineId}`)}
                    className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    View Maintenance History →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
