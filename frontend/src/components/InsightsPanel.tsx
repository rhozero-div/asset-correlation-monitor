import { InsightResponse } from "@/lib/types";
import { AlertTriangle, Lightbulb } from "lucide-react";

export default function InsightsPanel({ insights }: { insights: InsightResponse | null }) {
  if (!insights) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card border border-border/50">
        <div className="flex items-center gap-2 mb-4 text-accent-yellow">
          <AlertTriangle size={20} />
          <h3 className="text-xl font-semibold">Regime Notes</h3>
        </div>
        <ul className="space-y-3">
          {insights.regime_notes.map((note, idx) => (
            <li key={idx} className="text-gray-300 leading-relaxed bg-surface p-3 rounded-lg border border-border/30">
              {note}
            </li>
          ))}
        </ul>
      </div>

      <div className="card border border-border/50">
        <div className="flex items-center gap-2 mb-4 text-accent">
          <Lightbulb size={20} />
          <h3 className="text-xl font-semibold">Allocation Suggestions</h3>
        </div>
        <ul className="space-y-3">
          {insights.allocation_suggestions.map((sugg, idx) => (
            <li key={idx} className="text-gray-300 leading-relaxed bg-surface p-3 rounded-lg border border-border/30">
              {sugg}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
