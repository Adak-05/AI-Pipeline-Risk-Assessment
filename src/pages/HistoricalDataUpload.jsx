import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Cpu,
  RefreshCw,
  Info,
  Check,
  XCircle,
  Database,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import WorkflowProgress from '../components/WorkflowProgress';
import DataTable from '../components/DataTable';

export default function HistoricalDataUpload() {
  const {
    pipelines,
    handleUploadCSV,
    validationResult,
    runAiAssessment,
    clearDataset,
    isLoading,
    isAssessed,
    dbSyncError
  } = usePipelines();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [uploadMessage, setUploadMessage] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setUploadMessage({
          type: 'warning',
          text: 'Excel file (.xlsx/.xls) detected. Please export or convert your spreadsheet to standard CSV format.'
        });
        return;
      }
      setUploadMessage({
        type: 'error',
        text: 'Unsupported file type. Please upload a structured CSV file.'
      });
      return;
    }

    setSelectedFileName(file.name);
    try {
      const res = await handleUploadCSV(file);
      if (res.isValid) {
        setUploadMessage({
          type: 'success',
          text: `Successfully uploaded and validated "${file.name}" (${res.stats.recordCount} records). AI Risk Assessment has evaluated all records.`
        });
      } else {
        setUploadMessage({
          type: 'error',
          text: `Validation failed for "${file.name}": ${res.errors.join(', ')}`
        });
      }
    } catch (err) {
      setUploadMessage({
        type: 'error',
        text: `Error reading file: ${err.message}`
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current dataset and assessment results?')) {
      clearDataset();
      setSelectedFileName(null);
      setUploadMessage({
        type: 'warning',
        text: 'Dataset and risk assessment results have been cleared.'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Run AI Risk Assessment and navigate
  const handleRunAssessment = async () => {
    await runAiAssessment();
    navigate('/ai-risk-prediction');
  };

  const stats = validationResult?.stats || {
    recordCount: pipelines.length,
    pipelineCount: pipelines.length,
    missingValues: 0,
    quality: pipelines.length > 0 ? 'Good' : '—',
    status: pipelines.length > 0 ? 'Assessed & Ready' : 'Awaiting Dataset Upload'
  };

  const checklist = validationResult?.checklist || [
    { label: 'Required columns verification', status: null, message: 'Awaiting CSV dataset upload' },
    { label: 'Pipeline records validation', status: null, message: 'No records loaded' },
    { label: 'Unique Pipeline IDs check', status: null, message: 'Awaiting dataset' },
    { label: 'Missing critical values check', status: null, message: 'Awaiting dataset' },
    { label: 'Dataset ready for AI Assessment', status: null, message: 'Upload a CSV to begin assessment' }
  ];

  const detectedColumns = validationResult?.detectedColumns || [];

  return (
    <div className="space-y-6">
      {/* Workflow Navigation Stepper */}
      <WorkflowProgress currentStep="data" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pipeline Registry
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Import and manage registered pipeline records. All imported data is validated and AI-assessed automatically.
          </p>
        </div>

        {pipelines.length > 0 && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg shadow-xs transition self-start sm:self-auto"
            title="Clear uploaded dataset"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Dataset</span>
          </button>
        )}
      </div>

      {dbSyncError && (
        <div className="p-3.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{dbSyncError}</span>
        </div>
      )}

      {uploadMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-semibold animate-fadeIn ${
            uploadMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : uploadMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {uploadMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : uploadMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Drag & Drop Area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all flex flex-col items-center justify-center bg-white ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-800">
              Drag & drop your pipeline dataset here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Upload municipal CSV data. The AI risk engine will validate parameters and compute failure vulnerability scores.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
              >
                Browse CSV Files
              </button>
            </div>

            <div className="mt-4 text-[11px] text-slate-400">
              Currently Loaded:{' '}
              {selectedFileName ? (
                <span className="font-semibold text-slate-700">{selectedFileName}</span>
              ) : (
                <span className="italic text-slate-400">No dataset loaded</span>
              )}
            </div>
          </div>

          {/* Dataset Status & Metrics Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Dataset Verification Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Records</span>
                <span className="text-lg font-black text-slate-800">{stats.recordCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Pipelines</span>
                <span className="text-lg font-black text-slate-800">{stats.pipelineCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Missing Values</span>
                <span className="text-lg font-black text-slate-800">{stats.missingValues}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block">Data Quality</span>
                <span className="text-base font-black text-emerald-800">{stats.quality}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                <span className="text-[11px] text-blue-700 block">Status</span>
                <span className="text-xs font-black text-blue-900 block truncate" title={stats.status}>
                  {stats.status}
                </span>
              </div>
            </div>

            {/* Detected Columns Display if Available */}
            {detectedColumns.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">
                  Detected Columns in File ({detectedColumns.length}):
                </span>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {detectedColumns.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium border border-blue-200"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {pipelines.length > 0
                  ? 'All records evaluated by AI risk engine. Ready to view predictions.'
                  : 'Upload historical data to calculate pipeline risk scores.'}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {pipelines.length > 0 && (
                  <button
                    onClick={handleRunAssessment}
                    disabled={isLoading || pipelines.length === 0}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold text-sm rounded-lg shadow-md transition transform active:scale-95 disabled:opacity-50"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>View AI Risk Predictions</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Required Columns Format & Data Validation Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Data Validation Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                Automated Data Validation
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  validationResult?.isValid
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-slate-600 bg-slate-100 border-slate-200'
                }`}
              >
                {validationResult?.isValid ? 'INTEGRITY VERIFIED' : 'AWAITING UPLOAD'}
              </span>
            </div>

            <div className="space-y-2.5">
              {checklist.map((item, idx) => {
                const isPassed = item.status === true;
                const isFailed = item.status === false;
                const isPending = item.status === null;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      isPassed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : isFailed
                        ? 'bg-red-50/60 border-red-200 text-red-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : isFailed ? (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold">{item.label}</span>
                      <p className="text-[11px] opacity-80 mt-0.5">{item.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {validationResult?.warnings?.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                <span className="font-bold block">Advisory Notes:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {validationResult.warnings.slice(0, 3).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Dataset Format Information Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Required Dataset Schema
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              The AI risk model extracts multi-dimensional parameters across 12 required engineering attributes:
            </p>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[
                'Pipeline ID',
                'Location',
                'Installation Year',
                'Pipeline Age',
                'Material',
                'Diameter (mm)',
                'Length (m)',
                'Previous Failures / Leaks',
                'Repair Count',
                'Operating Pressure',
                'Soil / Environmental Condition',
                'Condition Score'
              ].map((col) => (
                <span
                  key={col}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200/80"
                >
                  ✓ {col}
                </span>
              ))}
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
              Optional columns: <span className="font-semibold text-slate-700">Latitude, Longitude</span> (for Geospatial Risk Map display).
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {pipelines.length > 0 ? (
          <DataTable
            title="Registered Pipeline Records"
            pipelines={pipelines}
            onRowClick={(id) => navigate(`/pipeline/${id}`)}
            itemsPerPage={10}
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-4">
              <Database className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">No Registered Pipelines</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Import a CSV dataset above to register pipeline records and enable AI risk assessment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
