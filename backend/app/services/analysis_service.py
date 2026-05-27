import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
from .data_service import data_service

class AnalysisService:
    def __init__(self):
        pass

    def _get_returns(self, group: str = "all") -> pd.DataFrame:
        df = data_service.load_data()
        tickers = data_service.get_tickers_for_group(group)
        tickers = [t for t in tickers if t in df.columns]
        df = df[tickers]
        returns = df.pct_change(fill_method=None)
        # Drop tickers that have zero valid return data (yfinance glitch)
        valid = [c for c in returns.columns if returns[c].notna().sum() > 0]
        dropped = set(returns.columns) - set(valid)
        if dropped:
            print(f"Dropped tickers with no return data: {dropped}")
        return returns[valid].dropna(how='all')

    def get_summary_stats(self, group: str = "all") -> List[Dict]:
        tickers = data_service.get_tickers_for_group(group)
        df = data_service.load_data()
        df = df[[t for t in tickers if t in df.columns]]
        returns = self._get_returns(group)

        stats = []
        last_date = df.index[-1]

        for ticker in df.columns:
            series = df[ticker].dropna()
            if series.empty: continue

            def get_cagr(start_date, end_date, start_val, end_val):
                days = (end_date - start_date).days
                if days < 30 or start_val <= 0: return None
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
                "max_dd_all": max_dd
            })

        return stats

    def get_rolling_correlation(self, window: int = 120, group: str = "all") -> Dict[str, List[Dict[str, float]]]:
        returns = self._get_returns(group)
        tickers = returns.columns
        res = {}

        for i in range(len(tickers)):
            for j in range(i+1, len(tickers)):
                t1, t2 = tickers[i], tickers[j]
                pair = f"{t1}-{t2}"
                roll_corr = returns[t1].rolling(window).corr(returns[t2]).dropna()

                sampled = roll_corr.iloc[::5]
                points = [{"date": str(idx.date()), "value": val} for idx, val in sampled.items()]
                res[pair] = points

        return res

    def get_rolling_volatility(self, window: int = 60, group: str = "all") -> Dict[str, List[Dict[str, float]]]:
        returns = self._get_returns(group)
        res = {}

        for ticker in returns.columns:
            roll_vol = returns[ticker].rolling(window).std() * np.sqrt(252)
            roll_vol = roll_vol.dropna()

            sampled = roll_vol.iloc[::5]
            points = [{"date": str(idx.date()), "value": val} for idx, val in sampled.items()]
            res[ticker] = points

        return res

    def get_correlation_matrix(self, window: Optional[int] = None, group: str = "all") -> Tuple[List[str], List[List[float]]]:
        returns = self._get_returns(group)
        if window:
            returns = returns.iloc[-window:]

        # Filter out tickers with zero variance (all NaN returns in window)
        valid_cols = [c for c in returns.columns if returns[c].notna().sum() > 1]
        if len(valid_cols) != len(returns.columns):
            dropped = set(returns.columns) - set(valid_cols)
            print(f"Excluded {dropped} from correlation matrix (no variance in window {window})")
            returns = returns[valid_cols]

        if returns.empty or returns.shape[1] < 1:
            return [], []

        corr_matrix = returns.corr()
        tickers = corr_matrix.columns.tolist()
        matrix = corr_matrix.values.tolist()

        return tickers, matrix

    def get_anomalies(self, window: int = 120, group: str = "all") -> List[Dict]:
        returns = self._get_returns(group)
        tickers = returns.columns
        anomalies = []

        for i in range(len(tickers)):
            for j in range(i+1, len(tickers)):
                t1, t2 = tickers[i], tickers[j]
                pair = f"{t1}-{t2}"

                roll_corr = returns[t1].rolling(window).corr(returns[t2]).dropna()
                if roll_corr.empty: continue

                current_corr = roll_corr.iloc[-1]
                mean_corr = roll_corr.mean()
                std_corr = roll_corr.std()

                if std_corr > 0:
                    z_score = (current_corr - mean_corr) / std_corr
                else:
                    z_score = 0

                if abs(z_score) > 1.5:
                    signal = "Alert"
                elif abs(z_score) > 1.0:
                    signal = "Warning"
                else:
                    signal = "Normal"

                anomalies.append({
                    "pair": pair,
                    "current_corr": float(current_corr),
                    "mean_corr": float(mean_corr),
                    "std_corr": float(std_corr),
                    "z_score": float(z_score),
                    "signal": signal
                })

        anomalies.sort(key=lambda x: abs(x["z_score"]), reverse=True)
        return anomalies

    def generate_insights(self, anomalies: List[Dict], group: str = "all") -> Dict:
        regime_notes = []
        allocation = []

        if group == "macro":
            returns = self._get_returns("macro")
            if 'VOO' in returns.columns and 'TLT' in returns.columns:
                recent = returns['VOO'].iloc[-120:].corr(returns['TLT'].iloc[-120:])
                if recent > 0.1:
                    regime_notes.append("Stock-Bond correlation is positive. Traditional 60/40 diversification is compromised.")
                    allocation.append("Consider adding commodities (GLD, PDBC) or cash to improve portfolio defense.")
                else:
                    regime_notes.append("Stock-Bond correlation is neutral to negative. 60/40 is functioning normally.")

            if 'VOO' in returns.columns and 'GLD' in returns.columns:
                recent = returns['VOO'].iloc[-120:].corr(returns['GLD'].iloc[-120:])
                if recent < -0.3:
                    regime_notes.append("Gold is negatively correlated with equities. Classic risk-off signal.")
                    allocation.append("Gold continues to provide effective portfolio hedging.")

            if 'PDBC' in returns.columns and 'GLD' in returns.columns:
                recent = returns['PDBC'].iloc[-120:].corr(returns['GLD'].iloc[-120:])
                if recent < 0.2:
                    regime_notes.append("Commodities (PDBC) and Gold (GLD) are decoupling. Inflation expectations may be shifting.")
                    allocation.append("Separate your commodity and gold allocations — they are serving different portfolio roles.")

        elif group == "equities":
            returns = self._get_returns("equities")
            if all(t in returns.columns for t in ['VOOG', 'VOOV']):
                recent = returns['VOOG'].iloc[-120:].corr(returns['VOOV'].iloc[-120:])
                if recent < 0.85:
                    regime_notes.append("Growth-Value correlation is declining. Significant style divergence in progress.")
                elif recent > 0.95:
                    regime_notes.append("Growth and Value are moving in lockstep. Low style dispersion regime.")

            if all(t in returns.columns for t in ['VOO', 'VXUS']):
                recent = returns['VOO'].iloc[-120:].corr(returns['VXUS'].iloc[-120:])
                if recent < 0.7:
                    regime_notes.append("US and International equities are diverging. Potential regime shift in global leadership.")

            for a in anomalies:
                if a['pair'] in ['VOO-COWZ', 'COWZ-VOO'] and a['z_score'] < -1.0:
                    allocation.append("Cash Cows (COWZ) are decoupling from the market. Good environment for factor diversification.")

        elif group == "fixed_income":
            returns = self._get_returns("fixed_income")
            if all(t in returns.columns for t in ['IEF', 'TLT']):
                recent = returns['IEF'].iloc[-120:].corr(returns['TLT'].iloc[-120:])
                if recent < 0.7:
                    regime_notes.append("Short-end and long-end Treasuries are decoupling. Yield curve dynamics are shifting.")

            if all(t in returns.columns for t in ['LQD', 'HYG']):
                recent = returns['LQD'].iloc[-120:].corr(returns['HYG'].iloc[-120:])
                if recent < 0.7:
                    regime_notes.append("Investment grade and high yield credit are diverging. Credit risk repricing in progress.")

            if all(t in returns.columns for t in ['TLT', 'TIP']):
                recent = returns['TLT'].iloc[-120:].corr(returns['TIP'].iloc[-120:])
                if recent < 0.5:
                    regime_notes.append("Nominal bonds and TIPS are diverging. Inflation expectations may be shifting rapidly.")

            if all(t in returns.columns for t in ['TLT', 'AGG']):
                recent = returns['TLT'].iloc[-120:].corr(returns['AGG'].iloc[-120:])
                if recent < 0.7:
                    regime_notes.append("Long-term Treasuries and Aggregate bonds are diverging. Duration positioning matters more than usual.")

        elif group == "commodities_alts":
            returns = self._get_returns("commodities_alts")
            if all(t in returns.columns for t in ['PDBC', 'USO']):
                recent = returns['PDBC'].iloc[-120:].corr(returns['USO'].iloc[-120:])
                if recent > 0.8:
                    regime_notes.append("Broad commodities are highly correlated with oil. Energy is driving the commodity complex.")

            if all(t in returns.columns for t in ['GLD', 'PDBC']):
                recent = returns['GLD'].iloc[-120:].corr(returns['PDBC'].iloc[-120:])
                if recent < 0.1:
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
            "allocation_suggestions": allocation
        }

analysis_service = AnalysisService()
