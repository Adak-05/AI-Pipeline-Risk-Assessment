import React from 'react';

export default function RiskMeter({ score = 50, className = '' }) {
  const clampedScore = Math.min(100, Math.max(0, Number(score) || 0));

  let statusText = 'LOW RISK';
  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
  let pinColor = 'bg-emerald-600 ring-emerald-300';

  if (clampedScore >= 70) {
    statusText = 'HIGH RISK';
    statusColor = 'text-red-700 bg-red-50 border-red-300';
    pinColor = 'bg-red-600 ring-red-300';
  } else if (clampedScore >= 40) {
    statusText = 'MEDIUM RISK';
    statusColor = 'text-amber-700 bg-amber-50 border-amber-300';
    pinColor = 'bg-amber-600 ring-amber-300';
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Composite AI Risk Meter
          </span>
          <h4 className="text-base font-bold text-slate-800">
            Calculated Pipeline Vulnerability Index
          </h4>
        </div>
        <div className={`px-3 py-1 rounded-md text-xs font-bold border ${statusColor}`}>
          Score: {clampedScore} / 100 ({statusText})
        </div>
      </div>

      {/* Meter Bar */}
      <div className="relative pt-6 pb-2">
        {/* Needle / Pointer marker above bar */}
        <div
          className="absolute -top-1 transition-all duration-700 ease-out flex flex-col items-center"
          style={{ left: `calc(${clampedScore}% - 14px)` }}
        >
          <div className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded shadow">
            {clampedScore}
          </div>
          <div className={`w-3.5 h-3.5 rounded-full ring-4 ${pinColor} -mt-1 shadow`} />
        </div>

        {/* 3-Zone Segmented Track */}
        <div className="h-4 rounded-full overflow-hidden flex shadow-inner bg-slate-100 border border-slate-200">
          {/* Low Zone: 0-39% */}
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-white tracking-wide"
            style={{ width: '39%' }}
            title="Low Risk: 0-39"
          >
            LOW (0–39)
          </div>
          {/* Medium Zone: 40-69% (30% wide) */}
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white tracking-wide"
            style={{ width: '31%' }}
            title="Medium Risk: 40-69"
          >
            MEDIUM (40–69)
          </div>
          {/* High Zone: 70-100% (30% wide) */}
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-[10px] font-bold text-white tracking-wide"
            style={{ width: '30%' }}
            title="High Risk: 70-100"
          >
            HIGH (70–100)
          </div>
        </div>

        {/* Ticks and scale marks */}
        <div className="flex justify-between text-xs font-medium text-slate-500 mt-2 px-0.5">
          <span>0 (Min Risk)</span>
          <span className="text-center">39 | 40</span>
          <span className="text-center">69 | 70</span>
          <span>100 (Max Critical Risk)</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
        <span>Deterministic multi-feature degradation weighting</span>
        <span className="font-medium text-slate-700">Classification Threshold: 70+ Requires Immediate Work Order</span>
      </div>
    </div>
  );
}
