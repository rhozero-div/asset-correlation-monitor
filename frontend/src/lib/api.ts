import { 
  RefreshResponse, SummaryStat, RollingResponse, 
  MatrixResponse, AnomalySignal, InsightResponse 
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8012/api/v1/analysis";

export async function refreshData(): Promise<RefreshResponse> {
  const res = await fetch(`${API_BASE}/refresh`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to refresh data");
  return res.json();
}

export async function fetchSummary(): Promise<SummaryStat[]> {
  const res = await fetch(`${API_BASE}/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function fetchRollingCorrelation(window: number = 120): Promise<RollingResponse> {
  const res = await fetch(`${API_BASE}/rolling/correlation?window=${window}`);
  if (!res.ok) throw new Error("Failed to fetch rolling correlation");
  return res.json();
}

export async function fetchRollingVolatility(window: number = 60): Promise<RollingResponse> {
  const res = await fetch(`${API_BASE}/rolling/volatility?window=${window}`);
  if (!res.ok) throw new Error("Failed to fetch rolling volatility");
  return res.json();
}

export async function fetchRecentMatrix(window: number = 120): Promise<MatrixResponse> {
  const res = await fetch(`${API_BASE}/correlation/matrix/recent?window=${window}`);
  if (!res.ok) throw new Error("Failed to fetch recent matrix");
  return res.json();
}

export async function fetchLongTermMatrix(): Promise<MatrixResponse> {
  const res = await fetch(`${API_BASE}/correlation/matrix/long-term`);
  if (!res.ok) throw new Error("Failed to fetch long term matrix");
  return res.json();
}

export async function fetchAnomalies(window: number = 120): Promise<AnomalySignal[]> {
  const res = await fetch(`${API_BASE}/anomalies?window=${window}`);
  if (!res.ok) throw new Error("Failed to fetch anomalies");
  return res.json();
}

export async function fetchInsights(window: number = 120): Promise<InsightResponse> {
  const res = await fetch(`${API_BASE}/insights?window=${window}`);
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}
