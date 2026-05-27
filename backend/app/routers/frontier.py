from fastapi import APIRouter
from typing import List, Optional
import numpy as np

from app.models.schemas import FrontierRequest, FrontierResponse, PortfolioPoint, AssetPoints
from app.services.analysis_service import analysis_service
from app.services.optimizer import (
    build_cov_matrix,
    efficient_frontier,
    compute_asset_points,
)

router = APIRouter(prefix="/api/v1/frontier", tags=["Frontier"])

@router.post("/compute", response_model=FrontierResponse)
async def compute_frontier(req: FrontierRequest):
    mu = np.array(req.mu)
    sigma = np.array(req.sigma)
    rf = req.rf
    
    # Extract the smooth Kalman correlation matrix from analysis_service
    analysis_service._ensure_kalman()
    matrix_df = analysis_service._kalman_matrices.get("smooth")
    
    if matrix_df is None or matrix_df.empty:
        # Fallback to identity matrix if not ready
        n = len(req.tickers)
        rho_matrix = np.eye(n)
        warnings = ["Correlation matrix not ready. Using identity matrix."]
    else:
        # Filter the matrix for the requested tickers
        missing = [t for t in req.tickers if t not in matrix_df.columns]
        if missing:
            # Fallback: create a matrix with 0 correlations for missing tickers
            n = len(req.tickers)
            rho_matrix = np.eye(n)
            for i, t1 in enumerate(req.tickers):
                for j, t2 in enumerate(req.tickers):
                    if t1 in matrix_df.columns and t2 in matrix_df.columns:
                        rho_matrix[i, j] = float(matrix_df.loc[t1, t2])
            warnings = [f"Some tickers missing from correlation cache: {missing}"]
        else:
            rho_matrix = matrix_df.loc[req.tickers, req.tickers].values
            warnings = []

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
