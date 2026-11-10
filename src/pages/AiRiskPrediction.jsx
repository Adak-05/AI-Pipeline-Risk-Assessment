import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Upload,
  RotateCcw,
  Download,
  Trash2
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import RiskScoreCircle from '../components/RiskScoreCircle';
import RiskBadge from '../components/RiskBadge';
import DataTable from '../components/DataTable';
import WorkflowProgress from '../components/WorkflowProgress';

export default function AiRiskPrediction() {
  const {
    pipelines,
    stats,
    runAiAssessment,
    clearDataset,
    isLoading,
    isAssessed,
    exportPipelinesCSV
  } = usePipelines();
  const navigate = useNavigate();

  // If no dataset uploaded or not assessed, display the exact required empty state
  if (pipelines.length === 0 || !isAssessed) {
    return (
      <div className="space-y-6">
        <WorkflowProgress currentStep="ai-analysis" />

        <div className="pb-3 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Risk Assessment
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Multi-parametric machine-learning style risk evaluation of water mains
          </p>
        </div>

        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
            <Cpu className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No dataset available for prediction.</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Upload historical pipeline data to generate risk predictions.
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

  // Representative high-risk showcase asset from the actual uploaded dataset
  const topHighRiskPipeline =
    pipelines.find((p) => (p.Calculated_Risk_Level || p.Risk_Level) === 'HIGH') ||
    pipelines.find((p) => (p.Calculated_Risk_Level || p.Risk_Level) === 'MEDIUM') ||
    pipelines[0];

  const showcaseScore = topHighRiskPipeline?.Calculated_Risk_Score ?? 0;
  const showcaseLevel = topHighRiskPipeline?.Calculated_Risk_Level ?? 'LOW';
  const showcaseConfidence = topHighRiskPipeline?.AI_Confidence ?? 0;

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current dataset and assessment results?')) {
      clearDataset();
      navigate('/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <WorkflowProgress currentStep="ai-analysis" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Risk Assessment Results
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Multi-parametric risk evaluation based on {pipelines.length} uploaded pipeline records
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg shadow-xs transition"
            title="Clear dataset and reset to empty state"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Dataset</span>
          </button>
          <button
            onClick={exportPipelinesCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Results</span>
          </button>
          <button
            onClick={() => runAiAssessment()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-Run AI Model</span>
          </button>
        </div>
      </div>

      {/* Top AI Summary Section & Circular Visualization */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Circular Score Gauge (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6">
            <RiskScoreCircle
              score={showcaseScore}
              maxScore={100}
              size={190}
              label="Peak Asset Risk Score"
              sublabel={`Pipeline ID: ${topHighRiskPipeline?.Pipeline_ID || 'Selected Asset'}`}
            />
          </div>

          {/* Right: AI Metric Cards & Formula Breakdown (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Peak Risk Score
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">{showcaseScore}</span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Mean Network Score: <span className="font-bold text-slate-700">{stats.averageRiskScore}</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Peak Risk Level
                </span>
                <div className="mt-1">
                  <RiskBadge level={showcaseLevel} size="md" />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1.5">
                  Critical Threshold: 70+
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Prediction Confidence
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-700">{showcaseConfidence}%</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Data Completeness Index
                </span>
              </div>
            </div>

            {/* AI Architecture Note */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Cpu className="w-4 h-4 text-blue-700" />
                <span>Deterministic ML-Style Risk Scoring Architecture</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                The score synthesizes 6 key features: <strong>Pipeline Age (26%)</strong>, <strong>Condition Score (22%)</strong>, <strong>Historical Leaks & Repairs (22%)</strong>, <strong>Operating Pressure (14%)</strong>, <strong>Material Brittleness (10%)</strong>, and <strong>Soil Corrosivity (6%)</strong>.
              </p>
              <p className="text-[10px] text-slate-500 italic">
                *Prediction confidence is an engineering data-density metric for demonstration and not a scientifically certified failure probability.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Classification Band Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="font-bold text-emerald-800 block">0 – 39: LOW RISK</span>
            <span className="text-[11px] text-emerald-700">Routine surveillance & standard maintenance</span>
          </div>
          <span className="text-base font-black text-emerald-800">{stats.lowRiskPipelines} Pipes</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="font-bold text-amber-800 block">40 – 69: MEDIUM RISK</span>
            <span className="text-[11px] text-amber-700">Preventive inspection & acoustic leak monitoring</span>
          </div>
          <span className="text-base font-black text-amber-800">{stats.mediumRiskPipelines} Pipes</span>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="font-bold text-red-800 block">70 – 100: HIGH RISK</span>
            <span className="text-[11px] text-red-700">Immediate work order & replacement consideration</span>
          </div>
          <span className="text-base font-black text-red-800">{stats.highRiskPipelines} Pipes</span>
        </div>
      </div>

      {/* Main Sortable Risk Prediction Table */}
      <div>
        <DataTable
          title="Pipeline AI Risk Classification Table"
          pipelines={pipelines}
          onRowClick={(id) => navigate(`/pipeline/${id}`)}
          itemsPerPage={10}
        />
      </div>
    </div>
  );
}
