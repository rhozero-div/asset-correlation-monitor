"use client";

import { useState, useEffect } from "react";
import { tickerDisplay, TICKER_DEFINITIONS } from "@/lib/labels";

interface Props {
  tickers: string[];
  onPlot: (weights: Record<string, number>) => void;
  computing?: boolean;
}

export default function CustomPortfolio({ tickers, onPlot, computing = false }: Props) {
  const n = tickers.length;
  const [weights, setWeights] = useState<number[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  // Initialize or reset weights when tickers change
  useEffect(() => {
    setWeights(tickers.map(() => parseFloat((100 / (n || 1)).toFixed(1))));
  }, [tickers, n]);

  if (tickers.length === 0) return null;

  const total = weights.reduce((s, v) => s + (v || 0), 0);
  const isValid = Math.abs(total - 100) < 0.1;

  const setWeight = (idx: number, val: number) => {
    const next = [...weights];
    next[idx] = val;
    setWeights(next);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-accent">Custom Portfolio</h3>
        <span className={`text-sm font-mono font-medium ${isValid ? "text-green-400" : "text-red-400"}`}>
          {isValid ? `Total: ${total.toFixed(1)}%` : `Total: ${total.toFixed(1)}% (must be 100%)`}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tickers.map((t, i) => (
          <div key={t}
            className="flex items-center justify-between bg-surface/80 rounded-lg px-3 py-2 border border-border"
          >
            <span
              className="text-sm font-mono text-white font-medium relative cursor-default"
              onMouseEnter={() => setHovered(t)}
              onMouseLeave={() => setHovered(null)}
            >
              {tickerDisplay(t)}
              {hovered === t && (
                <span className="absolute left-0 top-full z-20 mt-1 px-3 py-1.5 rounded-lg text-xs font-normal whitespace-nowrap bg-gray-900 border border-border text-gray-200 shadow-lg pointer-events-none">
                  {TICKER_DEFINITIONS[t] ?? t}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number" step="1" min="-100" max="200"
                value={weights[i] === undefined ? "" : weights[i]}
                onChange={(e) => setWeight(i, parseFloat(e.target.value) || 0)}
                className="w-16 text-right text-sm bg-transparent outline-none text-white font-mono border-b border-transparent focus:border-accent transition-colors"
              />
              <span className="text-gray-400 text-sm">%</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary w-full"
        disabled={!isValid || computing}
        onClick={() => {
          const wts: Record<string, number> = {};
          tickers.forEach((t, i) => { wts[t] = weights[i]; });
          onPlot(wts);
        }}
      >
        {computing ? "Computing..." : "Plot Your Portfolio on Frontier"}
      </button>
    </div>
  );
}
