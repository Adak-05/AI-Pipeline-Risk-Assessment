import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Upload,
  Cpu,
  Trash2,
  ClipboardList,
  SearchCheck,
  ShieldCheck,
  Globe,
  HardHat
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis
} from 'recharts';

import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import RiskBadge from '../components/RiskBadge';
import WorkflowProgress from '../components/WorkflowProgress';

// Custom Scatter Tooltip declared at module scope
const CustomScatterTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 border border-slate-700">
        <p className="font-bold text-sm text-blue-300">{data.id} — {data.location}</p>
        <div className="pt-1 space-y-0.5 text-slate-300">
          <p><span className="text-slate-400">Material:</span> {data.material}</p>
          <p><span className="text-slate-400">Pipeline Age:</span> <span className="font-semibold text-white">{data.age} years</span></p>
          <p><span className="text-slate-400">AI Risk Score:</span> <span className="font-bold text-white">{data.riskScore} / 100</span></p>
          <p><span className="text-slate-400">Classification:</span> <span className="font-bold" style={{ color: data.fill }}>{data.riskLevel}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { pipelines, stats, assessmentTimestamp, clearDataset } = usePipelines();
  const { workflowStats } = useWorkflow();
  const navigate = useNavigate();

  // Donut chart data
  const pieData = useMemo(() => {
    return [
      { name: 'High Risk', value: stats.highRiskPipelines, color: '#dc2626' },
      { name: 'Medium Risk', value: stats.mediumRiskPipelines, color: '#f59e0b' },
      { name: 'Low Risk', value: stats.lowRiskPipelines, color: '#10b981' },
    ];
  }, [stats]);

  // Scatter chart data: Age vs Risk Score
  const scatterData = useMemo(() => {
    return pipelines.map((p) => {
      const score = p.Calculated_Risk_Score ?? (p.Risk_Level === 'HIGH' ? 88 : p.Risk_Level === 'MEDIUM' ? 52 : 22);
      const level = p.Calculated_Risk_Level || p.Risk_Level || 'LOW';
      return {
        id: p.Pipeline_ID,
        location: p.Location,
        age: Number(p.Age_Years) || 0,
        riskScore: score,
        riskLevel: level,
        material: p.Material,
        fill: score >= 70 ? '#dc2626' : score >= 40 ? '#f59e0b' : '#10b981'
      };
    });
  }, [pipelines]);

  // Priority Pipelines (highest risk first)
  const priorityPipelines = useMemo(() => {
    return [...pipelines]
      .sort((a, b) => {
        const aScore = a.Calculated_Risk_Score ?? (a.Risk_Level === 'HIGH' ? 88 : a.Risk_Level === 'MEDIUM' ? 52 : 22);
        const bScore = b.Calculated_Risk_Score ?? (b.Risk_Level === 'HIGH' ? 88 : b.Risk_Level === 'MEDIUM' ? 52 : 22);
        return bScore - aScore;
      })
      .slice(0, 7);
  }, [pipelines]);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current dataset and assessment results?')) {
      clearDataset();
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Stepper */}
      <WorkflowProgress currentStep="details" />

      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pipeline Infrastructure Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            AI-powered monitoring and risk assessment of ageing water pipelines
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {stats.totalPipelines > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg shadow-xs transition"
              title="Clear dataset and reset to empty state"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Dataset</span>
            </button>
          )}
          <button
            onClick={() => navigate('/pipeline-data')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Dataset</span>
          </button>
          {stats.totalPipelines > 0 && (
            <button
              onClick={() => navigate('/ai-risk-prediction')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Run AI Assessment</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State Callout when no dataset is present */}
      {stats.totalPipelines === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-10 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Pipeline Data Available</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Upload historical pipeline data to begin AI risk assessment.
          </p>
          <button
            onClick={() => navigate('/pipeline-data')}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Pipeline Dataset</span>
          </button>
        </div>
      )}

      {/* STAT CARDS (5 Cards calculated dynamically) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Pipelines"
          value={stats.totalPipelines}
          subtext="Assessed Distribution Mains"
          icon={Layers}
          variant="blue"
          badgeText={stats.totalPipelines > 0 ? "Active Network" : "No Data"}
          onClick={() => navigate('/pipeline-data')}
        />
        <StatCard
          title="High Risk Pipelines"
          value={stats.highRiskPipelines}
          subtext="Critical Action Required"
          icon={AlertTriangle}
          variant="high"
          badgeText="Score 70–100"
          onClick={() => stats.totalPipelines > 0 && navigate('/ai-risk-prediction')}
        />
        <StatCard
          title="Medium Risk Pipelines"
          value={stats.mediumRiskPipelines}
          subtext="Preventive Monitoring"
          icon={AlertCircle}
          variant="medium"
          badgeText="Score 40–69"
          onClick={() => stats.totalPipelines > 0 && navigate('/ai-risk-prediction')}
        />
        <StatCard
          title="Low Risk Pipelines"
          value={stats.lowRiskPipelines}
          subtext="Stable Structural Condition"
          icon={CheckCircle2}
          variant="low"
          badgeText="Score 0–39"
          onClick={() => stats.totalPipelines > 0 && navigate('/ai-risk-prediction')}
        />
        <StatCard
          title="Average Pipeline Age"
          value={stats.totalPipelines > 0 ? `${stats.averageAge} yrs` : '—'}
          subtext="Mean Asset In-Service Age"
          icon={Clock}
          variant="default"
          badgeText={stats.totalPipelines > 0 ? "Lifespan Baseline" : null}
        />
      </div>

      {/* MUNICIPAL WORKFLOW & MAINTENANCE STATS (Active Work Orders, Pending Inspections, Overdue, Verifications) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => navigate('/work-orders')}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 cursor-pointer transition flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Active Work Orders
            </span>
            <span className="text-xl font-black text-blue-700 block mt-0.5">
              {workflowStats.openOrders}
            </span>
            <span className="text-[10px] text-slate-400">
              {workflowStats.pendingReviewOrders} awaiting engineer review
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => navigate('/inspections')}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-amber-300 cursor-pointer transition flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Field Inspections
            </span>
            <span className="text-xl font-black text-amber-700 block mt-0.5">
              {workflowStats.totalInspections}
            </span>
            <span className="text-[10px] text-slate-400">
              {workflowStats.pendingInspectionOrders} orders in progress
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <SearchCheck className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => navigate('/work-orders')}
          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-purple-300 cursor-pointer transition flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Awaiting Verification
            </span>
            <span className="text-xl font-black text-purple-700 block mt-0.5">
              {workflowStats.awaitingVerificationOrders}
            </span>
            <span className="text-[10px] text-slate-400">
              {workflowStats.completedOrders} certified & closed
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => navigate('/work-orders')}
          className={`border rounded-xl p-3.5 shadow-xs cursor-pointer transition flex items-center justify-between ${
            workflowStats.overdueOrders > 0
              ? 'bg-red-50/70 border-red-200 hover:border-red-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Overdue Orders
            </span>
            <span className={`text-xl font-black block mt-0.5 ${
              workflowStats.overdueOrders > 0 ? 'text-red-700' : 'text-slate-800'
            }`}>
              {workflowStats.overdueOrders}
            </span>
            <span className="text-[10px] text-slate-400">
              {workflowStats.overdueOrders > 0 ? 'Urgent compliance required' : 'All timelines current'}
            </span>
          </div>
          <div className={`p-2.5 rounded-lg ${
            workflowStats.overdueOrders > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* DATA PROVENANCE & FRESHNESS OVERVIEW */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Data Provenance & Freshness Baseline</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Verified breakdown of pipeline records across official GIS feeds and engineering field surveys
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/pipeline-data')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>View Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Official GIS Records */}
          <div
            onClick={() => navigate('/official-data-sources')}
            className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 hover:border-blue-300 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Official GIS Sources</span>
              <span className="text-lg font-black text-blue-900 block mt-0.5">{stats.officialPipelines || 0}</span>
              <span className="text-[10px] text-blue-600">MIDC & MCGM Feeds</span>
            </div>
            <ShieldCheck className="w-5 h-5 text-blue-600 opacity-80" />
          </div>

          {/* Engineer Verified */}
          <div
            onClick={() => navigate('/pipeline-data')}
            className="p-3 rounded-lg bg-teal-50/60 border border-teal-100 hover:border-teal-300 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Engineer Submitted</span>
              <span className="text-lg font-black text-teal-900 block mt-0.5">{stats.engineerPipelines || 0}</span>
              <span className="text-[10px] text-teal-600">Verified Field Surveys</span>
            </div>
            <HardHat className="w-5 h-5 text-teal-600 opacity-80" />
          </div>

          {/* Unclassified / Missing Attributes */}
          <div
            className="p-3 rounded-lg bg-slate-50/60 border border-slate-100 flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Unclassified</span>
              <span className="text-lg font-black text-slate-800 block mt-0.5">{stats.syntheticPipelines || 0}</span>
              <span className="text-[10px] text-slate-500">Pending Classification</span>
            </div>
            <AlertTriangle className="w-5 h-5 text-slate-400 opacity-80" />
          </div>

          {/* Data Freshness / Quality Health */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Missing Attributes</span>
              <span className={`text-lg font-black block mt-0.5 ${stats.missingDataPipelines > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                {stats.missingDataPipelines || 0}
              </span>
              <span className="text-[10px] text-slate-500">
                {stats.missingDataPipelines > 0 ? 'Lacks Year/Material/Coords' : 'All Attributes Complete'}
              </span>
            </div>
            <AlertTriangle className={`w-5 h-5 ${stats.missingDataPipelines > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
        </div>
      </div>

      {/* CHARTS GRID (Donut Chart + Scatter Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Donut Chart (5 cols) */}
        <div className="lg:col-span-5">
          <ChartCard
            title="Pipeline Risk Distribution"
            subtitle="Categorical breakdown of municipal water mains by vulnerability index"
          >
            {stats.totalPipelines > 0 ? (
              <>
                <div className="relative h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val, name) => [`${val} Pipelines (${Math.round((val / (stats.totalPipelines || 1)) * 100)}%)`, name]}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Total Count in Center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-800">{stats.totalPipelines}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pipelines</span>
                  </div>
                </div>

                {/* Custom Legend */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-red-50/70 border border-red-100 text-center">
                    <div className="flex items-center gap-1.5 font-bold text-red-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                      <span>High Risk</span>
                    </div>
                    <span className="text-base font-extrabold text-red-800 mt-0.5">{stats.highRiskPipelines}</span>
                    <span className="text-[10px] text-red-600">
                      {Math.round((stats.highRiskPipelines / (stats.totalPipelines || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50/70 border border-amber-100 text-center">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Medium</span>
                    </div>
                    <span className="text-base font-extrabold text-amber-800 mt-0.5">{stats.mediumRiskPipelines}</span>
                    <span className="text-[10px] text-amber-600">
                      {Math.round((stats.mediumRiskPipelines / (stats.totalPipelines || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-center">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Low Risk</span>
                    </div>
                    <span className="text-base font-extrabold text-emerald-800 mt-0.5">{stats.lowRiskPipelines}</span>
                    <span className="text-[10px] text-emerald-600">
                      {Math.round((stats.lowRiskPipelines / (stats.totalPipelines || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">Pipeline Risk Distribution</p>
                <p className="text-xs text-slate-500 mt-0.5">No assessment data available.</p>
              </div>
            )}
          </ChartCard>
        </div>

        {/* CHART 2: Scatter Chart (7 cols) */}
        <div className="lg:col-span-7">
          <ChartCard
            title="Pipeline Age vs Risk Score"
            subtitle="Scatter analysis showing correlation between in-service asset age and calculated risk index"
            action={
              stats.totalPipelines > 0 ? (
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600"/> High</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"/> Med</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Low</span>
                </div>
              ) : null
            }
          >
            {stats.totalPipelines > 0 ? (
              <>
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="age"
                        name="Pipeline Age"
                        unit=" yrs"
                        domain={[0, 'dataMax + 10']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        label={{
                          value: 'Pipeline Age (Years)',
                          position: 'insideBottom',
                          offset: -15,
                          fontSize: 12,
                          fill: '#475569',
                          fontWeight: 600
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="riskScore"
                        name="Risk Score"
                        unit=""
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        label={{
                          value: 'Risk Score (0–100)',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 12,
                          fontSize: 12,
                          fill: '#475569',
                          fontWeight: 600
                        }}
                      />
                      <ZAxis range={[60, 60]} />
                      <RechartsTooltip content={<CustomScatterTooltip />} />
                      <Scatter name="Pipelines" data={scatterData} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>Points cluster higher as age and degradation factors increase</span>
                  <span className="font-semibold text-blue-700">N = {scatterData.length} Points</span>
                </div>
              </>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">Pipeline Age vs Risk Score</p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                  No pipeline data available. Upload a dataset to generate predictions.
                </p>
                <button
                  onClick={() => navigate('/pipeline-data')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Dataset</span>
                </button>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* PRIORITY PIPELINES (Highest Risk First) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Priority Pipelines
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Urgent intervention queue sorted by descending risk severity
            </p>
          </div>
          {stats.totalPipelines > 0 && (
            <button
              onClick={() => navigate('/ai-risk-prediction')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 self-start sm:self-auto"
            >
              <span>View All {stats.totalPipelines} Pipelines</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Table or Empty State */}
        {stats.totalPipelines > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Pipeline ID</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityPipelines.map((item) => {
                  const score = item.Calculated_Risk_Score ?? (item.Risk_Level === 'HIGH' ? 88 : item.Risk_Level === 'MEDIUM' ? 52 : 22);
                  const level = item.Calculated_Risk_Level || item.Risk_Level || 'LOW';

                  return (
                    <tr
                      key={item.Pipeline_ID}
                      onClick={() => navigate(`/pipeline/${item.Pipeline_ID}`)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 font-bold text-blue-900">
                        {item.Pipeline_ID}
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-medium">
                        {item.Location}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.Age_Years} yrs
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.Material}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.Condition_Score} / 10
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="w-7">{score}</span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <RiskBadge level={level} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pipeline/${item.Pipeline_ID}`);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No pipeline assessment available.</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Upload historical pipeline data to evaluate network vulnerability and prioritize maintenance actions.
            </p>
            <button
              onClick={() => navigate('/pipeline-data')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Dataset</span>
            </button>
          </div>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            {stats.totalPipelines > 0
              ? 'Clicking any pipeline row opens its comprehensive technical Risk Details diagnostic.'
              : 'Upload a historical dataset to populate priority pipeline rankings.'}
          </span>
          <span className="font-medium text-slate-700">
            Assessment Timestamp: {assessmentTimestamp || 'Not assessed yet'}
          </span>
        </div>
      </div>
    </div>
  );
}
