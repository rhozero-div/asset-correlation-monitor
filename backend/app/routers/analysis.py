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
def get_summary(group: str = Query("all", description="Asset group: all, macro, equities, fixed_income, commodities_alts")):
    return analysis_service.get_summary_stats(group)

@router.get("/rolling/correlation", response_model=RollingResponse)
def get_rolling_correlation(
    window: int = Query(120, description="Rolling window size in days"),
    group: str = Query("all", description="Asset group: all, macro, equities, fixed_income, commodities_alts")
):
    data = analysis_service.get_rolling_correlation(window, group)
    return RollingResponse(window=window, data=data)

@router.get("/rolling/volatility", response_model=RollingResponse)
def get_rolling_volatility(
    window: int = Query(60, description="Rolling window size in days"),
    group: str = Query("all", description="Asset group: all, macro, equities, fixed_income, commodities_alts")
):
    data = analysis_service.get_rolling_volatility(window, group)
    return RollingResponse(window=window, data=data)

@router.get("/correlation/matrix/recent", response_model=MatrixResponse)
def get_recent_matrix(
    window: int = Query(120, description="Recent window size in days"),
    group: str = Query("all", description="Asset group: all, macro, equities, fixed_income, commodities_alts")
):
    tickers, matrix = analysis_service.get_correlation_matrix(window, group)
    return MatrixResponse(tickers=tickers, matrix=matrix)

@router.get("/correlation/matrix/long-term", response_model=MatrixResponse)
def get_long_term_matrix(group: str = Query("all", description="Asset group: all, macro, equities, fixed_income, commodities_alts")):
    tickers, matrix = analysis_service.get_correlation_matrix(group=group)
    return MatrixResponse(tickers=tickers, matrix=matrix)

@router.get("/anomalies", response_model=List[AnomalySignal])
def get_anomalies(
    window: int = Query(120, description="Rolling window size in days"),
    group: str = Query("all", description="Asset group: all, macro, equities, fixed_income, commodities_alts")
):
    return analysis_service.get_anomalies(window, group)

@router.get("/insights", response_model=InsightResponse)
def get_insights(
    window: int = Query(120, description="Rolling window size in days"),
    group: str = Query("all", description="Asset group: all, macro, equities, fixed_income, commodities_alts")
):
    anomalies = analysis_service.get_anomalies(window, group)
    return analysis_service.generate_insights(anomalies, group)
