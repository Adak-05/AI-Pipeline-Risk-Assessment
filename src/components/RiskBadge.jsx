import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RiskBadge({ level = 'LOW', size = 'md', showIcon = true, className = '' }) {
  const norm = String(level).toUpperCase();

  const config = {
    HIGH: {
      bg: 'bg-red-50 text-red-700 border-red-200 ring-red-500/10',
      dot: 'bg-red-600',
      icon: AlertTriangle,
      label: 'HIGH RISK'
    },
    MEDIUM: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10',
      dot: 'bg-amber-500',
      icon: AlertCircle,
      label: 'MEDIUM RISK'
    },
    LOW: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
      dot: 'bg-emerald-600',
      icon: CheckCircle2,
      label: 'LOW RISK'
    }
  }[norm] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10',
    dot: 'bg-slate-500',
    icon: AlertCircle,
    label: norm
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2'
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ring-1 ${config.bg} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {showIcon && <IconComponent className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
}
