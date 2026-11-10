import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileDown,
  ArrowRight,
  Upload,
  Trash2
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';
import RiskBadge from '../components/RiskBadge';
import RecommendationCard from '../components/RecommendationCard';
import WorkflowProgress from '../components/WorkflowProgress';

export default function MaintenanceRecommendations() {
  const { pipelines, stats, user, exportPipelinesCSV, clearDataset } = usePipelines();
  const { submitInspection } = useWorkflow();
  const [activeTab, setActiveTab] = useState('HIGH');
  const [sortOrder, setSortOrder] = useState('desc'); // high to low risk
  const navigate = useNavigate();

  // Group pipelines dynamically - always call useMemo unconditionally
  const groupedPipelines = useMemo(() => {
    const high = [];
    const medium = [];
    const low = [];

    pipelines.forEach((p) => {
      const level = p.Calculated_Risk_Level || p.Risk_Level || 'LOW';
      if (level === 'HIGH') high.push(p);
      else if (level === 'MEDIUM') medium.push(p);
      else low.push(p);
    });

    const sorter = (a, b) => {
      const aScore = a.Calculated_Risk_Score ?? 50;
      const bScore = b.Calculated_Risk_Score ?? 50;
      return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
    };

    return {
      HIGH: high.sort(sorter),
      MEDIUM: medium.sort(sorter),
      LOW: low.sort(sorter)
    };
  }, [pipelines, sortOrder]);

  const currentList = groupedPipelines[activeTab] || [];

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current dataset and assessment results?')) {
      clearDataset();
      navigate('/dashboard');
    }
  };

  // If no pipelines uploaded, show required empty state
  if (pipelines.length === 0) {
    return (
      <div className="space-y-6">
        <WorkflowProgress currentStep="maintenance" />

        <div className="pb-3 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Maintenance Recommendations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Prescriptive engineering interventions prioritized by asset risk classification
          </p>
        </div>

        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Recommendations Available</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Risk assessment results will appear here after a dataset is uploaded.
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

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <WorkflowProgress currentStep="maintenance" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Maintenance Recommendations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Prescriptive engineering interventions prioritized by asset risk classification
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
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Work Orders (CSV)</span>
          </button>
        </div>
      </div>

      {/* Group Priority Cards at Top */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* High Priority Card */}
        <div
          onClick={() => setActiveTab('HIGH')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            activeTab === 'HIGH'
              ? 'bg-red-50/80 border-red-300 ring-2 ring-red-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              High Priority
            </span>
            <span className="text-lg font-black text-red-700 bg-red-100/70 px-2.5 py-0.5 rounded-full">
              {stats.highRiskPipelines}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Schedule detailed inspection and urgent preventive maintenance.
          </p>
        </div>

        {/* Medium Priority Card */}
        <div
          onClick={() => setActiveTab('MEDIUM')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            activeTab === 'MEDIUM'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Medium Priority
            </span>
            <span className="text-lg font-black text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
              {stats.mediumRiskPipelines}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Schedule preventive inspection and monitor leakage.
          </p>
        </div>

        {/* Low Priority Card */}
        <div
          onClick={() => setActiveTab('LOW')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            activeTab === 'LOW'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Low Priority
            </span>
            <span className="text-lg font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
              {stats.lowRiskPipelines}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Continue routine monitoring and schedule regular maintenance.
          </p>
        </div>
      </div>

      {/* Active Group Prescriptive Directive Card */}
      <RecommendationCard
        riskLevel={activeTab}
        pipeline={currentList[0] || null}
        pipelines={pipelines}
        user={user}
        onScheduleInspection={submitInspection}
        onAction={(act) => {
          if (act === 'REPORT') navigate('/reports');
        }}
      />

      {/* Group Pipeline List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'HIGH'
                ? 'High Priority Pipelines Requiring Immediate Work Orders'
                : activeTab === 'MEDIUM'
                ? 'Medium Priority Pipelines Under Surveillance'
                : 'Low Priority Pipelines in Standard Lifecycle'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {currentList.length} assets categorized under {activeTab} risk
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort Risk Score:</span>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-100"
            >
              {sortOrder === 'desc' ? 'Highest First ↓' : 'Lowest First ↑'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {currentList.length > 0 ? (
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/60 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Pipeline ID</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Age</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Recommended Action</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentList.map((item) => {
                  const score = item.Calculated_Risk_Score ?? (item.Risk_Level === 'HIGH' ? 88 : item.Risk_Level === 'MEDIUM' ? 52 : 22);
                  const level = item.Calculated_Risk_Level || item.Risk_Level || 'LOW';

                  const actionText =
                    level === 'HIGH'
                      ? 'Deploy acoustic leak detection & schedule physical inspection'
                      : level === 'MEDIUM'
                      ? 'Quarterly sensor audit & pressure calibration'
                      : 'Routine annual SCADA check';

                  return (
                    <tr
                      key={item.Pipeline_ID}
                      onClick={() => navigate(`/pipeline/${item.Pipeline_ID}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-bold text-blue-900 whitespace-nowrap">
                        {item.Pipeline_ID}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {item.Location}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {item.Age_Years} yrs
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {item.Material}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {score} / 100
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <RiskBadge level={level} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {actionText}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pipeline/${item.Pipeline_ID}`);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No pipelines classified under {activeTab} risk in the current dataset.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
