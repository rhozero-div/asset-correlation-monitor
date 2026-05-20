"use client";

import { useState } from "react";
import { RollingResponse } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface Props {
  corrData: RollingResponse | null;
  volData: RollingResponse | null;
}

export default function RollingTimeSeries({ corrData, volData }: Props) {
  const [metric, setMetric] = useState<"correlation" | "volatility">("correlation");
  const [selectedKey, setSelectedKey] = useState<string>("");

  const dataToUse = metric === "correlation" ? corrData : volData;
  const keys = dataToUse ? Object.keys(dataToUse.data) : [];
  
  // Set default selection
  if (!selectedKey && keys.length > 0) {
    if (metric === "correlation" && keys.includes("VOO-TLT")) {
      setSelectedKey("VOO-TLT");
    } else {
      setSelectedKey(keys[0]);
    }
  }

  const handleMetricChange = (m: "correlation" | "volatility") => {
    setMetric(m);
    setSelectedKey(""); // will auto-select on next render
  };

  const chartData = (dataToUse && selectedKey && dataToUse.data[selectedKey]) || [];

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
          
          <select 
            className="input text-sm"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            {keys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[400px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickMargin={10}
                minTickGap={50}
              />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                domain={metric === "correlation" ? [-1, 1] : ['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#12121a', borderColor: '#2a2a3a', color: '#e5e5e5' }}
                itemStyle={{ color: '#00d4aa' }}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00d4aa" 
                strokeWidth={2}
                dot={false}
                name={selectedKey}
              />
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
