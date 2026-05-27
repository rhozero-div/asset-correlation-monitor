"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import SummaryTable from "@/components/SummaryTable";
import CorrelationHeatmap from "@/components/CorrelationHeatmap";
import RollingTimeSeries from "@/components/RollingTimeSeries";
import AnomalySignals from "@/components/AnomalySignals";
import InsightsPanel from "@/components/InsightsPanel";
import ForwardTable, { AssetRow } from "@/components/ForwardTable";
import FrontierPlot from "@/components/FrontierPlot";
import { Activity, GitBranch, RefreshCcw, TrendingUp, Globe, BarChart3, Banknote, Package, PieChart } from "lucide-react";
import clsx from "clsx";
import {
  fetchSummary, fetchRecentMatrix, fetchLongTermMatrix,
  fetchRollingCorrelation, fetchRollingVolatility,
  fetchAnomalies, fetchInsights, refreshData, computeFrontier,
  AssetGroup, Sensitivity
} from "@/lib/api";

import {
  SummaryStat, MatrixResponse, RollingResponse,
  AnomalySignal, InsightResponse, FrontierResponse
} from "@/lib/types";

type Tab = "overview" | "rolling" | "signals" | "frontier";

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
  const [sensitivity, setSensitivity] = useState<Sensitivity>("standard");

  const [rfRate, setRfRate] = useState(4.5);
  const [allowShort, setAllowShort] = useState(false);
  const [forwardRows, setForwardRows] = useState<AssetRow[]>([]);
  const [frontierData, setFrontierData] = useState<FrontierResponse | null>(null);
  const [computingFrontier, setComputingFrontier] = useState(false);

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
  const loadedRef = useRef({ group: activeGroup, sensitivity });

  const loadData = useCallback(async () => {
    const group = activeGroup;
    const sens = sensitivity;
    loadedRef.current = { group, sensitivity: sens };
    setLoading(true);
    try {
      const [sum, rec, lng, rCorr, rVol, anom, ins] = await Promise.all([
        fetchSummary(group),
        fetchRecentMatrix("fast", group),
        fetchLongTermMatrix("smooth", group),
        fetchRollingCorrelation(sens, group),
        fetchRollingVolatility(sens, group),
        fetchAnomalies(sens, group),
        fetchInsights(sens, group)
      ]);

      // Ignore stale responses from previous group/sensitivity
      const current = loadedRef.current;
      if (current.group !== group || current.sensitivity !== sens) return;

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
      if (current.group === group && current.sensitivity === sens) {
        setLoading(false);
      }
    }
  }, [activeGroup, sensitivity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync forward rows when summary changes
  useEffect(() => {
    if (data.summary.length > 0) {
      setForwardRows(data.summary.map(s => ({
        ticker: s.ticker,
        name: s.ticker, // Could be enriched with real names if available
        include: true,
        mu: s.cagr_all !== null ? parseFloat((s.cagr_all * 100).toFixed(2)) : 5.0,
        sigma: s.vol_all !== null ? parseFloat((s.vol_all * 100).toFixed(2)) : 15.0,
      })));
      setFrontierData(null);
    }
  }, [data.summary, activeGroup]);

  const handleAutoFill = () => {
    if (data.summary.length > 0) {
      setForwardRows(rows => rows.map(r => {
        const s = data.summary.find(x => x.ticker === r.ticker);
        return {
          ...r,
          mu: s?.cagr_all !== null && s?.cagr_all !== undefined ? parseFloat((s.cagr_all * 100).toFixed(2)) : r.mu,
          sigma: s?.vol_all !== null && s?.vol_all !== undefined ? parseFloat((s.vol_all * 100).toFixed(2)) : r.sigma,
        };
      }));
    }
  };

  const handleComputeFrontier = async () => {
    const included = forwardRows.filter(r => r.include);
    if (included.length < 2) return;
    
    setComputingFrontier(true);
    try {
      const res = await computeFrontier({
        tickers: included.map(r => r.ticker),
        mu: included.map(r => r.mu / 100.0), // convert back to decimal
        sigma: included.map(r => r.sigma / 100.0), // convert back to decimal
        rf: rfRate / 100.0,
        allowShort,
        nPoints: 100
      });
      setFrontierData(res);
      
    } catch (error) {
      console.error("Failed to compute frontier:", error);
    } finally {
      setComputingFrontier(false);
    }
  };

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
            <span className="text-sm text-gray-400">Sensitivity:</span>
            <select
              className="bg-transparent text-white text-sm outline-none cursor-pointer font-mono"
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value as Sensitivity)}
            >
              <option value="fast">Fast (Q=0.0001)</option>
              <option value="standard">Standard (Q=0.00005)</option>
              <option value="smooth">Smooth (Q=0.00001)</option>
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
          { id: "frontier", label: "Efficient Frontier", icon: PieChart },
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

            {activeTab === "frontier" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                    <ForwardTable 
                      rows={forwardRows} 
                      rfRate={rfRate}
                      allowShort={allowShort}
                      onRowsChange={setForwardRows}
                      onRfChange={setRfRate}
                      onAllowShortChange={setAllowShort}
                      onAutoFill={handleAutoFill}
                      onCompute={handleComputeFrontier}
                      computing={computingFrontier}
                    />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <FrontierPlot 
                      data={frontierData} 
                      customPortfolio={null}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
