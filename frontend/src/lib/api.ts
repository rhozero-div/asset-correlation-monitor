import { 
  RefreshResponse, SummaryStat, RollingResponse, 
  MatrixResponse, AnomalySignal, InsightResponse,
  FrontierRequest, FrontierResponse
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8012/api/v1/analysis";

export type AssetGroup = "all" | "macro" | "equities" | "fixed_income" | "commodities_alts";
export type Sensitivity = "fast" | "standard" | "smooth";

export async function refreshData(): Promise<RefreshResponse> {
  const res = await fetch(`${API_BASE}/refresh`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to refresh data");
  return res.json();
}

export async function fetchSummary(group: AssetGroup = "macro"): Promise<SummaryStat[]> {
  const res = await fetch(`${API_BASE}/summary?group=${group}`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function fetchRollingCorrelation(sensitivity: Sensitivity = "standard", group: AssetGroup = "macro"): Promise<RollingResponse> {
  const res = await fetch(`${API_BASE}/rolling/correlation?sensitivity=${sensitivity}&group=${group}`);
  if (!res.ok) throw new Error("Failed to fetch rolling correlation");
  return res.json();
}

export async function fetchRollingVolatility(sensitivity: Sensitivity = "standard", group: AssetGroup = "macro"): Promise<RollingResponse> {
  const res = await fetch(`${API_BASE}/rolling/volatility?sensitivity=${sensitivity}&group=${group}`);
  if (!res.ok) throw new Error("Failed to fetch rolling volatility");
  return res.json();
}

export async function fetchRecentMatrix(sensitivity: Sensitivity = "standard", group: AssetGroup = "macro"): Promise<MatrixResponse> {
  const res = await fetch(`${API_BASE}/correlation/matrix/recent?sensitivity=${sensitivity}&group=${group}`);
  if (!res.ok) throw new Error("Failed to fetch recent matrix");
  return res.json();
}

export async function fetchLongTermMatrix(sensitivity: Sensitivity = "standard", group: AssetGroup = "macro"): Promise<MatrixResponse> {
  const res = await fetch(`${API_BASE}/correlation/matrix/long-term?sensitivity=${sensitivity}&group=${group}`);
  if (!res.ok) throw new Error("Failed to fetch long term matrix");
  return res.json();
}

export async function fetchAnomalies(sensitivity: Sensitivity = "standard", group: AssetGroup = "macro"): Promise<AnomalySignal[]> {
  const res = await fetch(`${API_BASE}/anomalies?sensitivity=${sensitivity}&group=${group}`);
  if (!res.ok) throw new Error("Failed to fetch anomalies");
  return res.json();
}

export async function fetchInsights(sensitivity: Sensitivity = "standard", group: AssetGroup = "macro"): Promise<InsightResponse> {
  const res = await fetch(`${API_BASE}/insights?sensitivity=${sensitivity}&group=${group}`);
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}

export async function computeFrontier(req: FrontierRequest): Promise<FrontierResponse> {
  const res = await fetch(`${API_BASE.replace("/analysis", "/frontier")}/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  if (!res.ok) throw new Error("Failed to compute efficient frontier");
  return res.json();
}
