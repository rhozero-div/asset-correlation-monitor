from pydantic import BaseModel
from typing import List, Dict, Optional

class RefreshResponse(BaseModel):
    status: str
    message: str
    last_date: str

class SummaryStat(BaseModel):
    ticker: str
    cagr_ytd: Optional[float]
    cagr_1y: Optional[float]
    cagr_3y: Optional[float]
    cagr_5y: Optional[float]
    cagr_all: Optional[float]
    vol_all: Optional[float]
    max_dd_all: Optional[float]

class TimeSeriesPoint(BaseModel):
    date: str
    value: float

class RollingResponse(BaseModel):
    window: int
    data: Dict[str, List[TimeSeriesPoint]]

class MatrixResponse(BaseModel):
    tickers: List[str]
    matrix: List[List[float]]

class AnomalySignal(BaseModel):
    pair: str
    current_corr: float
    mean_corr: float
    std_corr: float
    z_score: float
    signal: str  # e.g., "Normal", "Warning", "Alert"

class InsightResponse(BaseModel):
    regime_notes: List[str]
    allocation_suggestions: List[str]
