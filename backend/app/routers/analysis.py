from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.models.schemas import (
    RefreshResponse, SummaryStat, RollingResponse,
    MatrixResponse, AnomalySignal, InsightResponse
)
from app.services.data_service import data_service
from app.services.analysis_service import analysis_service

router = APIRouter(prefix="/api/v1/analysis", tags=["Analysis"])

SENSITIVITY_HELP = "Sensitivity: fast (Q=0.01), standard (Q=0.005), smooth (Q=0.0001)"
GROUP_HELP = "Asset group: all, macro, equities, fixed_income, commodities_alts"


@router.post("/refresh", response_model=RefreshResponse)
def refresh_data():
    updated = data_service.refresh_data()
    if updated:
        analysis_service.invalidate_kalman()
    msg = "Data refreshed successfully" if updated else "Data is already up-to-date"
    return RefreshResponse(
        status="success",
        message=msg,
        last_date=data_service.get_last_date()
    )


@router.get("/summary", response_model=List[SummaryStat])
def get_summary(group: str = Query("all", description=GROUP_HELP)):
    return analysis_service.get_summary_stats(group)


@router.get("/rolling/correlation", response_model=RollingResponse)
def get_rolling_correlation(
    sensitivity: str = Query("standard", description=SENSITIVITY_HELP),
    group: str = Query("all", description=GROUP_HELP),
):
    data = analysis_service.get_rolling_correlation(sensitivity, group)
    return RollingResponse(sensitivity=sensitivity, data=data)


@router.get("/rolling/volatility", response_model=RollingResponse)
def get_rolling_volatility(
    sensitivity: str = Query("standard", description=SENSITIVITY_HELP),
    group: str = Query("all", description=GROUP_HELP),
):
    # Volatility uses GARCH cond vol, sensitivity is accepted for API consistency
    data = analysis_service.get_rolling_volatility(group)
    return RollingResponse(sensitivity=sensitivity, data=data)


@router.get("/correlation/matrix/recent", response_model=MatrixResponse)
def get_recent_matrix(
    sensitivity: str = Query("standard", description=SENSITIVITY_HELP),
    group: str = Query("all", description=GROUP_HELP),
):
    tickers, matrix = analysis_service.get_correlation_matrix(sensitivity, group)
    return MatrixResponse(tickers=tickers, matrix=matrix)


@router.get("/correlation/matrix/long-term", response_model=MatrixResponse)
def get_long_term_matrix(
    sensitivity: str = Query("standard", description=SENSITIVITY_HELP),
    group: str = Query("all", description=GROUP_HELP),
):
    tickers, matrix = analysis_service.get_correlation_matrix(sensitivity, group)
    return MatrixResponse(tickers=tickers, matrix=matrix)


@router.get("/anomalies", response_model=List[AnomalySignal])
def get_anomalies(
    sensitivity: str = Query("standard", description=SENSITIVITY_HELP),
    group: str = Query("all", description=GROUP_HELP),
):
    return analysis_service.get_anomalies(sensitivity, group)


@router.get("/insights", response_model=InsightResponse)
def get_insights(
    sensitivity: str = Query("standard", description=SENSITIVITY_HELP),
    group: str = Query("all", description=GROUP_HELP),
):
    anomalies = analysis_service.get_anomalies(sensitivity, group)
    return analysis_service.generate_insights(anomalies, group)
