import { AnomalySignal } from "@/lib/types";

export default function AnomalySignals({ signals }: { signals: AnomalySignal[] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="card overflow-x-auto">
      <h3 className="text-xl font-semibold mb-4 text-accent">Anomaly Signals (Z-Score)</h3>
      <p className="text-sm text-gray-400 mb-4">
        Detects pairs where current correlation significantly deviates from their long-term historical mean.
      </p>
      
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-surface-light border-b border-border">
          <tr>
            <th className="px-4 py-3">Pair</th>
            <th className="px-4 py-3">Current Corr</th>
            <th className="px-4 py-3">Long-term Mean</th>
            <th className="px-4 py-3">Z-Score</th>
            <th className="px-4 py-3">Signal</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((sig) => {
            let badgeClass = "bg-gray-800 text-gray-300";
            if (sig.signal === "Alert") badgeClass = "bg-accent-red/20 text-accent-red border border-accent-red/30";
            else if (sig.signal === "Warning") badgeClass = "bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/30";

            return (
              <tr key={sig.pair} className="border-b border-border/30 hover:bg-surface-light/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{sig.pair}</td>
                <td className="px-4 py-3 mono">{sig.current_corr.toFixed(3)}</td>
                <td className="px-4 py-3 mono text-gray-400">{sig.mean_corr.toFixed(3)}</td>
                <td className="px-4 py-3 mono font-medium">{sig.z_score.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${badgeClass}`}>{sig.signal}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
