"use client";

import React from "react";
import { tickerDisplay } from "@/lib/labels";

export interface AssetRow {
  ticker: string;
  name?: string;
  include: boolean;
  mu: number;
  sigma: number;
}

interface Props {
  rows: AssetRow[];
  rfRate: number;
  allowShort: boolean;
  onRowsChange: (rows: AssetRow[]) => void;
  onRfChange: (rf: number) => void;
  onAllowShortChange: (allow: boolean) => void;
  onAutoFill: () => void;
  onSaveDefaults: () => void;
  onCompute: () => void;
  computing: boolean;
  usingSavedDefaults: boolean;
}

export default function ForwardTable({
  rows, rfRate, allowShort, onRowsChange, onRfChange, onAllowShortChange, onAutoFill, onSaveDefaults, onCompute, computing, usingSavedDefaults
}: Props) {
  const updateRow = (idx: number, patch: Partial<AssetRow>) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    onRowsChange(next);
  };

  const includedRows = rows.filter((r) => r.include);
  const canCompute = includedRows.length >= 2 && !computing;
  const excludedCount = rows.length - includedRows.length;

  return (
    <div className="card space-y-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-accent">Forward Estimates</h3>
          {usingSavedDefaults ? (
            <span className="px-2 py-0.5 rounded text-xs bg-accent/20 text-accent border border-accent/30">Using Saved Defaults</span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400 border border-gray-700">Using Historical Averages</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button 
              onClick={onAutoFill} 
              className="text-xs font-medium text-gray-300 hover:text-white transition-colors bg-surface/80 border border-border/50 px-2 py-1.5 rounded"
            >
              Auto-fill History
            </button>
            <button 
              onClick={onSaveDefaults} 
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors bg-accent/10 border border-accent/20 px-2 py-1.5 rounded"
            >
              💾 Save as My Defaults
            </button>
          </div>
          
          <label className="flex items-center gap-2 text-sm text-gray-300">
            Allow Shorting:
            <input
              type="checkbox"
              checked={allowShort}
              onChange={(e) => onAllowShortChange(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
          </label>
          
          <label className="flex items-center gap-2 text-sm text-gray-300 bg-surface/50 border border-border/50 px-3 py-1.5 rounded">
            Risk-Free Rate (%):
            <input
              type="number" step="0.1" min="0" max="20"
              value={rfRate}
              onChange={(e) => onRfChange(parseFloat(e.target.value) || 0)}
              className="w-16 text-right bg-transparent text-white font-mono outline-none"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-border">
              <th className="py-2 pr-4 font-medium">Ticker</th>
              <th className="py-2 pr-4 font-medium text-center">Include</th>
              <th className="py-2 pr-4 font-medium text-right">Expected Return μ (%)</th>
              <th className="py-2 font-medium text-right">Expected Volatility σ (%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.ticker} className="border-b border-border/30 hover:bg-surface/50 transition-colors">
                <td className="py-2.5 pr-4 font-mono font-medium text-white">{tickerDisplay(row.ticker)}</td>
                <td className="py-2.5 pr-4 text-center">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateRow(idx, { include: e.target.checked })}
                    className="accent-accent w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <input
                    type="number" step="0.1"
                    value={row.mu}
                    onChange={(e) => updateRow(idx, { mu: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-right text-white bg-transparent border border-border/50 rounded px-2 py-1.5 focus:border-accent font-mono transition-colors outline-none"
                    disabled={!row.include}
                  />
                </td>
                <td className="py-2.5 text-right">
                  <input
                    type="number" step="0.1" min="0.1"
                    value={row.sigma}
                    onChange={(e) => updateRow(idx, { sigma: parseFloat(e.target.value) || 0.1 })}
                    className="w-24 text-right text-white bg-transparent border border-border/50 rounded px-2 py-1.5 focus:border-accent font-mono transition-colors outline-none"
                    disabled={!row.include}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-gray-500">
          {includedRows.length} assets included {excludedCount > 0 ? `(${excludedCount} excluded)` : ''}
        </span>
        
        <div className="flex items-center gap-3">
          {!canCompute && !computing && (
            <span className="text-xs text-red-400">At least 2 assets must be included.</span>
          )}
          <button
            className="btn btn-primary"
            disabled={!canCompute}
            onClick={onCompute}
          >
            {computing ? "Computing..." : "Compute Efficient Frontier"}
          </button>
        </div>
      </div>
    </div>
  );
}
