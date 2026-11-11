import React, { useMemo } from 'react';
import { History, SearchCheck, CheckCircle2, ClipboardList, Info } from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';

const ACTIVITY_CONFIG = {
  INSPECTION_SCHEDULED: {
    icon: SearchCheck,
    bg: 'bg-teal-50',
    color: 'text-teal-700',
    border: 'border-teal-200',
    label: 'Inspection Scheduled',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  FIELD_INSPECTION_COMPLETED: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Field Inspection Completed',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  INSPECTION_SUBMITTED: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Field Inspection Completed',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  WORK_ORDER_CREATED: {
    icon: ClipboardList,
    bg: 'bg-blue-50',
    color: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Work Order Created',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
  }
};

const ALLOWED_TYPES = new Set(['INSPECTION_SCHEDULED', 'FIELD_INSPECTION_COMPLETED', 'INSPECTION_SUBMITTED', 'WORK_ORDER_CREATED']);

export default function MaintenanceHistory() {
  const { maintenanceRecords } = useWorkflow();
  const [search, setSearch] = React.useState('');

  const filtered = useMemo(() => {
    const relevant = maintenanceRecords
      .filter(r => ALLOWED_TYPES.has(r.eventType))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!search.trim()) return relevant;
    const q = search.toLowerCase();
    return relevant.filter(r =>
      String(r.pipelineId || '').toLowerCase().includes(q) ||
      String(r.performedBy || '').toLowerCase().includes(q)
    );
  }, [maintenanceRecords, search]);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Maintenance History</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Chronological record of inspections, field visits and work orders
        </p>
      </div>

      {/* Activity counts */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: ['INSPECTION_SCHEDULED'], label: 'Scheduled', color: 'teal', icon: SearchCheck },
          { key: ['FIELD_INSPECTION_COMPLETED', 'INSPECTION_SUBMITTED'], label: 'Completed', color: 'emerald', icon: CheckCircle2 },
          { key: ['WORK_ORDER_CREATED'], label: 'Work Orders', color: 'blue', icon: ClipboardList }
        ].map(({ key, label, color, icon: Icon }) => {
          const count = maintenanceRecords.filter(r => key.includes(r.eventType)).length;
          return (
            <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 text-${color}-600 shrink-0`} />
              <div>
                <p className={`text-xs font-bold text-${color}-700 uppercase tracking-wide`}>{label}</p>
                <p className={`text-2xl font-black text-${color}-900`}>{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Log */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Activity Log</h3>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by Pipeline ID or Engineer..."
            className="text-xs pl-3 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 w-56"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No maintenance activity recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Activity will appear here as you schedule inspections, complete field visits and create work orders.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {filtered.map(record => {
              const cfg = ACTIVITY_CONFIG[record.eventType];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <li key={record.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 transition">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} border ${cfg.border}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                        {cfg.label}
                      </span>
                      {record.pipelineId && (
                        <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {record.pipelineId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{record.description || record.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {record.performedBy} · {formatDate(record.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Showing {filtered.length} maintenance activit{filtered.length !== 1 ? 'ies' : 'y'} · Newest first</span>
          </div>
        )}
      </div>
    </div>
  );
}
