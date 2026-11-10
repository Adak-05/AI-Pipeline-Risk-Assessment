import React from 'react';

export default function ChartCard({
  title,
  subtitle,
  children,
  action = null,
  className = ''
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
