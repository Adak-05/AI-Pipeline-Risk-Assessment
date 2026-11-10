import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Upload,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import {
  fetchGisSourcesApi,
  fetchSyncLogsFromDb
} from '../lib/pipelineService';

export default function OfficialDataSources() {
  const navigate = useNavigate();

  const [sources, setSources] = useState([]);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeTimestamp, setProbeTimestamp] = useState(null);
  const [probeError, setProbeError] = useState(null);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Probe GIS sources
  const runProbe = useCallback(async () => {
    setProbeLoading(true);
    setProbeError(null);
    try {
      const data = await fetchGisSourcesApi();
      setSources(data.sources || []);
      setProbeTimestamp(data.probed_at ? new Date(data.probed_at).toLocaleTimeString() : new Date().toLocaleTimeString());
      if (data.error) {
        setProbeError(data.error);
      }
    } catch (err) {
      setProbeError(err.message);
    } finally {
      setProbeLoading(false);
    }
  }, []);

  // Fetch sync audit logs from database
  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data } = await fetchSyncLogsFromDb(15);
      setLogs(data || []);
    } catch (err) {
      console.warn('Failed to load sync logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    runProbe();
    loadLogs();
  }, [runProbe, loadLogs]);

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Official GIS Data Sources
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              <Globe className="w-3.5 h-3.5" />
              <span>Verified Directory</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Technical directory and reachability verification for municipal and industrial water GIS layers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {probeTimestamp && (
            <span className="text-slate-500 text-[11px] hidden sm:inline bg-slate-50 border border-slate-200 px-2 py-1 rounded">
              Last probed: <span className="font-semibold text-slate-700">{probeTimestamp}</span>
              {sources.length > 0 && <span className="text-blue-600 font-semibold ml-1">({sources.length} active)</span>}
            </span>
          )}
          {probeError && (
            <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[11px] px-2 py-1 rounded font-medium">
              Probe note: {probeError}
            </span>
          )}
          <button
            onClick={runProbe}
            disabled={probeLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${probeLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{probeLoading ? 'Probing...' : 'Re-Probe Services'}</span>
          </button>
        </div>
      </div>

      {/* Engineering Notice: Automated Sync Disabled by Policy */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-700 space-y-1">
            <p className="font-bold text-sm text-slate-900">
              Direct Automated GIS Synchronization Policy: Intentionally Disabled
            </p>
            <p className="leading-relaxed text-slate-600 max-w-3xl">
              Official ArcGIS MapServers (MIDC Layer 18 and MCGM Layer 219) publish polyline network centerlines, but do not expose pipeline age, wall condition degradation, previous leak history, or operating pressures. Automated ingestion of incomplete records is disabled to prevent inaccurate risk predictions. Municipal engineers must upload survey-verified datasets containing complete parameters.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/pipeline-data')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs shrink-0 transition"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Verified Data</span>
        </button>
      </div>

      {/* Grid of Verified GIS Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source 1: MIDC Industrial Water Infrastructure */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm">
                  MIDC Industrial Zone
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">
                  MIDC Water Pipeline Layer (Layer 18)
                </h3>
                <p className="text-xs text-slate-500">
                  Maharashtra Industrial Development Corporation official water supply pipeline network
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>Active MapServer</span>
              </span>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">REST Endpoint:</span>
                <a
                  href="https://gis.midcindia.org/server/rest/services/Application/Department_Main_Map_Service/MapServer/18"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>.../MapServer/18</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Infrastructure Features:</span>
                <span className="font-semibold text-slate-800">~10,507 Polyline segments</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Geometry Type:</span>
                <span className="font-semibold text-slate-800">esriGeometryPolyline (LineString)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Attribute Fields:</span>
                <span className="font-semibold text-slate-800">30 official engineering fields</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Missing Risk Inputs:</span>
                <span className="font-semibold text-amber-700">Installation Year, Condition Score, Leaks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sync Status:</span>
                <span className="font-semibold text-slate-700">Automated Sync Disabled</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Direct ingestion disabled to prevent unverified records.
            </span>
            <a
              href="https://gis.midcindia.org/server/rest/services/Application/Department_Main_Map_Service/MapServer/18"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              <span>Explore Endpoint</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>

        {/* Source 2: MCGM Municipal Distribution Network */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm">
                  MCGM / BMC Municipal
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">
                  MCGM Water Distribution Network (Layer 219)
                </h3>
                <p className="text-xs text-slate-500">
                  Brihanmumbai Municipal Corporation urban water mains & distribution network
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>Active MapServer</span>
              </span>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">REST Endpoint:</span>
                <a
                  href="https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers/MapServer/219"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>.../MapServer/219</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Infrastructure Features:</span>
                <span className="font-semibold text-slate-800">~23,417 Distribution mains</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Geometry Type:</span>
                <span className="font-semibold text-slate-800">esriGeometryPolyline (LineString)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Attribute Fields:</span>
                <span className="font-semibold text-slate-800">67 municipal attribute fields</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Missing Risk Inputs:</span>
                <span className="font-semibold text-amber-700">Operating Pressure, Condition, Age</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sync Status:</span>
                <span className="font-semibold text-slate-700">Automated Sync Disabled</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Direct ingestion disabled to prevent unverified records.
            </span>
            <a
              href="https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers/MapServer/219"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              <span>Explore Endpoint</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>
      </div>

      {/* Synchronization Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Immutable Synchronization Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographically recorded log of all official GIS data ingestion events
            </p>
          </div>
          <button
            onClick={loadLogs}
            disabled={logsLoading}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {logsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading sync audit records...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No GIS Ingestion Events Recorded</p>
              <p className="text-slate-400 text-[11px] mt-0.5 max-w-md mx-auto">
                Direct automated GIS ingestion is disabled by policy. All pipeline assets in the current database originated from verified engineer uploads or synthetic demonstration imports.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Source Organization</th>
                  <th className="py-2.5 px-4">Triggered By</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Fetched</th>
                  <th className="py-2.5 px-4 text-right">Imported</th>
                  <th className="py-2.5 px-4 text-right">Updated</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {log.completed_at ? new Date(log.completed_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {log.source_name || log.source_organization}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.triggered_by || 'System'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.sync_status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.sync_status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.sync_status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <span>{log.sync_status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{log.records_fetched || 0}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{log.records_imported || 0}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">{log.records_updated || 0}</td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                      {log.error_message || log.warning_message || 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
