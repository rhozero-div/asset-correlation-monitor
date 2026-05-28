import { SummaryStat } from "@/lib/types";
import { tickerDisplay, TICKER_DEFINITIONS } from "@/lib/labels";

export default function SummaryTable({ data }: { data: SummaryStat[] }) {
  const formatPct = (val: number | null) => {
    if (val === null) return "-";
    return (val * 100).toFixed(2) + "%";
  };

  return (
    <div className="card overflow-x-auto">
      <h3 className="text-xl font-semibold mb-4 text-accent">Performance & Risk Summary</h3>
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-400 uppercase bg-surface-light border-b border-border">
          <tr>
            <th className="px-4 py-3">Ticker</th>
            <th className="px-4 py-3">YTD</th>
            <th className="px-4 py-3">1 Year</th>
            <th className="px-4 py-3">3 Year</th>
            <th className="px-4 py-3">5 Year</th>
            <th className="px-4 py-3">All (CAGR)</th>
            <th className="px-4 py-3">Volatility</th>
            <th className="px-4 py-3">Max DD</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.ticker} className="border-b border-border/30 hover:bg-surface-light/50 transition-colors">
              <td className="px-4 py-3 font-medium text-white" title={TICKER_DEFINITIONS[row.ticker] ?? ""}>{tickerDisplay(row.ticker)}</td>
              <td className={`px-4 py-3 mono ${row.cagr_ytd && row.cagr_ytd >= 0 ? "text-accent" : "text-accent-red"}`}>
                {formatPct(row.cagr_ytd)}
              </td>
              <td className={`px-4 py-3 mono ${row.cagr_1y && row.cagr_1y >= 0 ? "text-accent" : "text-accent-red"}`}>
                {formatPct(row.cagr_1y)}
              </td>
              <td className={`px-4 py-3 mono ${row.cagr_3y && row.cagr_3y >= 0 ? "text-accent" : "text-accent-red"}`}>
                {formatPct(row.cagr_3y)}
              </td>
              <td className={`px-4 py-3 mono ${row.cagr_5y && row.cagr_5y >= 0 ? "text-accent" : "text-accent-red"}`}>
                {formatPct(row.cagr_5y)}
              </td>
              <td className={`px-4 py-3 mono ${row.cagr_all && row.cagr_all >= 0 ? "text-accent" : "text-accent-red"}`}>
                {formatPct(row.cagr_all)}
              </td>
              <td className="px-4 py-3 mono text-gray-300">{formatPct(row.vol_all)}</td>
              <td className="px-4 py-3 mono text-accent-red">{formatPct(row.max_dd_all)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
