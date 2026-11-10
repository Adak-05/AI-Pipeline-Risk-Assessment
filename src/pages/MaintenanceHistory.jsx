import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  History, Search, Calendar, RefreshCw, Filter
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';

const EVENT_TYPE_LABELS = {
  'WORK_ORDER_CREATED':   'Work Order Created',
  'STATUS_CHANGE':        'Status Change',
  'INSPECTION_SUBMITTED': 'Field Inspection',
  'RISK_REVIEW':          'Risk Review',
  'REPAIR_PROGRESS':      'Repair Progress',
  'VERIFICATION':         'Verification',
  'WORK_ORDER_CLOSED':    'Work Order Closed',
  'WORK_ORDER_REOPENED':  'Work Order Reopened',
};

const EVENT_BADGES = {
  'WORK_ORDER_CREATED':   'bg-blue-100 text-blue-800 border-blue-200',
  'STATUS_CHANGE':        'bg-indigo-100 text-indigo-800 border-indigo-200',
  'INSPECTION_SUBMITTED': 'bg-purple-100 text-purple-800 border-purple-200',
  'RISK_REVIEW':          'bg-amber-100 text-amber-800 border-amber-200',
  'REPAIR_PROGRESS':      'bg-orange-100 text-orange-800 border-orange-200',
  'VERIFICATION':         'bg-teal-100 text-teal-800 border-teal-200',
  'WORK_ORDER_CLOSED':    'bg-emerald-100 text-emerald-800 border-emerald-200',
  'WORK_ORDER_REOPENED':  'bg-red-100 text-red-800 border-red-200',
};

export default function MaintenanceHistory() {
  const { pipelines } = usePipelines();
  const { maintenanceRecords, loadWorkflowData, workflowLoading } = useWorkflow();
  const [searchParams, setSearchParams] = useSearchParams();

  const activePipelineFilter = searchParams.get('pipelineId') || 'ALL';
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [engineerFilter, setEngineerFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const engineers = useMemo(() => {
    const set = new Set(maintenanceRecords.map(r => r.performedBy).filter(Boolean));
    return Array.from(set).sort();
  }, [maintenanceRecords]);

  const filteredLogs = useMemo(() => {
    return maintenanceRecords.filter(entry => {
      const matchPipeline = activePipelineFilter === 'ALL' || entry.pipelineId === activePipelineFilter;
      const matchType = eventTypeFilter === 'ALL' || entry.eventType === eventTypeFilter;
      const matchEngineer = !engineerFilter || (entry.performedBy || '').toLowerCase().includes(engineerFilter.toLowerCase());
      const matchSearch = !searchTerm ||
        entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.pipelineId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.performedBy?.toLowerCase().includes(searchTerm.toLowerCase());
      const entryDate = entry.createdAt ? new Date(entry.createdAt) : null;
      const matchFrom = !fromDate || (entryDate && entryDate >= new Date(fromDate));
      const matchTo = !toDate || (entryDate && entryDate <= new Date(toDate + 'T23:59:59'));
      return matchPipeline && matchType && matchEngineer && matchSearch && matchFrom && matchTo;
    });
  }, [maintenanceRecords, activePipelineFilter, eventTypeFilter, engineerFilter, searchTerm, fromDate, toDate]);

  const hasActiveFilters = activePipelineFilter !== 'ALL' || eventTypeFilter !== 'ALL' || engineerFilter || searchTerm || fromDate || toDate;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Maintenance History</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Chronological audit log of all inspections, repairs, verifications, and closures
          </p>
        </div>
        <button
          onClick={() => loadWorkflowData()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${workflowLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              id="mh-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search records..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* Maintenance Type */}
          <select
            id="mh-filter-type"
            value={eventTypeFilter}
            onChange={e => setEventTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          >
            <option value="ALL">All Types</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {/* Pipeline filter */}
          <select
            id="mh-filter-pipeline"
            value={activePipelineFilter}
            onChange={e => {
              const val = e.target.value;
              if (val === 'ALL') { searchParams.delete('pipelineId'); setSearchParams(searchParams); }
              else setSearchParams({ pipelineId: val });
            }}
            className="border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          >
            <option value="ALL">All Pipelines</option>
            {pipelines.map(p => (
              <option key={p.Pipeline_ID} value={p.Pipeline_ID}>{p.Pipeline_ID} — {p.Location}</option>
            ))}
          </select>
          {/* Engineer filter */}
          <input
            id="mh-filter-engineer"
            value={engineerFilter}
            onChange={e => setEngineerFilter(e.target.value)}
            placeholder="Filter by engineer..."
            className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
          />
        </div>
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs border-t border-slate-100 pt-2.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-600">Date Range:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">From</span>
            <input
              id="mh-from-date"
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">To</span>
            <input
              id="mh-to-date"
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFromDate(''); setToDate(''); setEngineerFilter('');
                setSearchTerm(''); setEventTypeFilter('ALL');
                searchParams.delete('pipelineId'); setSearchParams(searchParams);
              }}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {maintenanceRecords.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-4">
              <History className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No Maintenance History</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {pipelines.length === 0
                ? 'Upload pipeline data and create work orders to generate maintenance history.'
                : 'As engineers submit inspections, repairs, and verifications, records will appear here.'}
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold text-slate-600">No records match the current filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pipeline ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Maintenance Type</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 whitespace-nowrap">Engineer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Work Order</th>
                  <th className="py-3 px-4 whitespace-nowrap">Recorded Cost</th>
                  <th className="py-3 px-4 whitespace-nowrap">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                      {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-900 whitespace-nowrap">{log.pipelineId}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${EVENT_BADGES[log.eventType] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {EVENT_TYPE_LABELS[log.eventType] || log.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[260px]">
                      <p className="font-semibold text-slate-800 text-[11px] truncate">{log.title}</p>
                      {log.description && (
                        <p className="text-slate-500 text-[10px] truncate mt-0.5">{log.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{log.performedBy || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {log.workOrderId || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {log.cost != null ? `₹${Number(log.cost).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                        {log.source || 'System'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
              Showing {filteredLogs.length} of {maintenanceRecords.length} records
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
