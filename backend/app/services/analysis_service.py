import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
from .data_service import data_service
from .kalman import garch_standardize, compute_obs, kalman_filter_1d


class AnalysisService:
    SENSITIVITY_CONFIG = {
        "fast": {"Q": 0.0001, "label": "Fast"},
        "standard": {"Q": 0.00005, "label": "Standard"},
        "smooth": {"Q": 0.00001, "label": "Smooth"},
    }
    KALMAN_R = 0.5

    def __init__(self):
        self._garch_ready = False
        self._garch_warnings: List[str] = []
        self._garch_std: Dict[str, pd.Series] = {}
        self._garch_vol: Dict[str, pd.Series] = {}
        self._kalman_matrices: Dict[str, pd.DataFrame] = {}
        self._kalman_series: Dict[str, Dict[Tuple[str, str], pd.Series]] = {}

    # ------------------------------------------------------------------ #
    #  GARCH + Kalman pre-computation
    # ------------------------------------------------------------------ #

    def _ensure_garch(self):
        if self._garch_ready:
            return
        print("Running GARCH(1,1) standardization for all tickers...")
        returns = self._get_returns("all")
        self._garch_warnings = []
        for ticker in returns.columns:
            std, vol, warn = garch_standardize(returns[ticker])
            self._garch_std[ticker] = std
            self._garch_vol[ticker] = vol
            if warn:
                self._garch_warnings.append(f"[{ticker}] {warn}")
        for w in self._garch_warnings:
            print(f"  GARCH: {w}")
        self._garch_ready = True

    def _ensure_kalman(self):
        if self._kalman_matrices:
            return
        self._ensure_garch()
        print("Running Kalman filter for all sensitivity levels...")
        all_tickers = [t for t in data_service.get_tickers_for_group("all") if t in self._garch_std]
        n = len(all_tickers)
        if n < 2:
            return

        for sensitivity, config in self.SENSITIVITY_CONFIG.items():
            Q = config["Q"]
            matrix = pd.DataFrame(np.eye(n), index=all_tickers, columns=all_tickers)
            series: Dict[Tuple[str, str], pd.Series] = {}

            for i in range(n):
                for j in range(i + 1, n):
                    t1, t2 = all_tickers[i], all_tickers[j]
                    obs = compute_obs(self._garch_std[t1], self._garch_std[t2])
                    if len(obs) < 10:
                        continue
                    hist_corr = float(self._garch_std[t1].corr(self._garch_std[t2]))
                    if np.isnan(hist_corr):
                        hist_corr = 0.0
                    rho = kalman_filter_1d(
                        obs.values, Q=Q, R=self.KALMAN_R,
                        rho_init=float(hist_corr), P_init=0.1,
                    )
                    rho_series = pd.Series(rho, index=obs.index)
                    series[(t1, t2)] = rho_series
                    matrix.loc[t1, t2] = matrix.loc[t2, t1] = rho[-1]

            self._kalman_matrices[sensitivity] = matrix
            self._kalman_series[sensitivity] = series
            print(f"  Kalman [{sensitivity}] (Q={Q}): {len(series)} pairs computed")

    def invalidate_kalman(self):
        """Call after data refresh so Kalman gets recomputed."""
        self._garch_ready = False
        self._garch_std.clear()
        self._garch_vol.clear()
        self._garch_warnings.clear()
        self._kalman_matrices.clear()
        self._kalman_series.clear()

    # ------------------------------------------------------------------ #
    #  Returns helper (shared, no window)
    # ------------------------------------------------------------------ #

    def _get_returns(self, group: str = "all") -> pd.DataFrame:
        df = data_service.load_data()
        tickers = data_service.get_tickers_for_group(group)
        tickers = [t for t in tickers if t in df.columns]
        df = df[tickers]
        returns = df.pct_change(fill_method=None)
        valid = [c for c in returns.columns if returns[c].notna().sum() > 0]
        dropped = set(returns.columns) - set(valid)
        if dropped:
            print(f"Dropped tickers with no return data: {dropped}")
        return returns[valid].dropna(how='all')

    # ------------------------------------------------------------------ #
    #  Public API methods
    # ------------------------------------------------------------------ #

    def get_summary_stats(self, group: str = "all") -> List[Dict]:
        tickers = data_service.get_tickers_for_group(group)
        df = data_service.load_data()
        df = df[[t for t in tickers if t in df.columns]]
        returns = self._get_returns(group)

        stats = []
        last_date = df.index[-1]

        for ticker in df.columns:
            series = df[ticker].dropna()
            if series.empty:
                continue

            def get_cagr(start_date, end_date, start_val, end_val):
                days = (end_date - start_date).days
                if days < 30 or start_val <= 0:
                    return None
                years = days / 365.25
                return (end_val / start_val) ** (1 / years) - 1

            ytd_start = pd.to_datetime(f"{last_date.year}-01-01")

            def safe_get_price(target_date):
                subset = series[:target_date]
                return subset.iloc[-1] if not subset.empty else None

            price_last = series.iloc[-1]
            price_ytd = safe_get_price(ytd_start)
            price_1y = safe_get_price(last_date - pd.DateOffset(years=1))
            price_3y = safe_get_price(last_date - pd.DateOffset(years=3))
            price_5y = safe_get_price(last_date - pd.DateOffset(years=5))
            price_start = series.iloc[0]

            cagr_ytd = (price_last / price_ytd - 1) if price_ytd else None
            cagr_1y = get_cagr(last_date - pd.DateOffset(years=1), last_date, price_1y, price_last) if price_1y else None
            cagr_3y = get_cagr(last_date - pd.DateOffset(years=3), last_date, price_3y, price_last) if price_3y else None
            cagr_5y = get_cagr(last_date - pd.DateOffset(years=5), last_date, price_5y, price_last) if price_5y else None
            cagr_all = get_cagr(series.index[0], last_date, price_start, price_last)

            vol_all = returns[ticker].std() * np.sqrt(252)

            roll_max = series.cummax()
            drawdown = series / roll_max - 1
            max_dd = drawdown.min()

            stats.append({
                "ticker": ticker,
                "cagr_ytd": cagr_ytd,
                "cagr_1y": cagr_1y,
                "cagr_3y": cagr_3y,
                "cagr_5y": cagr_5y,
                "cagr_all": cagr_all,
                "vol_all": vol_all,
                "max_dd_all": max_dd,
            })

        return stats

    def get_correlation_matrix(self, sensitivity: str = "standard", group: str = "all") -> Tuple[List[str], List[List[float]]]:
        self._ensure_kalman()
        matrix = self._kalman_matrices.get(sensitivity)
        if matrix is None or matrix.empty:
            return [], []
        tickers = data_service.get_tickers_for_group(group)
        tickers = [t for t in tickers if t in matrix.columns]
        if len(tickers) < 2:
            return tickers, [[1.0]]
        sub = matrix.loc[tickers, tickers]
        return sub.columns.tolist(), sub.values.tolist()

    def get_rolling_correlation(self, sensitivity: str = "standard", group: str = "all") -> Dict[str, List[Dict[str, float]]]:
        self._ensure_kalman()
        series = self._kalman_series.get(sensitivity, {})
        group_tickers = set(data_service.get_tickers_for_group(group))

        # Collect pair series in this group
        group_series: Dict[str, pd.Series] = {}
        all_dates: set = set()
        for (t1, t2), rho_series in series.items():
            if t1 not in group_tickers or t2 not in group_tickers:
                continue
            pair_key = f"{t1}-{t2}"
            group_series[pair_key] = rho_series
            all_dates.update(rho_series.index)

        # Sample dates from the union so all pairs share the same x-axis
        sampled_date_set = set(sorted(all_dates)[::5])

        res: Dict[str, List[Dict[str, float]]] = {}
        for pair_key, rho_series in group_series.items():
            filtered = rho_series[rho_series.index.isin(sampled_date_set)]
            points = [{"date": str(idx.date()), "value": val} for idx, val in filtered.items()]
            res[pair_key] = points
        return res

    def get_rolling_volatility(self, group: str = "all") -> Dict[str, List[Dict[str, float]]]:
        self._ensure_garch()
        tickers = data_service.get_tickers_for_group(group)
        tickers = [t for t in tickers if t in self._garch_vol]

        # Compute annualised vol for each ticker and collect all dates
        all_vol: Dict[str, pd.Series] = {}
        all_dates: set = set()
        for ticker in tickers:
            vol = self._garch_vol[ticker].dropna() * np.sqrt(252)
            all_vol[ticker] = vol
            all_dates.update(vol.index)

        # Sample dates from the union so all tickers share the same x-axis
        sampled_date_set = set(sorted(all_dates)[::5])

        res: Dict[str, List[Dict[str, float]]] = {}
        for ticker in tickers:
            vol = all_vol[ticker]
            filtered = vol[vol.index.isin(sampled_date_set)]
            points = [{"date": str(idx.date()), "value": val} for idx, val in filtered.items()]
            res[ticker] = points
        return res

    def get_anomalies(self, sensitivity: str = "standard", group: str = "all") -> List[Dict]:
        self._ensure_kalman()
        series = self._kalman_series.get(sensitivity, {})
        group_tickers = set(data_service.get_tickers_for_group(group))
        anomalies = []
        for (t1, t2), rho_series in series.items():
            if t1 not in group_tickers or t2 not in group_tickers:
                continue
            if len(rho_series) < 30:
                continue
            current_corr = float(rho_series.iloc[-1])
            mean_corr = float(rho_series.mean())
            std_corr = float(rho_series.std())
            if std_corr > 0:
                z_score = (current_corr - mean_corr) / std_corr
            else:
                z_score = 0.0
            if abs(z_score) > 1.5:
                signal = "Alert"
            elif abs(z_score) > 1.0:
                signal = "Warning"
            else:
                signal = "Normal"
            anomalies.append({
                "pair": f"{t1}-{t2}",
                "current_corr": current_corr,
                "mean_corr": mean_corr,
                "std_corr": std_corr,
                "z_score": z_score,
                "signal": signal,
            })
        anomalies.sort(key=lambda x: abs(x["z_score"]), reverse=True)
        return anomalies

    def generate_insights(self, anomalies: List[Dict], group: str = "all") -> Dict:
        self._ensure_kalman()
        regime_notes = []
        allocation = []

        # Use standard-sensitivity latest matrix for regime detection
        matrix = self._kalman_matrices.get("standard")

        def get_corr(t1: str, t2: str) -> float:
            if matrix is None:
                return 0.0
            if t1 in matrix.columns and t2 in matrix.columns:
                return float(matrix.loc[t1, t2])
            return 0.0

        if group == "macro":
            stock_bond = get_corr("VOO", "TLT") if "TLT" in data_service.get_tickers_for_group("macro") else get_corr("VOO", "AGG")
            if stock_bond > 0.1:
                regime_notes.append("Stock-Bond correlation is positive. Traditional 60/40 diversification is compromised.")
                allocation.append("Consider adding commodities (GLD, PDBC) or cash to improve portfolio defense.")
            else:
                regime_notes.append("Stock-Bond correlation is neutral to negative. 60/40 is functioning normally.")

            voo_gld = get_corr("VOO", "GLD")
            if voo_gld < -0.3:
                regime_notes.append("Gold is negatively correlated with equities. Classic risk-off signal.")
                allocation.append("Gold continues to provide effective portfolio hedging.")

            pdbc_gld = get_corr("PDBC", "GLD")
            if pdbc_gld < 0.2:
                regime_notes.append("Commodities (PDBC) and Gold (GLD) are decoupling. Inflation expectations may be shifting.")
                allocation.append("Separate your commodity and gold allocations — they are serving different portfolio roles.")

        elif group == "equities":
            growth_value = get_corr("VOOG", "VOOV")
            if growth_value < 0.85:
                regime_notes.append("Growth-Value correlation is declining. Significant style divergence in progress.")
            elif growth_value > 0.95:
                regime_notes.append("Growth and Value are moving in lockstep. Low style dispersion regime.")

            us_intl = get_corr("VOO", "VXUS")
            if us_intl < 0.7:
                regime_notes.append("US and International equities are diverging. Potential regime shift in global leadership.")

            for a in anomalies:
                if a['pair'] in ['VOO-COWZ', 'COWZ-VOO'] and a['z_score'] < -1.0:
                    allocation.append("Cash Cows (COWZ) are decoupling from the market. Good environment for factor diversification.")

        elif group == "fixed_income":
            short_long = get_corr("IEF", "TLT")
            if short_long < 0.7:
                regime_notes.append("Short-end and long-end Treasuries are decoupling. Yield curve dynamics are shifting.")

            lqd_hyg = get_corr("LQD", "HYG")
            if lqd_hyg < 0.7:
                regime_notes.append("Investment grade and high yield credit are diverging. Credit risk repricing in progress.")

            tlt_tip = get_corr("TLT", "TIP")
            if tlt_tip < 0.5:
                regime_notes.append("Nominal bonds and TIPS are diverging. Inflation expectations may be shifting rapidly.")

            tlt_agg = get_corr("TLT", "AGG")
            if tlt_agg < 0.7:
                regime_notes.append("Long-term Treasuries and Aggregate bonds are diverging. Duration positioning matters more than usual.")

        elif group == "commodities_alts":
            pdbc_uso = get_corr("PDBC", "USO")
            if pdbc_uso > 0.8:
                regime_notes.append("Broad commodities are highly correlated with oil. Energy is driving the commodity complex.")

            gld_pdbc = get_corr("GLD", "PDBC")
            if gld_pdbc < 0.1:
                regime_notes.append("Gold and broad commodities are uncorrelated. Gold is behaving as monetary hedge, not cyclical asset.")

            for a in anomalies:
                if a['pair'] in ['BTC-USD-GLD', 'GLD-BTC-USD'] and abs(a['z_score']) > 1.0:
                    regime_notes.append("Bitcoin-Gold correlation is anomalous. Digital gold narrative may be strengthening or weakening.")

        if not regime_notes:
            regime_notes.append("Correlations are within historical norms for this asset group.")
        if not allocation:
            allocation.append("Maintain strategic asset allocation weights.")

        return {
            "regime_notes": regime_notes,
            "allocation_suggestions": allocation,
        }


analysis_service = AnalysisService()
