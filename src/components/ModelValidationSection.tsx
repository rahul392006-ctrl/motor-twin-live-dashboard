import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ValidatedMetrics } from '../types/telemetry';

interface ModelValidationSectionProps {
  validatedMetrics?: ValidatedMetrics | null;
}

export const ModelValidationSection: React.FC<ModelValidationSectionProps> = ({
  validatedMetrics,
}) => {
  return (
    <div className="industrial-card p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
          SECTION 05
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
          Section 5 — Model Validation Status
        </h2>
      </div>

      {/* Prominent Formal Notice */}
      <div className="p-4 bg-amber-950/40 border border-amber-600/60 rounded-xl text-amber-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>⚠ FORMAL NOTICE</span>
        </div>
        <p className="text-xs text-amber-100 font-medium">
          Model validation is NOT performed by this dashboard.<br />
          Training/test separation, confusion matrices, and model performance
          must be evaluated using a separately validated model and appropriate
          test datasets.
        </p>
      </div>

      {validatedMetrics ? (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-emerald-400">
            ✅ Validated Confusion Matrix (from twin.py)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono border border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-[#0b132b] text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 text-left border-r border-slate-800">Model Classification</th>
                  <th className="py-2.5 px-4 border-r border-slate-800">Actual Anomaly (+)</th>
                  <th className="py-2.5 px-4">Actual Normal (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="py-2.5 px-4 text-left font-semibold text-slate-300 border-r border-slate-800">
                    Predicted Anomaly (+)
                  </td>
                  <td className="py-2.5 px-4 text-emerald-400 font-bold border-r border-slate-800">{validatedMetrics.tp}</td>
                  <td className="py-2.5 px-4 text-slate-400 font-bold">{validatedMetrics.fp}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-left font-semibold text-slate-300 border-r border-slate-800">
                    Predicted Normal (-)
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 font-bold border-r border-slate-800">{validatedMetrics.fn}</td>
                  <td className="py-2.5 px-4 text-emerald-400 font-bold">{validatedMetrics.tn}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Precision</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{validatedMetrics.p.toFixed(2)}</div>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Recall</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{validatedMetrics.r.toFixed(2)}</div>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">F1</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{validatedMetrics.f1.toFixed(2)}</div>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Accuracy</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {((validatedMetrics.tp + validatedMetrics.tn) / Math.max(1, validatedMetrics.test_n)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
            Placeholder Confusion Matrix (Unvalidated Baseline — Zero Weights)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono border border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-[#0b132b] text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 text-left border-r border-slate-800">Model Classification</th>
                  <th className="py-2.5 px-4 border-r border-slate-800">Actual Anomaly (+)</th>
                  <th className="py-2.5 px-4">Actual Normal (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="py-2.5 px-4 text-left font-semibold text-slate-300 border-r border-slate-800">
                    Predicted Anomaly (+)
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 font-bold border-r border-slate-800">0</td>
                  <td className="py-2.5 px-4 text-slate-500 font-bold">0</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-left font-semibold text-slate-300 border-r border-slate-800">
                    Predicted Normal (-)
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 font-bold border-r border-slate-800">0</td>
                  <td className="py-2.5 px-4 text-slate-500 font-bold">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Placeholder metric boxes all set to "—" */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Precision</div>
              <div className="text-2xl font-bold font-mono text-slate-400 mt-1">—</div>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Recall</div>
              <div className="text-2xl font-bold font-mono text-slate-400 mt-1">—</div>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">F1</div>
              <div className="text-2xl font-bold font-mono text-slate-400 mt-1">—</div>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Accuracy</div>
              <div className="text-2xl font-bold font-mono text-slate-400 mt-1">—</div>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic pt-1 leading-relaxed">
            "This dashboard displays live telemetry and twin residuals only.
            No classifier is trained or evaluated here. The placeholder matrix
            above will be populated by twin.py after a separately validated
            train/test procedure on recorded hardware runs. Until then, all
            values remain zero and no performance claim is made."
          </p>
        </div>
      )}
    </div>
  );
};
