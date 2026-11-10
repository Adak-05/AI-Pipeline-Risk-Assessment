import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle2, Calendar,
  Wrench, FileDown, ShieldAlert, Check, X, Loader2, User
} from 'lucide-react';
import { getMaintenanceRecommendations } from '../utils/riskEngine';

// Known engineers — seeded from common municipal roles.
// The authenticated user is always prepended so they appear first.
const KNOWN_ENGINEERS = [
  'Er. Suresh Patil (Field Inspector)',
  'Er. Anjali Desai (Senior Inspector)',
  'Er. Rohit Sharma (Zone-III Engineer)',
  'Er. Priya Nair (Hydraulic Engineer)',
  'Er. Kiran Mehta (Asset Manager)',
];

// Minimum selectable date = today (no past dates for new schedules)
function todayString() {
  return new Date().toISOString().split('T')[0];
}

// ── Inline Inspection Scheduling Form ────────────────────────────────────────
function InlineScheduleForm({
  defaultPipelineId,
  pipelines,
  user,
  onSubmit,     // async fn(formData) → { success, error }
  onCancel,
}) {
  // Build engineer list: authenticated user first, then known list (deduped)
  const engineerOptions = useMemo(() => {
    const userName = user?.name;
    const base = userName ? [userName, ...KNOWN_ENGINEERS.filter(e => e !== userName)] : KNOWN_ENGINEERS;
    return base;
  }, [user]);

  const [form, setForm] = useState({
    pipelineId: defaultPipelineId || (pipelines[0]?.Pipeline_ID ?? ''),
    assignedEngineer: engineerOptions[0] || '',
    inspectionDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.pipelineId) e.pipelineId = 'Pipeline selection is required.';
    if (!form.assignedEngineer) e.assignedEngineer = 'Assigned engineer is required.';
    if (!form.inspectionDate) e.inspectionDate = 'Inspection date is required.';
    else if (form.inspectionDate < todayString()) e.inspectionDate = 'Inspection date cannot be in the past.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);

    const result = await onSubmit({
      pipelineId: form.pipelineId,
      inspectionDate: form.inspectionDate,
      conditionObserved: 'Fair',   // default — engineer will update on actual inspection day
      leakageObserved: false,
      corrosionObserved: false,
      recommendedAction: `Scheduled inspection assigned to ${form.assignedEngineer}`,
      notes: form.notes || `Inspection scheduled from Maintenance Recommendations. Engineer: ${form.assignedEngineer}.`,
      workOrderId: null,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error || 'Failed to save inspection. Please try again.');
    }
    // success is handled by parent (it dismisses this form)
  };

  const field = (key, label, children) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
      {errors[key] && <p className="mt-0.5 text-[11px] text-red-600 font-medium">{errors[key]}</p>}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 bg-white border border-blue-200 rounded-xl p-4 shadow-sm space-y-3 animate-fadeIn"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Schedule Inspection</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {submitError && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field('pipelineId', 'Pipeline ID',
          <select
            value={form.pipelineId}
            onChange={e => setForm(f => ({ ...f, pipelineId: e.target.value }))}
            className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none ${errors.pipelineId ? 'border-red-400' : 'border-slate-300'}`}
          >
            <option value="">Select pipeline…</option>
            {pipelines.map(p => (
              <option key={p.Pipeline_ID} value={p.Pipeline_ID}>
                {p.Pipeline_ID} — {p.Location}
              </option>
            ))}
          </select>
        )}

        {field('assignedEngineer', 'Assigned Engineer',
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={form.assignedEngineer}
              onChange={e => setForm(f => ({ ...f, assignedEngineer: e.target.value }))}
              className={`w-full border rounded-lg pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none ${errors.assignedEngineer ? 'border-red-400' : 'border-slate-300'}`}
            >
              <option value="">Select engineer…</option>
              {engineerOptions.map(eng => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>
          </div>
        )}

        {field('inspectionDate', 'Inspection Date',
          <input
            type="date"
            min={todayString()}
            value={form.inspectionDate}
            onChange={e => setForm(f => ({ ...f, inspectionDate: e.target.value }))}
            className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none ${errors.inspectionDate ? 'border-red-400' : 'border-slate-300'}`}
          />
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any pre-inspection notes…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95"
        >
          {isSubmitting
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving…</span></>
            : <><Calendar className="w-3.5 h-3.5" /><span>Schedule Inspection</span></>
          }
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── RecommendationCard ────────────────────────────────────────────────────────
export default function RecommendationCard({
  riskLevel = 'HIGH',
  pipeline = null,
  onAction = null,
  compact = false,
  // New props for real inspection scheduling
  pipelines = [],
  user = null,
  onScheduleInspection = null,  // async fn(formData) → { success, error }
}) {
  const recommendations = getMaintenanceRecommendations(riskLevel, pipeline);

  // Which schedule button is open: 'inspect' | 'audit' | 'routine' | null
  const [openForm, setOpenForm] = useState(null);
  const [successNotice, setSuccessNotice] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

  const isHigh = riskLevel === 'HIGH';
  const isMed  = riskLevel === 'MEDIUM';

  const theme = isHigh
    ? { border: 'border-red-300', bg: 'bg-red-50/50', badge: 'bg-red-600 text-white', icon: AlertTriangle, iconColor: 'text-red-600', title: 'HIGH PRIORITY MAINTENANCE REQUIRED' }
    : isMed
    ? { border: 'border-amber-300', bg: 'bg-amber-50/50', badge: 'bg-amber-600 text-white', icon: AlertCircle, iconColor: 'text-amber-600', title: 'MEDIUM PRIORITY PREVENTIVE SURVEILLANCE' }
    : { border: 'border-emerald-300', bg: 'bg-emerald-50/50', badge: 'bg-emerald-600 text-white', icon: CheckCircle2, iconColor: 'text-emerald-600', title: 'ROUTINE SURVEILLANCE & MONITORING' };

  const IconComp = theme.icon;

  // Non-schedule button handler (unchanged behaviour for non-inspection actions)
  const handleButtonClick = (actionType, label) => {
    setActionNotice(`Action Logged: ${label} for ${pipeline?.Pipeline_ID || 'Selected Pipeline'}`);
    setTimeout(() => setActionNotice(null), 3500);
    if (onAction) onAction(actionType);
  };

  // Toggle the inline form; if another form was open, close it first
  const toggleForm = (formKey) => {
    setOpenForm(prev => (prev === formKey ? null : formKey));
    setSuccessNotice('');
    setActionNotice(null);
  };

  // Called by InlineScheduleForm on submit
  const handleScheduleSubmit = async (formData) => {
    if (!onScheduleInspection) return { success: false, error: 'Inspection scheduling is not available.' };
    const result = await onScheduleInspection(formData);
    if (result.success) {
      setOpenForm(null);
      const pid = formData.pipelineId;
      const dt = new Date(formData.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      setSuccessNotice(`✓ Inspection scheduled for ${pid} on ${dt}. It is now visible in the Inspections page.`);
      setTimeout(() => setSuccessNotice(''), 6000);
    }
    return result;
  };

  // Whether to show the inline form below schedule buttons
  const canSchedule = pipelines.length > 0 && !!onScheduleInspection;

  return (
    <div className={`rounded-xl border ${theme.border} ${theme.bg} p-5 shadow-sm transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-100">
            <IconComp className={`w-5 h-5 ${theme.iconColor}`} />
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold tracking-wider ${theme.badge}`}>
              {recommendations.priority}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{theme.title}</h4>
          </div>
        </div>
        {pipeline && (
          <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto">
            Target: {pipeline.Pipeline_ID} ({pipeline.Location})
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="mt-3.5">
        <p className="text-sm font-semibold text-slate-800">Executive Recommendation:</p>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{recommendations.summary}</p>
      </div>

      {/* Detailed Action Steps */}
      <div className="mt-4 bg-white rounded-lg p-3.5 border border-slate-200/70">
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-slate-500" />
          Prescribed Engineering Action Steps
        </h5>
        <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
          {recommendations.actions.map((act, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <span>{act}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap gap-2.5 items-center">
        {isHigh && (
          <>
            <button
              id="btn-schedule-inspection-high"
              onClick={() => canSchedule ? toggleForm('inspect') : handleButtonClick('INSPECT', 'Schedule Detailed Inspection')}
              className={`inline-flex items-center gap-1.5 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95 ${
                openForm === 'inspect' ? 'bg-red-800' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {openForm === 'inspect' ? 'Close Form' : 'Schedule Inspection'}
            </button>
            <button
              onClick={() => handleButtonClick('REPLACE', 'Flagged for Capital Replacement')}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Mark for Replacement
            </button>
          </>
        )}

        {isMed && (
          <>
            <button
              id="btn-schedule-inspection-med"
              onClick={() => canSchedule ? toggleForm('audit') : handleButtonClick('AUDIT', 'Preventive Inspection Scheduled')}
              className={`inline-flex items-center gap-1.5 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95 ${
                openForm === 'audit' ? 'bg-amber-800' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {openForm === 'audit' ? 'Close Form' : 'Schedule Preventive Inspection'}
            </button>
            <button
              onClick={() => handleButtonClick('MONITOR', 'Active Leak Monitoring Initiated')}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95"
            >
              <Wrench className="w-4 h-4 text-blue-300" />
              Monitor Leakage Rate
            </button>
          </>
        )}

        {!isHigh && !isMed && (
          <>
            <button
              onClick={() => handleButtonClick('LOG_ROUTINE', 'Routine Monitoring Verified')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              Continue Routine Monitoring
            </button>
            <button
              id="btn-schedule-inspection-low"
              onClick={() => canSchedule ? toggleForm('routine') : handleButtonClick('REASSESS', 'Next Assessment Cycle Logged')}
              className={`inline-flex items-center gap-1.5 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95 ${
                openForm === 'routine' ? 'bg-slate-900' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {openForm === 'routine' ? 'Close Form' : 'Schedule Regular Maintenance'}
            </button>
          </>
        )}

        <button
          onClick={() => handleButtonClick('DOWNLOAD_REPORT', 'Engineering Risk Report Generated')}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95 ml-auto"
        >
          <FileDown className="w-4 h-4 text-slate-500" />
          Download Risk Report
        </button>
      </div>

      {/* Inline Schedule Form — renders directly below the buttons */}
      {canSchedule && openForm && (
        <InlineScheduleForm
          defaultPipelineId={pipeline?.Pipeline_ID || ''}
          pipelines={pipelines}
          user={user}
          onSubmit={handleScheduleSubmit}
          onCancel={() => setOpenForm(null)}
        />
      )}

      {/* Success notice after scheduling */}
      {successNotice && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Action notice for non-scheduling buttons */}
      {actionNotice && !successNotice && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}
    </div>
  );
}
