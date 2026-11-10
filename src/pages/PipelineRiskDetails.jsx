import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';
import RiskBadge from '../components/RiskBadge';
import RiskMeter from '../components/RiskMeter';
import RecommendationCard from '../components/RecommendationCard';
import WorkflowProgress from '../components/WorkflowProgress';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function PipelineRiskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pipelines, getPipelineById, user } = usePipelines();
  const { recordRiskReview, submitInspection } = useWorkflow();

  // If no dataset uploaded, display required empty state
  if (pipelines.length === 0) {
    return (
      <div className="space-y-6">
        <WorkflowProgress currentStep="details" />

        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Pipeline Selected</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Upload and assess a dataset to view pipeline risk details.
          </p>
          <button
            onClick={() => navigate('/pipeline-data')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      </div>
    );
  }

  const pipeline = getPipelineById(id) || pipelines[0];

  if (!pipeline) {
    return (
      <div className="p-10 text-center">
        <h3 className="text-lg font-bold text-slate-800">Pipeline Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The specified pipeline ID could not be located in the current dataset.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Find previous and next pipelines for swift navigation
  const currentIndex = pipelines.findIndex((p) => p.Pipeline_ID === pipeline.Pipeline_ID);
  const prevPipeline = currentIndex > 0 ? pipelines[currentIndex - 1] : null;
  const nextPipeline = currentIndex < pipelines.length - 1 ? pipelines[currentIndex + 1] : null;

  const score = pipeline.Calculated_Risk_Score ?? (pipeline.Risk_Level === 'HIGH' ? 88 : pipeline.Risk_Level === 'MEDIUM' ? 52 : 22);
  const level = pipeline.Calculated_Risk_Level || pipeline.Risk_Level || 'LOW';
  const factors = pipeline.Risk_Factors || { critical: [], positive: [] };

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <WorkflowProgress currentStep="details" />

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pipeline {pipeline.Pipeline_ID}
              </h2>
              <RiskBadge level={level} size="md" />
              <ProvenanceBadge provenance={pipeline.Provenance} sourceName={pipeline.Source_Name} size="md" />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{pipeline.Location}</span>
            </p>
          </div>
        </div>

        {/* Pipeline Selector / Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Quick Dropdown Selector */}
          <select
            value={pipeline.Pipeline_ID}
            onChange={(e) => navigate(`/pipeline/${e.target.value}`)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {pipelines.map((p) => (
              <option key={p.Pipeline_ID} value={p.Pipeline_ID}>
                {p.Pipeline_ID} — {p.Location} ({p.Calculated_Risk_Level || 'Assessed'})
              </option>
            ))}
          </select>

          {prevPipeline && (
            <button
              onClick={() => navigate(`/pipeline/${prevPipeline.Pipeline_ID}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
              title="Previous Pipeline"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{prevPipeline.Pipeline_ID}</span>
            </button>
          )}
          {nextPipeline && (
            <button
              onClick={() => navigate(`/pipeline/${nextPipeline.Pipeline_ID}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
              title="Next Pipeline"
            >
              <span className="hidden sm:inline">{nextPipeline.Pipeline_ID}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Large Horizontal Risk Meter */}
      <div>
        <RiskMeter score={score} />
      </div>

      {/* Asset Specifications Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Pipeline Engineering & Operational Specifications</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Pipeline ID</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Pipeline_ID}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Location</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Location}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Installation Year</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Installation_Year || '—'}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Pipeline Age</span>
            <span className="text-sm font-bold text-blue-900 mt-0.5 block">{pipeline.Age_Years} years</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Pipe Material</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Material}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Diameter</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Diameter_mm} mm</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Segment Length</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Length_m} meters</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Previous Failures</span>
            <span className={`text-sm font-bold mt-0.5 block ${pipeline.Previous_Leaks >= 4 ? 'text-red-700' : 'text-slate-900'}`}>
              {pipeline.Previous_Leaks} failures
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Leak History</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">
              {pipeline.Previous_Leaks >= 5 ? 'High Frequency' : pipeline.Previous_Leaks >= 2 ? 'Moderate' : 'Low / Minimal'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Repair Count</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Repair_Count} interventions</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Operating Pressure</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Operating_Pressure_bar} bar</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Soil Type</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Soil_Type}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Condition Score</span>
            <span className={`text-sm font-bold mt-0.5 block ${pipeline.Condition_Score <= 3.5 ? 'text-red-700' : 'text-emerald-700'}`}>
              {pipeline.Condition_Score} / 10
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Current Risk Score</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{score} / 100</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Risk Classification</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{level}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Last Inspection</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">{pipeline.Inspection_Year || '—'}</span>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
            <span className="text-[11px] text-blue-700 block uppercase font-semibold">Data Provenance</span>
            <span className="text-sm font-bold text-blue-900 mt-0.5 block">
              {pipeline.Provenance === 'OFFICIAL_SOURCE' ? 'Official GIS Feed' : pipeline.Is_Synthetic ? 'Synthetic Demo' : 'Engineer Submitted'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Source Layer / System</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block truncate" title={pipeline.Source_Name}>
              {pipeline.Source_Name || 'Manual Entry'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block uppercase font-semibold">Data Freshness</span>
            <span className="text-sm font-bold text-emerald-800 mt-0.5 block">
              {pipeline.Data_Freshness_Label || 'Current'}
            </span>
          </div>
        </div>
      </div>

      {/* AI RISK FACTORS SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            AI Risk Factors & Explanatory Analysis
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            These factors contributed most strongly to the current risk assessment for {pipeline.Pipeline_ID}.
          </p>
        </div>

        <div className="space-y-3">
          {/* Critical Risk Factors */}
          {factors.critical && factors.critical.length > 0 ? (
            factors.critical.map((f, i) => (
              <div
                key={`crit-${i}`}
                className="p-3.5 rounded-lg bg-red-50/70 border border-red-200 text-xs text-red-900 flex items-start gap-3"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-red-950 block">{f.title}</span>
                  <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 rounded-lg bg-slate-50 text-slate-500 text-xs">
              No critical failure anomalies registered for this pipeline.
            </div>
          )}

          {/* Positive Factors */}
          {factors.positive && factors.positive.length > 0 && (
            factors.positive.map((p, i) => (
              <div
                key={`pos-${i}`}
                className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 block">{p.title}</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">{p.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ENGINEER RISK REVIEW & WORK ORDER DISPATCH PANEL */}
      <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Authorized Engineer Risk Review & Governance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review AI diagnostic, record municipal decision, and dispatch work orders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/maintenance-history?pipelineId=${pipeline.Pipeline_ID}`)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              View Asset Audit Log
            </button>
            <button
              onClick={() => navigate(`/inspections?pipelineId=${pipeline.Pipeline_ID}`)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition"
            >
              Log Field Inspection
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Municipal Governance Decision:</span>
            <span className="text-[11px] text-slate-500">Authorized Officer: {user?.name || 'Municipal Engineer'}</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={async () => {
                await recordRiskReview(pipeline.Pipeline_ID, 'Approved', 'Engineer reviewed AI feature weighting and approved recommended intervention schedule.');
                navigate('/work-orders');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-xs"
            >
              Approve AI Assessment & Issue Work Order
            </button>

            <button
              onClick={async () => {
                await recordRiskReview(pipeline.Pipeline_ID, 'Requested Inspection', 'Physical verification required before authorizing capital expenditure.');
                navigate(`/inspections?pipelineId=${pipeline.Pipeline_ID}`);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-xs"
            >
              Request Field Inspection First
            </button>

            <button
              onClick={async () => {
                const reason = window.prompt('Specify engineering rationale for rejecting AI recommendation:');
                if (reason) {
                  await recordRiskReview(pipeline.Pipeline_ID, 'Rejected', reason);
                  alert('Decision recorded in municipal maintenance audit log.');
                }
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition"
            >
              Reject Assessment With Reason
            </button>
          </div>
        </div>
      </div>

      {/* MAINTENANCE RECOMMENDATIONS SECTION */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3">
          Recommended Maintenance Action
        </h3>
        <RecommendationCard
          riskLevel={level}
          pipeline={pipeline}
          pipelines={pipelines}
          user={user}
          onScheduleInspection={submitInspection}
          onAction={(act) => {
            if (act === 'REPORT') navigate('/reports');
          }}
        />
      </div>
    </div>
  );
}
