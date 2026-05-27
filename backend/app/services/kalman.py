import warnings
from typing import Optional, Tuple

import numpy as np
import pandas as pd
from arch import arch_model


def garch_standardize(
    returns: pd.Series,
    warn_on_fallback: bool = True,
) -> Tuple[pd.Series, pd.Series, Optional[str]]:
    """Fit GARCH(1,1), return standardized returns and conditional volatility."""
    warning_msg: Optional[str] = None
    clean = returns.dropna()
    r = clean.values

    if len(r) < 30:
        fallback_sigma = _ewma_fallback(r)
        std = pd.Series(r / fallback_sigma, index=clean.index)
        vol = pd.Series(fallback_sigma, index=clean.index)
        return std, vol, "Series too short for GARCH (n<30); using EWMA fallback."

    if np.std(r) < 1e-10:
        std = pd.Series(np.zeros_like(r), index=clean.index)
        vol = pd.Series(np.ones_like(r), index=clean.index)
        return std, vol, "Near-zero volatility series; returning zeros."

    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            model = arch_model(r * 100, vol="Garch", p=1, q=1, dist="normal")
            result = model.fit(update_freq=0, disp="off", options={"maxiter": 2000})

        convergence_ok = True
        for w in caught:
            if "Convergence" in str(w.message) or "convergence" in str(w.message).lower():
                convergence_ok = False
                break

        if not convergence_ok or result is None:
            raise RuntimeError("GARCH did not converge.")
    except Exception:
        fallback_sigma = _ewma_fallback(r)
        std = pd.Series(r / fallback_sigma, index=clean.index)
        vol = pd.Series(fallback_sigma, index=clean.index)
        if warn_on_fallback and np.std(r) >= 0.003:
            warning_msg = "GARCH(1,1) did not converge; using EWMA fallback."
        return std, vol, warning_msg

    cv = result.conditional_volatility
    if hasattr(cv, 'values'):
        cv = cv.values
    cond_vol = cv / 100.0
    standardized = r / np.maximum(cond_vol, 1e-8)
    standardized = np.clip(standardized, -6, 6)

    std = pd.Series(standardized, index=clean.index)
    vol = pd.Series(cond_vol, index=clean.index)
    return std, vol, warning_msg


def _ewma_fallback(returns: np.ndarray, span: int = 20, min_periods: int = 10) -> np.ndarray:
    """EWMA rolling standard deviation fallback."""
    s = pd.Series(returns)
    rolling_std = s.ewm(span=span, min_periods=min_periods).std()
    global_std = np.std(returns)
    rolling_std = rolling_std.fillna(global_std)
    return np.maximum(rolling_std.values, 1e-8)


def compute_obs(std_i: pd.Series, std_j: pd.Series) -> pd.Series:
    """Observation = product of two GARCH-standardized return series."""
    common_idx = std_i.index.intersection(std_j.index)
    return std_i.loc[common_idx] * std_j.loc[common_idx]


def kalman_filter_1d(
    obs: np.ndarray,
    Q: float = 0.005,
    R: float = 0.5,
    rho_init: float = 0.0,
    P_init: float = 1.0,
) -> np.ndarray:
    """1D Kalman filter with phi=1 (random walk) for time-varying correlation.

    Args:
        obs: Observation array (product of standardized returns)
        Q: Process noise variance (higher = faster tracking)
        R: Observation noise variance
        rho_init: Initial correlation estimate
        P_init: Initial state variance

    Returns:
        Array of filtered correlation estimates (same length as obs)
    """
    T = len(obs)
    rho = np.zeros(T)

    rho_prev = rho_init
    P_prev = P_init

    for t in range(T):
        rho_pred = rho_prev
        P_pred = P_prev + Q

        if np.isnan(obs[t]):
            rho[t] = rho_pred
        else:
            K = P_pred / (P_pred + R)
            rho[t] = rho_pred + K * (obs[t] - rho_pred)
            P = (1.0 - K) * P_pred
            P_prev = P

        rho_prev = rho[t]

    return np.clip(rho, -1.0, 1.0)
