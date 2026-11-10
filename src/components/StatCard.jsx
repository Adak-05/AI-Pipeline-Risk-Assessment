import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  badgeText = null,
  onClick = null,
  className = ''
}) {
  const variantStyles = {
    default: {
      card: 'border-slate-200 bg-white hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700',
      valueColor: 'text-slate-900',
    },
    blue: {
      card: 'border-blue-100 bg-gradient-to-br from-white to-blue-50/40 hover:border-blue-200',
      iconBg: 'bg-blue-100 text-blue-700',
      valueColor: 'text-blue-950',
    },
    high: {
      card: 'border-red-200 bg-gradient-to-br from-white to-red-50/40 hover:border-red-300',
      iconBg: 'bg-red-100 text-red-700',
      valueColor: 'text-red-700',
    },
    medium: {
      card: 'border-amber-200 bg-gradient-to-br from-white to-amber-50/40 hover:border-amber-300',
      iconBg: 'bg-amber-100 text-amber-700',
      valueColor: 'text-amber-700',
    },
    low: {
      card: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 hover:border-emerald-300',
      iconBg: 'bg-emerald-100 text-emerald-700',
      valueColor: 'text-emerald-700',
    }
  }[variant] || variantStyles.default;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border p-5 shadow-sm transition-all duration-200 ${variantStyles.card} ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${variantStyles.valueColor}`}>
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`rounded-lg p-2.5 shadow-sm ${variantStyles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtext || badgeText) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>{subtext}</span>
          {badgeText && (
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
