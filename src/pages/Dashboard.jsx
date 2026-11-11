import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardList,
  SearchCheck,
  ArrowRight,
  Activity
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';

function StatCard({ label, value, sub, color, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-5 shadow-xs flex items-center justify-between gap-4 ${onClick ? 'cursor-pointer hover:shadow-sm transition' : ''} ${color.border}`}
    >
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${color.label}`}>{label}</p>
        <p className={`text-3xl font-black ${color.value}`}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color.icon}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, isAssessed, user } = usePipelines();
  const { maintenanceRecords, workOrders, inspections } = useWorkflow();

  // Build recent activity from real records (newest first, limit 10)
  const recentActivity = useMemo(() => {
    const activities = [];

    // From maintenance records
    maintenanceRecords.forEach(rec => {
      let icon = Activity;
      let color = 'text-blue-600';
      let bg = 'bg-blue-50';
      let label = '';
      let desc = '';

      if (rec.eventType === 'INSPECTION_SCHEDULED') {
        icon = SearchCheck;
        color = 'text-teal-700';
        bg = 'bg-teal-50';
        label = 'Inspection Scheduled';
        desc = rec.description || `Pipeline ${rec.pipelineId}`;
      } else if (rec.eventType === 'INSPECTION_SUBMITTED' || rec.eventType === 'FIELD_INSPECTION_COMPLETED') {
        icon = CheckCircle2;
        color = 'text-emerald-700';
        bg = 'bg-emerald-50';
        label = 'Field Inspection Completed';
        desc = rec.description || `Pipeline ${rec.pipelineId}`;
      } else if (rec.eventType === 'WORK_ORDER_CREATED') {
        icon = ClipboardList;
        color = 'text-blue-700';
        bg = 'bg-blue-50';
        label = 'Work Order Created';
        desc = rec.description || `Pipeline ${rec.pipelineId}`;
      } else {
        return; // Skip other event types
      }

      activities.push({
        id: rec.id,
        icon,
        color,
        bg,
        label,
        pipelineId: rec.pipelineId,
        desc,
        engineer: rec.performedBy,
        date: rec.createdAt
      });
    });

    // Sort newest first
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    return activities.slice(0, 10);
  }, [maintenanceRecords]);

  const cards = [
    {
      label: 'Total Registered Pipelines',
      value: stats.totalPipelines,
      sub: stats.totalPipelines === 0 ? 'Upload a CSV to register pipelines' : `${stats.totalPipelines} pipeline${stats.totalPipelines !== 1 ? 's' : ''} registered`,
      color: { border: 'border-slate-200', label: 'text-slate-600', value: 'text-slate-900', icon: 'bg-slate-100 text-slate-600' },
      icon: Layers,
      onClick: () => navigate('/pipeline-data')
    },
    {
      label: 'High-Risk Pipelines',
      value: isAssessed ? stats.highRiskPipelines : '—',
      sub: isAssessed ? 'Requires immediate action' : 'Run AI prediction first',
      color: { border: 'border-red-100', label: 'text-red-700', value: 'text-red-800', icon: 'bg-red-50 text-red-600' },
      icon: AlertTriangle,
      onClick: isAssessed ? () => navigate('/recommendations') : null
    },
    {
      label: 'Medium-Risk Pipelines',
      value: isAssessed ? stats.mediumRiskPipelines : '—',
      sub: isAssessed ? 'Requires monitoring' : 'Run AI prediction first',
      color: { border: 'border-amber-100', label: 'text-amber-700', value: 'text-amber-800', icon: 'bg-amber-50 text-amber-600' },
      icon: Clock,
      onClick: isAssessed ? () => navigate('/recommendations') : null
    },
    {
      label: 'Low-Risk Pipelines',
      value: isAssessed ? stats.lowRiskPipelines : '—',
      sub: isAssessed ? 'Routine surveillance' : 'Run AI prediction first',
      color: { border: 'border-emerald-100', label: 'text-emerald-700', value: 'text-emerald-800', icon: 'bg-emerald-50 text-emerald-600' },
      icon: CheckCircle2,
      onClick: isAssessed ? () => navigate('/ai-risk-prediction') : null
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back{user?.name ? `, ${user.name}` : ''}. Here is your pipeline network overview.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      {!isAssessed && stats.totalPipelines === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-blue-900">Get started: Upload Pipeline Data</h3>
            <p className="text-xs text-blue-700 mt-1">
              Upload a CSV file of pipeline records to begin the risk assessment workflow.
            </p>
          </div>
          <button
            onClick={() => navigate('/pipeline-data')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shrink-0"
          >
            <span>Upload Pipeline CSV</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest inspection, work order and scheduling events</p>
          </div>
          {recentActivity.length > 0 && (
            <button
              onClick={() => navigate('/maintenance-history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentActivity.length === 0 ? (
          <div className="py-14 text-center">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No activity yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Activity will appear here as you schedule inspections, complete field visits and create work orders.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {recentActivity.map(act => {
              const Icon = act.icon;
              const dateStr = act.date
                ? new Date(act.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '';
              return (
                <li key={act.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${act.bg}`}>
                    <Icon className={`w-4 h-4 ${act.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${act.bg} ${act.color}`}>
                        {act.label}
                      </span>
                      {act.pipelineId && (
                        <span className="text-[10px] font-mono font-bold text-slate-600">{act.pipelineId}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{act.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {act.engineer} · {dateStr}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
