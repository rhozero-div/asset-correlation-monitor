from fastapi import APIRouter
from typing import List, Optional
import numpy as np

from app.models.schemas import FrontierRequest, FrontierResponse, PortfolioStatsRequest, PortfolioPoint, AssetPoints
from app.services.analysis_service import analysis_service
from app.services.optimizer import (
    build_cov_matrix,
    efficient_frontier,
    compute_asset_points,
)

router = APIRouter(prefix="/api/v1/frontier", tags=["Frontier"])

def _get_rho_matrix(tickers: List[str]):
    """Extract smooth Kalman correlation matrix for given tickers."""
    analysis_service._ensure_kalman()
    matrix_df = analysis_service._kalman_matrices.get("smooth")

    if matrix_df is None or matrix_df.empty:
        n = len(tickers)
        return np.eye(n), ["Correlation matrix not ready. Using identity matrix."]

    missing = [t for t in tickers if t not in matrix_df.columns]
    if missing:
        n = len(tickers)
        rho = np.eye(n)
        for i, t1 in enumerate(tickers):
            for j, t2 in enumerate(tickers):
                if t1 in matrix_df.columns and t2 in matrix_df.columns:
                    rho[i, j] = float(matrix_df.loc[t1, t2])
        return rho, [f"Some tickers missing from correlation cache: {missing}"]

    return matrix_df.loc[tickers, tickers].values, []


@router.post("/compute", response_model=FrontierResponse)
async def compute_frontier(req: FrontierRequest):
    mu = np.array(req.mu)
    sigma = np.array(req.sigma)
    rf = req.rf
    
    rho_matrix, warnings = _get_rho_matrix(req.tickers)

    Sigma = build_cov_matrix(sigma, rho_matrix)

    ef_points, ms_pt, mv_pt, opt_warnings = efficient_frontier(
        mu, Sigma, rf, req.allowShort, n_points=req.nPoints,
    )
    warnings.extend(opt_warnings)

    asset_pts = compute_asset_points(mu, np.sqrt(np.diag(Sigma)), req.tickers)

    def serialize_pt(pt):
        if pt is None:
            return None
        return PortfolioPoint(
            weights=pt["weights"].tolist(),
            ret=float(pt["ret"]),
            vol=float(pt["vol"]),
            sharpe=float(pt["sharpe"]),
        )

    return FrontierResponse(
        efPoints=[serialize_pt(p) for p in ef_points if p is not None],
        maxSharpe=serialize_pt(ms_pt),
        minVol=serialize_pt(mv_pt),
        assetPoints=AssetPoints(
            tickers=asset_pts["ticker"].tolist(),
            vol=asset_pts["vol"].tolist(),
            ret=asset_pts["ret"].tolist(),
        ),
        warnings=warnings,
    )


@router.post("/portfolio-stats", response_model=PortfolioPoint)
async def compute_portfolio_stats(req: PortfolioStatsRequest):
    mu = np.array(req.mu)
    sigma = np.array(req.sigma)
    w = np.array(req.weights) / 100.0
    rf = req.rf

    rho_matrix, _ = _get_rho_matrix(req.tickers)
    Sigma = build_cov_matrix(sigma, rho_matrix)

    ret = float(w @ mu)
    vol = float(np.sqrt(w @ Sigma @ w))
    sharpe = (ret - rf) / vol if vol > 1e-10 else 0.0

    return PortfolioPoint(weights=req.weights, ret=ret, vol=vol, sharpe=sharpe)
