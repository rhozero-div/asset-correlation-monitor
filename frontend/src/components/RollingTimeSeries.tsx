"use client";

import { useState, useMemo } from "react";
import { RollingResponse } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface Props {
  corrData: RollingResponse | null;
  volData: RollingResponse | null;
  tickers: string[];
}

const COLORS = [
  "#00d4aa", "#ff6b6b", "#ffd93d", "#6c5ce7", "#a8e6cf",
  "#ff8a5c", "#74b9ff", "#fd79a8", "#00b894", "#e17055",
  "#0984e3", "#fdcb6e", "#00cec9", "#e84393", "#636e72",
  "#d63031", "#2d3436", "#dfe6e9", "#6c5ce7", "#00b894",
];

function pairsForBase(allKeys: string[], tickers: string[], base: string): string[] {
  const pairSet = new Set<string>();
  for (const t of tickers) {
    if (t === base) continue;
    const key1 = `${base}-${t}`;
    const key2 = `${t}-${base}`;
    if (allKeys.includes(key1)) pairSet.add(key1);
    if (allKeys.includes(key2)) pairSet.add(key2);
  }
  return Array.from(pairSet);
}

type ChartRow = Record<string, string | number | null>;

function mergeSeries(seriesMap: Record<string, { date: string; value: number }[]>): ChartRow[] {
  const dateMap = new Map<string, Record<string, number | null>>();

  for (const [key, points] of Object.entries(seriesMap)) {
    for (const { date, value } of points) {
      if (!dateMap.has(date)) {
        dateMap.set(date, {});
      }
      dateMap.get(date)![key] = value;
    }
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  return sortedDates.map(date => ({
    date,
    ...dateMap.get(date)!
  }));
}

export default function RollingTimeSeries({ corrData, volData, tickers }: Props) {
  const [metric, setMetric] = useState<"correlation" | "volatility">("correlation");
  const [baseAsset, setBaseAsset] = useState<string>("");

  const dataToUse = metric === "correlation" ? corrData : volData;

  if (!baseAsset && tickers.length > 0) {
    setBaseAsset(tickers[0]);
  }

  const allKeys = useMemo(() => {
    return dataToUse ? Object.keys(dataToUse.data) : [];
  }, [dataToUse]);

  const displayKeys = useMemo(() => {
    if (metric === "correlation" && baseAsset) {
      return pairsForBase(allKeys, tickers, baseAsset);
    }
    return allKeys;
  }, [metric, baseAsset, allKeys, tickers]);

  const chartData = useMemo(() => {
    if (!dataToUse || displayKeys.length === 0) return [];
    const seriesMap: Record<string, { date: string; value: number }[]> = {};
    for (const key of displayKeys) {
      if (dataToUse.data[key]) {
        seriesMap[key] = dataToUse.data[key];
      }
    }
    return mergeSeries(seriesMap);
  }, [dataToUse, displayKeys]);

  const handleMetricChange = (m: "correlation" | "volatility") => {
    setMetric(m);
    setBaseAsset("");
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-semibold text-accent">Rolling Time Series</h3>

        <div className="flex gap-4">
          <select
            className="input text-sm"
            value={metric}
            onChange={(e) => handleMetricChange(e.target.value as "correlation" | "volatility")}
          >
            <option value="correlation">Rolling Correlation</option>
            <option value="volatility">Rolling Volatility</option>
          </select>

          {metric === "correlation" && (
            <select
              className="input text-sm"
              value={baseAsset}
              onChange={(e) => setBaseAsset(e.target.value)}
            >
              {tickers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {metric === "correlation" && baseAsset && (
        <p className="text-xs text-gray-500 mb-4">
          Correlation vs <span className="text-accent font-medium">{baseAsset}</span>
        </p>
      )}

      <div className="h-[400px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickMargin={10}
                minTickGap={50}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                domain={metric === "correlation" ? [-1, 1] : ["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
                labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {displayKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={key}
                />
              ))}
              {metric === "correlation" && (
                <Line
                  type="monotone"
                  dataKey={() => 0}
                  stroke="#ff6b6b"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  name="Zero Line"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
