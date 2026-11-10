import React, { useState } from 'react';
import { Bell, Menu, X, Droplets, AlertTriangle, LogOut, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { usePipelines } from '../context/PipelineContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ onToggleSidebar, isSidebarOpen }) {
  const { user, pipelines, stats, logout, clearDataset } = usePipelines();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the current dataset and assessment results?')) {
      clearDataset();
      setShowProfileMenu(false);
      navigate('/dashboard');
    }
  };

  const highRiskPipelines = pipelines.filter(
    (p) => (p.Calculated_Risk_Level || p.Risk_Level) === 'HIGH'
  );

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs h-16 flex items-center px-4 sm:px-6 justify-between">
      {/* Left side: Hamburger + Municipal Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-700 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                AI Pipeline Risk Assessment
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Municipal Water Distribution Infrastructure Risk Engine
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Alerts + Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Clear Dataset Action Button in Header if Data Exists */}
        {pipelines.length > 0 && (
          <button
            onClick={handleClear}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition"
            title="Clear dataset and assessment results"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Dataset</span>
          </button>
        )}

        {/* Quick High Risk Warning Pill */}
        {stats.highRiskPipelines > 0 && (
          <div
            onClick={() => navigate('/ai-risk-prediction')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold cursor-pointer hover:bg-red-100 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{stats.highRiskPipelines} High Risk Assets</span>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {stats.highRiskPipelines > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
              </>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-3 text-xs animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-sm">System Alerts</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  stats.highRiskPipelines > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'
                }`}>
                  {stats.highRiskPipelines > 0 ? `${stats.highRiskPipelines} Critical` : '0 Critical'}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pipelines.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">No active alerts</p>
                    <p className="text-[11px] mt-0.5">Upload a historical dataset to generate risk alerts and notifications.</p>
                  </div>
                ) : (
                  <>
                    {highRiskPipelines.slice(0, 3).map((p) => (
                      <div
                        key={p.Pipeline_ID}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate(`/pipeline/${p.Pipeline_ID}`);
                        }}
                        className="p-2 rounded-lg bg-red-50/70 border border-red-100 text-red-800 cursor-pointer hover:bg-red-100/60 transition"
                      >
                        <p className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span>Urgent Inspection: {p.Pipeline_ID}</span>
                        </p>
                        <p className="text-[11px] text-red-700 mt-0.5">
                          {p.Location} • Score: {p.Calculated_Risk_Score}/100 • Age: {p.Age_Years} yrs
                        </p>
                      </div>
                    ))}
                    <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-800">
                      <p className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Dataset Assessed</span>
                      </p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        {pipelines.length} municipal pipeline records validated and assessed.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {pipelines.length > 0 && (
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/recommendations');
                  }}
                  className="w-full mt-2.5 py-1.5 text-center text-blue-600 hover:text-blue-800 font-semibold border-t border-slate-100 pt-2 block"
                >
                  View All Maintenance Actions →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile Card / Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-blue-100">
              {user.avatar}
            </div>
            <div className="text-left hidden md:block leading-tight">
              <span className="block text-xs font-bold text-slate-800">{user.name}</span>
              <span className="block text-[11px] text-blue-600 font-semibold">{user.designation}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-3 text-xs animate-fadeIn">
              <div className="pb-2 mb-2 border-b border-slate-100">
                <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                <p className="text-slate-500">{user.role}</p>
                <p className="text-[11px] text-blue-700 font-semibold mt-1 bg-blue-50 px-2 py-0.5 rounded inline-block">
                  {user.department}
                </p>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/reports');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-left"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Executive Risk Reports</span>
                </button>

                {pipelines.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium text-left"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Clear Dataset</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold text-left border-t border-slate-100 mt-1 pt-2"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
