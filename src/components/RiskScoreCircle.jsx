import React from 'react';

export default function RiskScoreCircle({
  score = 0,
  maxScore = 100,
  size = 200,
  strokeWidth = 14,
  label = 'AI Risk Score',
  sublabel = null
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const progress = (clampedScore / maxScore) * circumference;
  const strokeDashoffset = circumference - progress;

  // Determine color theme based on score thresholds
  let strokeColor = '#10b981'; // Green
  let badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let category = 'LOW RISK';

  if (clampedScore >= 70) {
    strokeColor = '#dc2626'; // Red
    badgeColor = 'text-red-700 bg-red-50 border-red-200';
    category = 'HIGH RISK';
  } else if (clampedScore >= 40) {
    strokeColor = '#f59e0b'; // Amber
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    category = 'MEDIUM RISK';
  }

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Colored progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span className="text-4xl font-extrabold tracking-tight text-slate-800">
            {clampedScore}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            out of {maxScore}
          </span>
          <div className={`mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}>
            {category}
          </div>
        </div>
      </div>

      {label && (
        <span className="mt-3 text-sm font-semibold text-slate-700 tracking-wide">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-xs text-slate-500 mt-0.5">
          {sublabel}
        </span>
      )}
    </div>
  );
}
