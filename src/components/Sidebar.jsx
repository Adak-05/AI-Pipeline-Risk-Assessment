import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Cpu,
  MapPin,
  Wrench,
  FileText,
  Activity,
  ClipboardList,
  SearchCheck,
  History,
  Info,
  PencilLine
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';

export default function Sidebar({ isOpen, onClose }) {
  const { stats, isAssessed } = usePipelines();
  const { workflowStats } = useWorkflow();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      to: '/pipeline-data',
      label: 'Pipeline Registry',
      icon: Database,
      badge: stats.totalPipelines > 0 ? `${stats.totalPipelines}` : null
    },
    {
      to: '/update-pipeline',
      label: 'Update Pipeline Registry',
      icon: PencilLine,
      badge: null
    },
    {
      to: '/ai-risk-prediction',
      label: 'AI Risk Prediction',
      icon: Cpu,
      badge: stats.totalPipelines > 0 ? (isAssessed ? 'Active' : 'Pending') : null
    },
    {
      to: '/risk-map',
      label: 'Risk Map',
      icon: MapPin,
      badge: null
    },
    {
      to: '/recommendations',
      label: 'Maintenance Recommendations',
      icon: Wrench,
      badge: stats.highRiskPipelines > 0 ? `${stats.highRiskPipelines} High` : null,
      badgeColor: 'bg-red-100 text-red-700'
    },
    {
      to: '/work-orders',
      label: 'Work Orders Queue',
      icon: ClipboardList,
      badge: workflowStats?.openOrders > 0 ? `${workflowStats.openOrders} Open` : null,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      to: '/inspections',
      label: 'Field Inspections',
      icon: SearchCheck,
      badge: workflowStats?.totalInspections > 0 ? `${workflowStats.totalInspections}` : null
    },
    {
      to: '/maintenance-history',
      label: 'Maintenance Audit Log',
      icon: History,
      badge: null
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: FileText,
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-base">
              🚰
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-sm block">
                MUNICIPAL WATER
              </span>
              <span className="text-[10px] tracking-wider text-blue-400 font-semibold uppercase block">
                Risk Engine Platform
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Demonstration Architecture Box */}
          <div className="mt-8 px-3 pt-4 border-t border-slate-800">
            <div className="rounded-lg bg-slate-800/60 p-3 text-[11px] text-slate-300 space-y-2 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
                <Activity className="w-3.5 h-3.5" />
                <span>Assessment Pipeline</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Data Upload → Parametric Verification → Feature Weighting → Risk Score (0-100) → Work Orders
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-700/50 flex items-center justify-between">
                <span>Dataset: {stats.totalPipelines} Mains</span>
                <span className={stats.totalPipelines > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {stats.totalPipelines === 0 ? 'Empty' : isAssessed ? 'Assessed' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / System Note */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-tight text-slate-400">
              AI-Powered Municipal Water Distribution Asset Surveillance System.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
