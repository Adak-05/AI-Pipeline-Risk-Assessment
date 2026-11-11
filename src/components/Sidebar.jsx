import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Cpu,
  Wrench,
  ClipboardList,
  SearchCheck,
  History,
  PencilLine,
  LogOut,
  User
} from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useWorkflow } from '../context/WorkflowContext';

export default function Sidebar({ isOpen, onClose }) {
  const { stats, isAssessed, user, logout } = usePipelines();
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
      to: '/ai-risk-prediction',
      label: 'AI Risk Prediction',
      icon: Cpu,
      badge: stats.totalPipelines > 0 ? (isAssessed ? 'Active' : 'Pending') : null
    },
    {
      to: '/recommendations',
      label: 'Maintenance Recommendation',
      icon: Wrench,
      badge: stats.highRiskPipelines > 0 ? `${stats.highRiskPipelines} High` : null,
      badgeColor: 'bg-red-100 text-red-700'
    },
    {
      to: '/inspections',
      label: 'Field Inspection',
      icon: SearchCheck,
      badge: workflowStats?.totalInspections > 0 ? `${workflowStats.totalInspections}` : null
    },
    {
      to: '/work-orders',
      label: 'Work Orders',
      icon: ClipboardList,
      badge: workflowStats?.openOrders > 0 ? `${workflowStats.openOrders} Open` : null,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      to: '/maintenance-history',
      label: 'Maintenance History',
      icon: History,
      badge: null
    },
    {
      to: '/update-pipeline',
      label: 'Update Pipeline Registry',
      icon: PencilLine,
      badge: null
    }
  ];

  const handleLogout = async () => {
    if (window.confirm('Sign out of the application?')) {
      await logout();
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'EN';

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
        <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-base shrink-0">
              🚰
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-sm block leading-tight">
                MUNICIPAL WATER
              </span>
              <span className="text-[10px] tracking-wider text-blue-400 font-semibold uppercase block">
                Pipeline Risk System
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Navigation
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
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      item.badgeColor || 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Profile + Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Engineer'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
