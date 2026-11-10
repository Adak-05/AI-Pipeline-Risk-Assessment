import React, { useState, useRef } from 'react';
import {
  FlaskConical,
  Upload,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Download,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePipelines } from '../context/PipelineContext';
import { parseCSVFile } from '../utils/csvParser';
import { enrichPipelinesWithRisk } from '../utils/riskEngine';
import { persistPipelinesToDb, clearSyntheticDemoData } from '../lib/pipelineService';

export default function DemoImport() {
  const { user, session, pipelines, loadPipelinesFromDb } = usePipelines();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Count active synthetic records
  const syntheticCount = pipelines.filter(
    (p) => p.Is_Synthetic || p.Provenance === 'SYNTHETIC_DEMO'
  ).length;

  // Handle Demo CSV Upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadResult(null);

    try {
      const parsed = await parseCSVFile(file);
      if (!parsed.isValid || !parsed.data || parsed.data.length === 0) {
        setErrorMessage(parsed.errors?.join('; ') || 'Invalid CSV format or empty file.');
        return;
      }

      // Explicitly tag every record as SYNTHETIC DEMO
      const taggedRows = parsed.data.map((row) => ({
        ...row,
        Provenance: 'SYNTHETIC_DEMO',
        Is_Synthetic: true,
        Source_Type: 'synthetic_demo',
        Source_Name: 'Synthetic Demo Upload',
        Data_Freshness_Label: 'Demonstration Only'
      }));

      // Enrich with risk scores
      const scored = enrichPipelinesWithRisk(taggedRows);

      console.log("SESSION:", session);
console.log("IS DEMO:", session?.isDemo);
console.log("USER ID:", session?.user?.id);
console.log("RECORDS TO SAVE:", scored.length);

      // Persist to Supabase if session active
      let savedCount = scored.length;
      if (session && !session.isDemo && session.user?.id) {
        const persistRes = await persistPipelinesToDb(scored, session.user.id);
        if (!persistRes.success) {
          setErrorMessage(`Database notice: ${persistRes.error}`);
        } else {
          savedCount = persistRes.count;
        }
      }

      setUploadResult({
        count: scored.length,
        savedToDb: savedCount,
        skipped: parsed.data.length - savedCount
      });

      if (loadPipelinesFromDb) {
        await loadPipelinesFromDb();
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Clear Demo Records
  const handleClearDemo = async () => {
    if (!isAdmin) {
      alert('Forbidden: Only Administrators have permission to delete synthetic demonstration records.');
      return;
    }

    setIsClearing(true);
    setClearResult(null);
    setErrorMessage(null);

    try {
      const res = await clearSyntheticDemoData();
      if (!res.success) {
        setErrorMessage(`Failed to clear demo data: ${res.error}`);
      } else {
        setClearResult({ deleted: res.count });
        if (loadPipelinesFromDb) {
          await loadPipelinesFromDb();
        }
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsClearing(false);
      setShowConfirmModal(false);
    }
  };

  // Download Sample Demo Template CSV
  const downloadSampleDemoCSV = () => {
    const csvContent =
      'Pipeline_ID,Location,Material,Diameter_mm,Length_m,Installation_Year,Inspection_Year,Previous_Leaks,Repair_Count,Operating_Pressure_bar,Soil_Type,Condition_Score,Latitude,Longitude\n' +
      'DEMO-PL-101,Andheri East Sector 4,Cast Iron,450,850,1978,2023,4,3,4.2,Clay,3.5,19.1136,72.8697\n' +
      'DEMO-PL-102,Bandra West Hill Road,Ductile Iron,600,1200,2005,2024,1,0,3.8,Sandy Loam,7.8,19.0596,72.8295\n' +
      'DEMO-PL-103,Kurla Industrial Main,Mild Steel,500,620,1984,2022,5,4,5.0,Saline Coastal,2.9,19.0726,72.8845\n' +
      'DEMO-PL-104,Dadar Central Distribution,Prestressed Concrete,750,1500,1992,2024,2,1,3.5,Loam,6.2,19.0178,72.8478\n' +
      'DEMO-PL-105,Chembur Colony Spur,HDPE,300,450,2016,2024,0,0,3.0,Sandy Loam,8.9,19.0622,72.8994\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'synthetic_pipeline_demo_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Synthetic Demonstration Mode
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Isolated Demo Environment</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Safely test and evaluate predictive models using explicitly labeled synthetic datasets
          </p>
        </div>

        <button
          onClick={downloadSampleDemoCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample Demo CSV</span>
        </button>
      </div>

      {/* Prominent Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold text-sm">Synthetic Data Disclaimer & Strict Separation</p>
          <p>
            All records imported via this tool are explicitly flagged as <span className="font-mono font-semibold bg-amber-100 px-1 rounded">SYNTHETIC_DEMO</span> with <span className="font-mono font-semibold bg-amber-100 px-1 rounded">is_synthetic = true</span>.
            They are clearly visually distinguished across all risk maps, tables, work orders, and printable reports.
          </p>
          <p className="text-amber-800 font-medium">
            Synthetic data is strictly prohibited from being utilized for official municipal capital budget allocations or statutory safety certifications.
          </p>
        </div>
      </div>

      {/* Success / Error Messages */}
      {uploadResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Successfully ingested <strong>{uploadResult.count}</strong> synthetic demo records into the system
              ({uploadResult.savedToDb} saved to database).
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
          >
            <span>View on Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {clearResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>
            Demonstration cleanup complete: <strong>{clearResult.deleted}</strong> synthetic demo records were permanently removed from the database.
            Official GIS and engineer records remain completely untouched.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold">Dismiss</button>
        </div>
      )}

      {/* Two Column Actions: Upload Demo vs Admin Cleanup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upload Synthetic File Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <Upload className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold">Import Synthetic Demo Dataset</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Upload a CSV file containing simulated pipe infrastructure records.
            </p>

            <div className="mt-4 border-2 border-dashed border-amber-200 bg-amber-50/30 rounded-xl p-6 text-center">
              <FlaskConical className="w-8 h-8 text-amber-600 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-800">
                Select CSV file for demonstration
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Will be tagged as Synthetic Demo data automatically
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="demo-file-input"
              />
              <label
                htmlFor="demo-file-input"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Validating & Uploading...' : 'Choose Demo CSV File'}</span>
              </label>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Requires Pipeline_ID, Material, Installation_Year, etc.</span>
            <span className="text-amber-700 font-semibold">Demo Tagged</span>
          </div>
        </div>

        {/* Admin Clear Demo Data Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Trash2 className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold">Administrator Demo Purge</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Admin Exclusive
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Safely clear all synthetic demonstration records from the active database.
            </p>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Active Synthetic Records:</span>
                <span className="font-bold text-slate-900 text-sm">{syntheticCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Official GIS Records:</span>
                <span className="font-semibold text-emerald-700">Protected (Untouched)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Engineer Submitted Records:</span>
                <span className="font-semibold text-teal-700">Protected (Untouched)</span>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Purge queries strictly target <span className="font-mono text-red-700">is_synthetic = true</span>.
                Official infrastructure records will never be affected.
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Your Role: <strong className="text-slate-700 uppercase">{user?.role || 'Viewer'}</strong>
            </span>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={syntheticCount === 0 || !isAdmin || isClearing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isClearing ? 'Clearing...' : 'Clear Demo Records'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Confirm Synthetic Data Purge
            </h3>
            <p className="text-xs text-slate-600 text-center mt-2">
              Are you sure you want to permanently delete all <strong>{syntheticCount}</strong> synthetic demonstration records from the active database?
            </p>

            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-200">
              <p className="font-semibold text-slate-800">Safety Guarantee:</p>
              <p>• Only records with <span className="font-mono text-red-700">is_synthetic = true</span> will be deleted.</p>
              <p>• All official GIS data and engineer-verified inspection records remain safely in the database.</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isClearing}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleClearDemo}
                disabled={isClearing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Purging...' : 'Yes, Delete Synthetic Records'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
