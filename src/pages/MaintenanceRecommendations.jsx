import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, AlertTriangle, AlertCircle, Upload, Calendar,
  CheckCircle2, Loader2, X, ChevronDown
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';
import RiskBadge from '../components/RiskBadge';

const today = new Date().toISOString().split('T')[0];

function ScheduleForm({ pipeline, user, onSchedule, onCancel }) {
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) { setError('Please select an inspection date.'); return; }
    if (date < today) { setError('Inspection date cannot be in the past.'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await onSchedule({
        pipelineId: pipeline.Pipeline_ID,
        scheduledDate: date,
        engineerName: user?.name
      });
      if (result.success) {
        setSuccess(`Inspection scheduled for Pipeline ${pipeline.Pipeline_ID} on ${date}.`);
        setTimeout(() => onCancel(), 2000);
      } else {
        setError(result.error || 'Failed to schedule inspection.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 bg-teal-50 border border-teal-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">Schedule Inspection</h4>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {success ? (
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1">Pipeline ID</label>
              <input
                type="text"
                value={pipeline.Pipeline_ID}
                readOnly
                className="w-full px-3 py-2 text-xs bg-white border border-teal-200 rounded-lg text-slate-700 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1">Engineer Name</label>
              <input
                type="text"
                value={user?.name || ''}
                readOnly
                className="w-full px-3 py-2 text-xs bg-white border border-teal-200 rounded-lg text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1">Inspection Date *</label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-teal-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-xs font-bold rounded-lg transition"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              <span>{saving ? 'Scheduling...' : 'Schedule Inspection'}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PipelineCard({ pipeline, user, onScheduleInspection }) {
  const [showForm, setShowForm] = useState(false);
  const level = pipeline.Calculated_Risk_Level || pipeline.Risk_Level || 'LOW';
  const rec = pipeline.Recommendations;
  const summary = rec?.summary || 'Schedule inspection based on risk assessment.';

  const bgColor = level === 'HIGH'
    ? 'border-red-200 bg-red-50/40'
    : 'border-amber-200 bg-amber-50/40';

  return (
    <div className={`border rounded-xl p-4 ${bgColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono font-bold text-sm text-slate-900">{pipeline.Pipeline_ID}</span>
            <RiskBadge level={level} size="sm" />
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{pipeline.Location} · {pipeline.Material} · {pipeline.Age_Years} yrs</p>
          <p className="text-xs text-slate-700 mt-2 font-medium">{summary}</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Schedule Inspection</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showForm && (
        <ScheduleForm
          pipeline={pipeline}
          user={user}
          onSchedule={onScheduleInspection}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default function MaintenanceRecommendations() {
  const { pipelines, isAssessed, user } = usePipelines();
  const { scheduleInspection } = useWorkflow();
  const [activeTab, setActiveTab] = useState('HIGH');
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const high = [], medium = [];
    pipelines.forEach(p => {
      const level = p.Calculated_Risk_Level || p.Risk_Level || 'LOW';
      if (level === 'HIGH') high.push(p);
      else if (level === 'MEDIUM') medium.push(p);
    });
    const sortByScore = (a, b) => (b.Calculated_Risk_Score ?? 50) - (a.Calculated_Risk_Score ?? 50);
    return { HIGH: high.sort(sortByScore), MEDIUM: medium.sort(sortByScore) };
  }, [pipelines]);

  if (!isAssessed || pipelines.length === 0) {
    return (
      <div className="space-y-6">
        <div className="pb-3 border-b border-slate-200">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Maintenance Recommendation</h2>
          <p className="text-sm text-slate-500 mt-0.5">Schedule inspections based on AI risk predictions</p>
        </div>
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center max-w-xl mx-auto">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700">No Risk Assessment Available</h3>
          <p className="text-sm text-slate-500 mt-1">Upload pipeline data and run AI Risk Prediction to see recommendations.</p>
          <button
            onClick={() => navigate('/pipeline-data')}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Pipeline Data</span>
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'HIGH', label: 'High Risk', count: grouped.HIGH.length, color: 'text-red-700 border-red-500' },
    { key: 'MEDIUM', label: 'Medium Risk', count: grouped.MEDIUM.length, color: 'text-amber-700 border-amber-500' }
  ];

  const currentList = grouped[activeTab] || [];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Maintenance Recommendation</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Schedule field inspections for pipelines requiring attention
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">High Risk</p>
            <p className="text-2xl font-black text-red-900">{grouped.HIGH.length}</p>
            <p className="text-xs text-red-600">Immediate action required</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Medium Risk</p>
            <p className="text-2xl font-black text-amber-900">{grouped.MEDIUM.length}</p>
            <p className="text-xs text-amber-600">Preventive inspection needed</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-bold transition border-b-2 ${
                activeTab === tab.key
                  ? `border-blue-600 text-blue-700 bg-blue-50/50`
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 text-[10px] font-black rounded-full ${
                tab.key === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {currentList.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                No {activeTab.toLowerCase()} risk pipelines detected.
              </p>
            </div>
          ) : (
            currentList.map(pipeline => (
              <PipelineCard
                key={pipeline.Pipeline_ID}
                pipeline={pipeline}
                user={user}
                onScheduleInspection={scheduleInspection}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
