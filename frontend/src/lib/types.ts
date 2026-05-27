export interface RefreshResponse {
  status: string;
  message: string;
  last_date: string;
}

export interface SummaryStat {
  ticker: string;
  cagr_ytd: number | null;
  cagr_1y: number | null;
  cagr_3y: number | null;
  cagr_5y: number | null;
  cagr_all: number | null;
  vol_all: number | null;
  max_dd_all: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface RollingResponse {
  sensitivity: string;
  data: Record<string, TimeSeriesPoint[]>;
}

export interface MatrixResponse {
  tickers: string[];
  matrix: number[][];
}

export interface AnomalySignal {
  pair: string;
  current_corr: number;
  mean_corr: number;
  std_corr: number;
  z_score: number;
  signal: string;
}

export interface InsightResponse {
  regime_notes: string[];
  allocation_suggestions: string[];
}
