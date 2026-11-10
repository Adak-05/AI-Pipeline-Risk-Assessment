import React from 'react';
import { ShieldCheck, HardHat, FlaskConical, HelpCircle } from 'lucide-react';

/**
 * Visual indicator identifying the verified provenance of a pipeline record.
 * Distinguishes Official GIS Sources, Engineer-Submitted records, and Synthetic Demo data.
 */
export default function ProvenanceBadge({
  provenance = 'ENGINEER_SUBMITTED',
  sourceName = null,
  size = 'md',
  showIcon = true,
  className = ''
}) {
  const norm = String(provenance || 'UNVERIFIED').toUpperCase();

  const configs = {
    OFFICIAL_SOURCE: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200 ring-blue-500/10',
      dot: 'bg-blue-600',
      icon: ShieldCheck,
      label: 'Official Source',
      title: 'Verified official municipal or industrial GIS record'
    },
    ENGINEER_SUBMITTED: {
      bg: 'bg-teal-50 text-teal-800 border-teal-200 ring-teal-500/10',
      dot: 'bg-teal-600',
      icon: HardHat,
      label: 'Engineer Submitted',
      title: 'Submitted and verified by authorized municipal engineer'
    },
    SYNTHETIC_DEMO: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/10',
      dot: 'bg-amber-600',
      icon: FlaskConical,
      label: 'Synthetic / Demo',
      title: 'Explicitly labeled demonstration data — not verified infrastructure'
    },
    UNVERIFIED: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10',
      dot: 'bg-slate-500',
      icon: HelpCircle,
      label: 'Unknown / Unverified',
      title: 'Source origin has not been cryptographically or officially verified'
    }
  };

  const config = configs[norm] || configs.UNVERIFIED;
  const IconComp = config.icon;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3 py-1.5 gap-2'
  }[size] || 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      title={config.title}
      className={`inline-flex items-center rounded-full border shadow-xs ring-1 font-medium ${config.bg} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showIcon && <IconComp className={size === 'xs' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
      {sourceName && norm === 'OFFICIAL_SOURCE' && (
        <span className="text-[10px] opacity-75 font-normal ml-0.5 hidden sm:inline">
          ({sourceName.includes('MIDC') ? 'MIDC' : sourceName.includes('MCGM') ? 'MCGM' : sourceName})
        </span>
      )}
    </span>
  );
}
