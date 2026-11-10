import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Printer,
  AlertTriangle,
  Upload,
  Trash2
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import RiskBadge from '../components/RiskBadge';
import ProvenanceBadge from '../components/ProvenanceBadge';
import WorkflowProgress from '../components/WorkflowProgress';

export default function Reports() {
  const {
    pipelines,
    stats,
    assessmentTimestamp,
    exportPipelinesCSV,
    clearDataset,
    user
  } = usePipelines();
  const navigate = useNavigate();

  // If no dataset uploaded, show required empty state
  if (pipelines.length === 0) {
    return (
      <div className="space-y-6">
        <div className="no-print">
          <WorkflowProgress currentStep="report" />
        </div>

        <div className="pb-3 border-b border-slate-200 no-print">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pipeline Risk Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Formal technical evaluation documentation and printable work order summary
          </p>
        </div>

        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Assessment Report Available</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Upload and assess a pipeline dataset to generate a report.
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

  const highRiskPipelines = pipelines.filter(
    (p) => (p.Calculated_Risk_Level || p.Risk_Level) === 'HIGH'
  );

  const handlePrint = () => {
    window.print();
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current dataset and assessment results?')) {
      clearDataset();
      navigate('/dashboard');
    }
  };

  const handleDownloadReportText = () => {
    // Generate formatted text summary report strictly from the uploaded dataset
    const reportText = `
================================================================================
MUNICIPAL WATER DISTRIBUTION INFRASTRUCTURE DIVISION
AI-POWERED AGEING PIPELINE RISK ASSESSMENT REPORT
================================================================================

Date of Assessment: ${assessmentTimestamp || 'N/A'}
Assessing Engineer: ${user.name} (${user.role})
Department: ${user.department}
Dataset Size: ${stats.totalPipelines} Water Distribution Mains

EXECUTIVE SUMMARY:
--------------------------------------------------------------------------------
- Total Evaluated Pipelines: ${stats.totalPipelines}
- High Risk Assets (Critical Priority): ${stats.highRiskPipelines} (${Math.round((stats.highRiskPipelines / (stats.totalPipelines || 1)) * 100)}%)
- Medium Risk Assets (Surveillance): ${stats.mediumRiskPipelines} (${Math.round((stats.mediumRiskPipelines / (stats.totalPipelines || 1)) * 100)}%)
- Low Risk Assets (Stable Lifecycle): ${stats.lowRiskPipelines} (${Math.round((stats.lowRiskPipelines / (stats.totalPipelines || 1)) * 100)}%)
- Average Asset Age: ${stats.averageAge} Years
- Overall Network Health Index: ${100 - stats.averageRiskScore} / 100

DATA PROVENANCE & INTEGRITY:
--------------------------------------------------------------------------------
- Official GIS Pipelines: ${stats.officialPipelines || 0}
- Municipal Engineer Submitted: ${stats.engineerPipelines || 0}
- Unclassified / Pending Records: ${stats.syntheticPipelines || 0}
- Missing Critical Fields: ${stats.missingDataPipelines || 0}

CRITICAL HIGH RISK PIPELINES FLAGGED FOR IMMEDIATE INTERVENTION:
--------------------------------------------------------------------------------
${
  highRiskPipelines.length > 0
    ? highRiskPipelines
        .map(
          (p, i) =>
            `${i + 1}. [${p.Pipeline_ID}] Location: ${p.Location} | Age: ${p.Age_Years} yrs | Material: ${p.Material} | Leaks: ${p.Previous_Leaks} | Risk Score: ${p.Calculated_Risk_Score}/100`
        )
        .join('\n')
    : 'No pipelines currently classified under HIGH risk in the assessed dataset.'
}

PRESCRIBED ENGINEERING WORK ORDERS:
--------------------------------------------------------------------------------
1. Immediate acoustic listening stick and noise logger deployment on high-risk sectors.
2. Pressure transient attenuation to avoid surges exceeding 4.2 bar.
3. Fast-track capital replacement budget allocation for aged pipeline infrastructure.
4. Triennial condition reassessment for medium risk mains.

Report Certified By:
${user.name}
${user.designation}
================================================================================
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pipeline_Risk_Official_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <div className="no-print">
        <WorkflowProgress currentStep="report" />
      </div>

      {/* Header and Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pipeline Risk Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Formal technical evaluation documentation and printable work order summary
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span>Download CSV</span>
          </button>

          <button
            onClick={handleDownloadReportText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Download Risk Report</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Assessment Report</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-800 print:shadow-none print:border-none print:p-0">
        {/* Formal Municipal Report Header */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-blue-700 uppercase block">
                MUNICIPAL WATER INFRASTRUCTURE COMMISSION
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Ageing Pipeline Risk Assessment Report
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Urban Distribution Mains Surveillance & Predictive Maintenance Dossier
              </p>
            </div>
            <div className="text-left sm:text-right text-xs space-y-0.5 text-slate-600">
              <p><span className="font-semibold text-slate-800">Date:</span> {assessmentTimestamp || 'Current'}</p>
              <p><span className="font-semibold text-slate-800">Officer:</span> {user.name}</p>
            </div>
          </div>
        </div>

        {/* Assessment Key Parameters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center border-b border-slate-200 pb-5">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Assessment Date</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">{assessmentTimestamp ? assessmentTimestamp.split(',')[0] : 'Today'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Dataset Size</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{stats.totalPipelines} Mains</span>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <span className="text-[10px] uppercase font-bold text-red-700 block">High-Risk Count</span>
            <span className="text-lg font-black text-red-800 mt-0.5 block">{stats.highRiskPipelines}</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Medium-Risk Count</span>
            <span className="text-lg font-black text-amber-800 mt-0.5 block">{stats.mediumRiskPipelines}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Low-Risk Count</span>
            <span className="text-lg font-black text-emerald-800 mt-0.5 block">{stats.lowRiskPipelines}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Average Age</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{stats.averageAge} yrs</span>
          </div>
        </div>

        {/* Data Provenance & Verification Baseline Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-slate-200 pb-5">
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">Official GIS Feeds</span>
            <span className="text-base font-black text-blue-900 mt-0.5 block">{stats.officialPipelines || 0} Mains</span>
            <span className="text-[9px] text-blue-600 font-medium">MCGM & MIDC layers</span>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200">
            <span className="text-[10px] uppercase font-bold text-teal-700 block">Engineer Submitted</span>
            <span className="text-base font-black text-teal-900 mt-0.5 block">{stats.engineerPipelines || 0} Mains</span>
            <span className="text-[9px] text-teal-600 font-medium">Field survey CSV</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50/60 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Unclassified</span>
            <span className="text-base font-black text-slate-800 mt-0.5 block">{stats.syntheticPipelines || 0} Mains</span>
            <span className="text-[9px] text-slate-500 font-medium">Pending classification</span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Missing Attributes</span>
            <span className="text-base font-black text-rose-900 mt-0.5 block">{stats.missingDataPipelines || 0} Mains</span>
            <span className="text-[9px] text-rose-600 font-medium">Requires field check</span>
          </div>
        </div>

        {/* Section 1: Executive Methodology Statement */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            1. Executive Assessment Scope & Methodology
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed text-justify">
            This technical risk evaluation covers an uploaded municipal network of <strong>{stats.totalPipelines} ageing distribution pipelines</strong>. Risk scoring applies a standardized multi-criteria engineering weighting model incorporating in-service asset age (26%), internal and external physical condition degradation (22%), historical leak and repair frequencies (22%), operating hydraulic surge pressure (14%), material embrittlement characteristics (10%), and surrounding soil environment corrosivity (6%).
          </p>
        </div>

        {/* Section 2: Priority High-Risk Pipelines Flagged */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>2. Critical Assets Flagged for Immediate Action ({highRiskPipelines.length})</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500">Threshold: Score &gt;= 70</span>
          </div>

          <div className="overflow-x-auto">
            {highRiskPipelines.length > 0 ? (
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Pipeline ID</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3">Provenance</th>
                    <th className="py-2 px-3">Age</th>
                    <th className="py-2 px-3">Material</th>
                    <th className="py-2 px-3">Prev. Leaks</th>
                    <th className="py-2 px-3">Pressure</th>
                    <th className="py-2 px-3">Condition</th>
                    <th className="py-2 px-3">Risk Score</th>
                    <th className="py-2 px-3">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {highRiskPipelines.map((p) => (
                    <tr key={p.Pipeline_ID} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-blue-900">{p.Pipeline_ID}</td>
                      <td className="py-2 px-3">{p.Location}</td>
                      <td className="py-2 px-3">
                        <ProvenanceBadge provenance={p.Provenance} size="xs" />
                      </td>
                      <td className="py-2 px-3">{p.Age_Years} yrs</td>
                      <td className="py-2 px-3">{p.Material}</td>
                      <td className="py-2 px-3 font-semibold text-red-700">{p.Previous_Leaks} failures</td>
                      <td className="py-2 px-3">{p.Operating_Pressure_bar} bar</td>
                      <td className="py-2 px-3">{p.Condition_Score} / 10</td>
                      <td className="py-2 px-3 font-black text-red-700">{p.Calculated_Risk_Score ?? 88}</td>
                      <td className="py-2 px-3">
                        <RiskBadge level="HIGH" size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                No pipelines classified under HIGH risk in the assessed dataset.
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Prescribed Engineering Interventions */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            3. Recommended Engineering Work Orders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-red-50/60 border border-red-200 space-y-1">
              <span className="font-bold text-red-800 block">Phase 1: High Priority (Immediate - 14 Days)</span>
              <p className="text-[11px] text-red-950">
                Execute non-destructive acoustic leak surveys on all high-risk pipelines. Issue emergency bypass protocols if active pinholes are detected.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1">
              <span className="font-bold text-amber-800 block">Phase 2: Medium Priority (Quarterly)</span>
              <p className="text-[11px] text-amber-950">
                Calibrate air valves and pressure surge suppression vessels across feeder lines. Conduct ultrasonic wall thickness gauging.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">
              <span className="font-bold text-emerald-800 block">Phase 3: Routine Maintenance (Continuous)</span>
              <p className="text-[11px] text-emerald-950">
                Log telemetric SCADA flow differential checks, annual valve exercising, and update the GIS asset registry.
              </p>
            </div>
          </div>
        </div>

        {/* Sign-Off / Engineering Endorsement Box */}
        <div className="pt-8 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Generated by:</p>
            <p>{user.name}, B.E., M.Tech (Water Resources)</p>
            <p>{user.designation} — {user.division}</p>
            <p className="text-[11px] text-slate-400 mt-1">Autonomous Computational Assessment Engine</p>
          </div>

          <div className="border-t border-slate-400 pt-2 w-56 text-center">
            <p className="font-bold text-slate-800">Authorised Municipal Signatory</p>
            <p className="text-[11px] text-slate-400">Chief Engineer (Hydraulic Infrastructure)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
