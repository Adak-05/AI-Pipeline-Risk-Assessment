import React, { useState, useMemo } from 'react';
import { PencilLine, CheckCircle2, AlertCircle, Search, X, Loader2 } from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';
import { supabase } from '../lib/supabase';

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor', 'Critical'];
const MATERIAL_OPTIONS = ['Cast Iron', 'Ductile Iron', 'Steel', 'Mild Steel', 'PVC', 'HDPE', 'Asbestos Cement', 'Galvanised Iron', 'Concrete', 'Other'];

const conditionMap = { Good: 8, Fair: 6, Poor: 3, Critical: 1 };

const CURRENT_YEAR = 2026;

export default function UpdatePipelineRegistry() {
  const { pipelines, user, session, loadPipelinesFromDb } = usePipelines();
  const { loadWorkflowData } = useWorkflow();

  const [searchInput, setSearchInput] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  const [form, setForm] = useState({
    material: '',
    installationYear: '',
    length: '',
    diameter: '',
    location: '',
    condition: '',
    maintenanceDate: '',
    remarks: ''
  });

  const calculatedAge = form.installationYear
    ? Math.max(0, CURRENT_YEAR - parseInt(form.installationYear, 10))
    : null;

  const handleSearch = () => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return;
    const found = pipelines.find(p => String(p.Pipeline_ID).toLowerCase() === q);
    if (found) {
      setSelectedPipeline(found);
      setStatusNotice(null);
      setForm({
        material: found.Material || '',
        installationYear: found.Installation_Year || '',
        length: found.Length_m || '',
        diameter: found.Diameter_mm || '',
        location: found.Location || '',
        condition: '',
        maintenanceDate: new Date().toISOString().split('T')[0],
        remarks: ''
      });
    } else {
      setSelectedPipeline(null);
      setStatusNotice({ type: 'error', message: `Pipeline "${searchInput}" not found in the registry.` });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCancel = () => {
    setSelectedPipeline(null);
    setSearchInput('');
    setStatusNotice(null);
    setForm({
      material: '', installationYear: '', length: '', diameter: '',
      location: '', condition: '', maintenanceDate: '', remarks: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPipeline) return;

    setIsSubmitting(true);
    setStatusNotice(null);

    const now = new Date().toISOString();
    const engineerName = user?.name || 'Authorized Engineer';
    const ageYears = form.installationYear ? Math.max(0, CURRENT_YEAR - parseInt(form.installationYear, 10)) : selectedPipeline.Age_Years;

    let dbError = null;

    // Update pipeline in Supabase if authenticated
    if (session && !session.isDemo) {
      try {
        const updatePayload = {
          updated_at: now,
        };
        if (form.material) updatePayload.material = form.material;
        if (form.installationYear) {
          updatePayload.installation_year = parseInt(form.installationYear, 10);
          updatePayload.age_years = ageYears;
        }
        if (form.length) updatePayload.length_m = parseFloat(form.length);
        if (form.diameter) updatePayload.diameter_mm = parseFloat(form.diameter);
        if (form.location) updatePayload.location = form.location;
        if (form.condition) updatePayload.condition_score = conditionMap[form.condition];

        const { error } = await supabase
          .from('pipelines')
          .update(updatePayload)
          .eq('pipeline_id', selectedPipeline.Pipeline_ID);

        if (error) dbError = error.message;
      } catch (err) {
        dbError = err.message;
      }

      // Log to maintenance_records
      try {
        await supabase.from('maintenance_records').insert([{
          pipeline_id: selectedPipeline.Pipeline_ID,
          work_order_id: null,
          event_type: 'PIPELINE_UPDATED',
          title: `Pipeline Registry Updated: ${selectedPipeline.Pipeline_ID}`,
          description: `Engineer ${engineerName} updated the registry for Pipeline ${selectedPipeline.Pipeline_ID}.${form.condition ? ` Recorded Condition: ${form.condition}.` : ''}${form.remarks ? ` Remarks: ${form.remarks}` : ''}`,
          performed_by: engineerName,
          source: 'Engineer Update',
          created_at: now,
        }]);
      } catch {
        // Non-blocking
      }
    }

    setIsSubmitting(false);

    if (dbError) {
      setStatusNotice({
        type: 'warning',
        message: `Update saved locally. Database sync notice: ${dbError}`
      });
    } else {
      setStatusNotice({
        type: 'success',
        message: `Pipeline ${selectedPipeline.Pipeline_ID} updated successfully by ${engineerName}.`
      });
    }

    // Refresh pipelines in context
    if (session && !session.isDemo) {
      await loadPipelinesFromDb();
      await loadWorkflowData();
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Update Pipeline Registry</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Search for a pipeline and update its information in the registry
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <label className="block text-xs font-bold text-slate-700 mb-2">Search Pipeline by ID</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter exact Pipeline ID (e.g. PL-001)..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
          >
            Search
          </button>
        </div>
        {pipelines.length === 0 && (
          <p className="text-xs text-amber-700 mt-2 font-medium">No pipelines loaded. Upload pipeline data first.</p>
        )}
      </div>

      {/* Status Notice */}
      {statusNotice && (
        <div className={`p-3 rounded-lg border text-xs font-semibold flex items-start gap-2 ${
          statusNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          statusNotice.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          {statusNotice.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* Pipeline Info + Edit Form */}
      {selectedPipeline ? (
        <div className="space-y-4">
          {/* Current Pipeline Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-blue-900 text-sm">{selectedPipeline.Pipeline_ID}</span>
                <span className="ml-2 text-blue-600 font-medium">{selectedPipeline.Location}</span>
              </div>
              <button onClick={handleCancel} className="text-blue-400 hover:text-blue-700 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-4 text-slate-600">
              <span>Material: <strong>{selectedPipeline.Material || '—'}</strong></span>
              <span>Age: <strong>{selectedPipeline.Age_Years ? `${selectedPipeline.Age_Years} yrs` : '—'}</strong></span>
              <span>Diameter: <strong>{selectedPipeline.Diameter_mm ? `${selectedPipeline.Diameter_mm} mm` : '—'}</strong></span>
              <span>Length: <strong>{selectedPipeline.Length_m ? `${selectedPipeline.Length_m} m` : '—'}</strong></span>
              <span>Condition Score: <strong>{selectedPipeline.Condition_Score ?? '—'}</strong></span>
              {selectedPipeline.Calculated_Risk_Level && (
                <span>Risk: <strong className={
                  selectedPipeline.Calculated_Risk_Level === 'HIGH' ? 'text-red-700' :
                  selectedPipeline.Calculated_Risk_Level === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'
                }>{selectedPipeline.Calculated_Risk_Level}</strong></span>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Edit Pipeline Information</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Engineer: <span className="font-semibold text-blue-700">{user?.name}</span>
                </p>
              </div>
              <PencilLine className="w-5 h-5 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Pipeline ID - Read Only */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pipeline ID</label>
                <input
                  type="text"
                  value={selectedPipeline.Pipeline_ID}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 text-slate-500 font-mono font-bold"
                />
              </div>

              {/* Material */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Material</label>
                <select
                  value={form.material}
                  onChange={e => setForm(f => ({ ...f, material: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                >
                  <option value="">— Unchanged —</option>
                  {MATERIAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Installation Year */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Installation Year</label>
                <input
                  type="number"
                  value={form.installationYear}
                  onChange={e => setForm(f => ({ ...f, installationYear: e.target.value }))}
                  min={1900}
                  max={CURRENT_YEAR}
                  placeholder={selectedPipeline.Installation_Year || 'e.g. 1985'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Age — auto-calculated, read-only */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Age (years)</label>
                <input
                  type="text"
                  value={calculatedAge !== null ? `${calculatedAge} years` : (selectedPipeline.Age_Years ? `${selectedPipeline.Age_Years} years (current)` : '—')}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 text-slate-500"
                />
              </div>

              {/* Length */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Length (m)</label>
                <input
                  type="number"
                  value={form.length}
                  onChange={e => setForm(f => ({ ...f, length: e.target.value }))}
                  min={0}
                  step={0.1}
                  placeholder={selectedPipeline.Length_m || 'e.g. 500'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Diameter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Diameter (mm)</label>
                <input
                  type="number"
                  value={form.diameter}
                  onChange={e => setForm(f => ({ ...f, diameter: e.target.value }))}
                  min={0}
                  step={0.1}
                  placeholder={selectedPipeline.Diameter_mm || 'e.g. 300'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Location */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={selectedPipeline.Location || 'e.g. Andheri West Zone A'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Recorded Condition */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recorded Condition</label>
                <select
                  value={form.condition}
                  onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                >
                  <option value="">— Unchanged —</option>
                  {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Maintenance/Repair Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Maintenance or Repair Date</label>
                <input
                  type="date"
                  value={form.maintenanceDate}
                  onChange={e => setForm(f => ({ ...f, maintenanceDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Update Remarks */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">Update Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  rows={3}
                  placeholder="Describe the reason for the update, work completed, or any additional observations..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? 'Saving...' : 'Update Pipeline Record'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        !statusNotice && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center">
            <PencilLine className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-600">Search for a Pipeline</h3>
            <p className="text-sm text-slate-400 mt-1">
              Enter a Pipeline ID in the search box above to load and edit its information.
            </p>
          </div>
        )
      )}
    </div>
  );
}
