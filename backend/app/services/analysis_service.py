import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
from .data_service import data_service

class AnalysisService:
    def __init__(self):
        pass

    def _get_returns(self) -> pd.DataFrame:
        df = data_service.load_data()
        return df.pct_change(fill_method=None).dropna(how='all')

    def get_summary_stats(self) -> List[Dict]:
        df = data_service.load_data()
        returns = self._get_returns()
        
        stats = []
        last_date = df.index[-1]
        
        for ticker in df.columns:
            series = df[ticker].dropna()
            if series.empty: continue
            
            # Calculate CAGRs
            def get_cagr(start_date, end_date, start_val, end_val):
                days = (end_date - start_date).days
                if days < 30 or start_val <= 0: return None
                years = days / 365.25
                return (end_val / start_val) ** (1 / years) - 1

            ytd_start = pd.to_datetime(f"{last_date.year}-01-01")
            
            # Handle cases where series might not have the exact date
            def safe_get_price(target_date):
                # get closest price on or before target date
                subset = series[:target_date]
                return subset.iloc[-1] if not subset.empty else None

            price_last = series.iloc[-1]
            price_ytd = safe_get_price(ytd_start)
            price_1y = safe_get_price(last_date - pd.DateOffset(years=1))
            price_3y = safe_get_price(last_date - pd.DateOffset(years=3))
            price_5y = safe_get_price(last_date - pd.DateOffset(years=5))
            price_start = series.iloc[0]

            cagr_ytd = (price_last / price_ytd - 1) if price_ytd else None # YTD is simple return, not annualized usually, but we'll return it as simple return
            cagr_1y = get_cagr(last_date - pd.DateOffset(years=1), last_date, price_1y, price_last) if price_1y else None
            cagr_3y = get_cagr(last_date - pd.DateOffset(years=3), last_date, price_3y, price_last) if price_3y else None
            cagr_5y = get_cagr(last_date - pd.DateOffset(years=5), last_date, price_5y, price_last) if price_5y else None
            cagr_all = get_cagr(series.index[0], last_date, price_start, price_last)

            # Volatility (annualized)
            vol_all = returns[ticker].std() * np.sqrt(252)

            # Max Drawdown
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

    def get_rolling_correlation(self, window: int = 120) -> Dict[str, List[Dict[str, float]]]:
        returns = self._get_returns()
        tickers = returns.columns
        res = {}
        
        # Calculate rolling correlation for all pairs
        for i in range(len(tickers)):
            for j in range(i+1, len(tickers)):
                t1, t2 = tickers[i], tickers[j]
                pair = f"{t1}-{t2}"
                roll_corr = returns[t1].rolling(window).corr(returns[t2]).dropna()
                
                # Sample every N days to reduce payload size, e.g. every 5 days (weekly)
                sampled = roll_corr.iloc[::5]
                
                points = [{"date": str(idx.date()), "value": val} for idx, val in sampled.items()]
                res[pair] = points
                
        return res

    def get_rolling_volatility(self, window: int = 60) -> Dict[str, List[Dict[str, float]]]:
        returns = self._get_returns()
        res = {}
        
        for ticker in returns.columns:
            roll_vol = returns[ticker].rolling(window).std() * np.sqrt(252)
            roll_vol = roll_vol.dropna()
            
            sampled = roll_vol.iloc[::5]
            points = [{"date": str(idx.date()), "value": val} for idx, val in sampled.items()]
            res[ticker] = points
            
        return res

    def get_correlation_matrix(self, window: int = None) -> Tuple[List[str], List[List[float]]]:
        returns = self._get_returns()
        if window:
            returns = returns.iloc[-window:]
            
        corr_matrix = returns.corr().fillna(0)
        tickers = corr_matrix.columns.tolist()
        matrix = corr_matrix.values.tolist()
        
        return tickers, matrix

    def get_anomalies(self, window: int = 120) -> List[Dict]:
        returns = self._get_returns()
        tickers = returns.columns
        anomalies = []
        
        # Full period correlation
        full_corr = returns.corr()
        
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
                
        # Sort by absolute z-score descending
        anomalies.sort(key=lambda x: abs(x["z_score"]), reverse=True)
        return anomalies

    def generate_insights(self, anomalies: List[Dict]) -> Dict:
        regime_notes = []
        allocation = []
        
        # Simple rule-based generation
        # Check VOO vs TLT
        returns = self._get_returns()
        if 'VOO' in returns.columns and 'TLT' in returns.columns:
            recent_voo_tlt = returns['VOO'].iloc[-120:].corr(returns['TLT'].iloc[-120:])
            if recent_voo_tlt > 0.1:
                regime_notes.append("⚠️ Stock-Bond correlation is positive. Traditional 60/40 diversification is compromised.")
                allocation.append("Consider adding commodities (GLD, PDBC) or cash (VGSH) to improve portfolio defense, as long-term bonds are currently moving with equities.")
            else:
                regime_notes.append("✅ Stock-Bond correlation is neutral to negative. 60/40 is functioning normally.")
                
        # Check VOO vs COWZ
        if 'VOO' in returns.columns and 'COWZ' in returns.columns:
            recent_voo_cowz = returns['VOO'].iloc[-120:].corr(returns['COWZ'].iloc[-120:])
            for a in anomalies:
                if a['pair'] in ['VOO-COWZ', 'COWZ-VOO'] and a['z_score'] < -1.0:
                    regime_notes.append("🔄 Value (COWZ) is decoupling from broad market (VOO).")
                    allocation.append("Good environment for factor diversification. Tilting towards Cash Cows (COWZ) might offer un-correlated returns.")

        # Check TLT vs PDBC
        if 'TLT' in returns.columns and 'PDBC' in returns.columns:
            recent_tlt_pdbc = returns['TLT'].iloc[-120:].corr(returns['PDBC'].iloc[-120:])
            if recent_tlt_pdbc < -0.3:
                regime_notes.append("🔥 Strong negative correlation between Bonds (TLT) and Commodities (PDBC). Potential inflation regime indicator.")
                allocation.append("Ensure adequate commodity exposure (PDBC/GLD) to hedge against inflation shocks which hurt duration assets (TLT).")

        if not regime_notes:
            regime_notes.append("Market correlations are largely within historical norms.")
        if not allocation:
            allocation.append("Maintain strategic asset allocation weights.")

        return {
            "regime_notes": regime_notes,
            "allocation_suggestions": allocation
        }

analysis_service = AnalysisService()
