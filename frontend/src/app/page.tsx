"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import SummaryTable from "@/components/SummaryTable";
import CorrelationHeatmap from "@/components/CorrelationHeatmap";
import RollingTimeSeries from "@/components/RollingTimeSeries";
import AnomalySignals from "@/components/AnomalySignals";
import InsightsPanel from "@/components/InsightsPanel";
import { Activity, GitBranch, RefreshCcw, TrendingUp, Globe, BarChart3, Banknote, Package } from "lucide-react";
import clsx from "clsx";
import { 
  fetchSummary, fetchRecentMatrix, fetchLongTermMatrix, 
  fetchRollingCorrelation, fetchRollingVolatility, 
  fetchAnomalies, fetchInsights, refreshData,
  AssetGroup
} from "@/lib/api";

import { 
  SummaryStat, MatrixResponse, RollingResponse, 
  AnomalySignal, InsightResponse 
} from "@/lib/types";

type Tab = "overview" | "rolling" | "signals";

interface GroupConfig {
  id: AssetGroup;
  label: string;
  icon: React.ReactNode;
}

const GROUPS: GroupConfig[] = [
  { id: "macro", label: "Macro", icon: <Globe size={16} /> },
  { id: "equities", label: "Equities", icon: <BarChart3 size={16} /> },
  { id: "fixed_income", label: "Fixed Income", icon: <Banknote size={16} /> },
  { id: "commodities_alts", label: "Commodities", icon: <Package size={16} /> },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeGroup, setActiveGroup] = useState<AssetGroup>("macro");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [windowSize, setWindowSize] = useState(120);
  
  const [data, setData] = useState<{
    summary: SummaryStat[];
    recentMatrix: MatrixResponse | null;
    longTermMatrix: MatrixResponse | null;
    rollingCorr: RollingResponse | null;
    rollingVol: RollingResponse | null;
    anomalies: AnomalySignal[];
    insights: InsightResponse | null;
  }>({
    summary: [],
    recentMatrix: null,
    longTermMatrix: null,
    rollingCorr: null,
    rollingVol: null,
    anomalies: [],
    insights: null
  });

  // Track the latest params to ignore stale Promise resolves
  const loadedRef = useRef({ group: activeGroup, window: windowSize });

  const loadData = useCallback(async () => {
    const group = activeGroup;
    const win = windowSize;
    loadedRef.current = { group, window: win };
    setLoading(true);
    try {
      const [sum, rec, lng, rCorr, rVol, anom, ins] = await Promise.all([
        fetchSummary(group),
        fetchRecentMatrix(win, group),
        fetchLongTermMatrix(group),
        fetchRollingCorrelation(win, group),
        fetchRollingVolatility(60, group),
        fetchAnomalies(win, group),
        fetchInsights(win, group)
      ]);
      
      // Ignore stale responses from previous group/window
      const current = loadedRef.current;
      if (current.group !== group || current.window !== win) return;
      
      setData({
        summary: sum,
        recentMatrix: rec,
        longTermMatrix: lng,
        rollingCorr: rCorr,
        rollingVol: rVol,
        anomalies: anom,
        insights: ins
      });
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      const current = loadedRef.current;
      if (current.group === group && current.window === win) {
        setLoading(false);
      }
    }
  }, [activeGroup, windowSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGroupChange = (group: AssetGroup) => {
    if (group !== activeGroup) {
      setActiveGroup(group);
      setActiveTab("overview");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      await loadData();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <Activity className="text-accent" />
            Asset Correlation Monitor
          </h1>
          <p className="text-gray-400">Macro asset allocation analysis & anomaly detection</p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface p-2 rounded-xl border border-border">
          <div className="flex items-center gap-2 px-2">
            <span className="text-sm text-gray-400">Window:</span>
            <select 
              className="bg-transparent text-white text-sm outline-none cursor-pointer font-mono"
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
            >
              <option value={60}>60 Days</option>
              <option value={120}>120 Days</option>
              <option value={252}>252 Days</option>
            </select>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCcw size={16} className={clsx(refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Update Data"}
          </button>
        </div>
      </div>

      {/* Group Navigation (Tier 1) */}
      <div className="flex space-x-1 border-b border-border/50">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => handleGroupChange(g.id as AssetGroup)}
            className={clsx(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeGroup === g.id
                ? "border-accent text-accent"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
            )}
          >
            {g.icon}
            {g.label}
          </button>
        ))}
      </div>

      {/* View Tabs (Tier 2) */}
      <div className="flex space-x-1 border-b border-border/50">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "rolling", label: "Time Series", icon: TrendingUp },
          { id: "signals", label: "Insights & Signals", icon: GitBranch },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={clsx(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <RefreshCcw className="animate-spin text-accent" size={32} />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <SummaryTable data={data.summary} />
                <CorrelationHeatmap recent={data.recentMatrix} longTerm={data.longTermMatrix} />
              </div>
            )}
            
            {activeTab === "rolling" && (
              <div className="space-y-6">
                <RollingTimeSeries
                  key={activeGroup}
                  corrData={data.rollingCorr}
                  volData={data.rollingVol}
                  tickers={data.summary.map(s => s.ticker)}
                />
              </div>
            )}
            
            {activeTab === "signals" && (
              <div className="space-y-6">
                <InsightsPanel insights={data.insights} />
                <AnomalySignals signals={data.anomalies} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
