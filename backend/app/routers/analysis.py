from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.models.schemas import (
    RefreshResponse, SummaryStat, RollingResponse, 
    MatrixResponse, AnomalySignal, InsightResponse
)
from app.services.data_service import data_service
from app.services.analysis_service import analysis_service

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])

@router.post("/refresh", response_model=RefreshResponse)
def refresh_data():
    updated = data_service.refresh_data()
    msg = "Data refreshed successfully" if updated else "Data is already up-to-date"
    return RefreshResponse(
        status="success", 
        message=msg,
        last_date=data_service.get_last_date()
    )

@router.get("/summary", response_model=List[SummaryStat])
def get_summary():
    return analysis_service.get_summary_stats()

@router.get("/rolling/correlation", response_model=RollingResponse)
def get_rolling_correlation(window: int = Query(120, description="Rolling window size in days")):
    data = analysis_service.get_rolling_correlation(window)
    return RollingResponse(window=window, data=data)

@router.get("/rolling/volatility", response_model=RollingResponse)
def get_rolling_volatility(window: int = Query(60, description="Rolling window size in days")):
    data = analysis_service.get_rolling_volatility(window)
    return RollingResponse(window=window, data=data)

@router.get("/correlation/matrix/recent", response_model=MatrixResponse)
def get_recent_matrix(window: int = Query(120, description="Recent window size in days")):
    tickers, matrix = analysis_service.get_correlation_matrix(window)
    return MatrixResponse(tickers=tickers, matrix=matrix)

@router.get("/correlation/matrix/long-term", response_model=MatrixResponse)
def get_long_term_matrix():
    tickers, matrix = analysis_service.get_correlation_matrix()
    return MatrixResponse(tickers=tickers, matrix=matrix)

@router.get("/anomalies", response_model=List[AnomalySignal])
def get_anomalies(window: int = Query(120, description="Rolling window size in days")):
    return analysis_service.get_anomalies(window)

@router.get("/insights", response_model=InsightResponse)
def get_insights(window: int = Query(120, description="Rolling window size in days")):
    anomalies = analysis_service.get_anomalies(window)
    return analysis_service.generate_insights(anomalies)
