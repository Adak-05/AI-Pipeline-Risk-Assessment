import React from 'react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WORKFLOW_STEPS = [
  { id: 'data', label: 'Historical Data', path: '/pipeline-data' },
  { id: 'validation', label: 'Data Validation', path: '/pipeline-data' },
  { id: 'ai-analysis', label: 'AI Risk Analysis', path: '/ai-risk-prediction' },
  { id: 'score', label: 'Risk Score (0–100)', path: '/ai-risk-prediction' },
  { id: 'classification', label: 'Risk Classification', path: '/ai-risk-prediction' },
  { id: 'details', label: 'Risk Details', path: '/dashboard' },
  { id: 'maintenance', label: 'Maintenance Action', path: '/recommendations' },
  { id: 'report', label: 'Engineering Report', path: '/reports' },
];

export default function WorkflowProgress({ currentStep = 'ai-analysis', className = '' }) {
  const navigate = useNavigate();

  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            System Workflow Architecture
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 mt-1">
            End-to-End Pipeline Risk Assessment Methodology
          </h4>
        </div>
        <span className="text-[11px] text-slate-500">
          Step {Math.max(1, currentIndex + 1)} of {WORKFLOW_STEPS.length}
        </span>
      </div>

      {/* Horizontal Stepper */}
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center min-w-[700px] justify-between gap-1">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => navigate(step.path)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition select-none ${
                    isCurrent
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isCompleted
                      ? 'bg-blue-50 text-blue-800 font-semibold hover:bg-blue-100'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                  title={`Navigate to ${step.label}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                  )}
                  <span className="text-[11px] whitespace-nowrap">{step.label}</span>
                </div>

                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
