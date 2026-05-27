import yfinance as yf
import pandas as pd
from pathlib import Path
import os
from datetime import datetime

TICKERS = [
    # Fixed Income (low vol to high vol)
    "VGSH", "AGG", "TIP", "IEF", "HYG", "LQD", "TLT",
    # Equities & Real Estate
    "GLD", "VOOV", "VXUS", "PDBC", "VOO", "COWZ",
    "VOOG", "VNQ", "QQQ", "IWM",
    # High vol
    "USO", "BTC-USD",
]
CRYPTO_TICKERS = ["BTC-USD"]
START_DATE = "2016-01-01"  # COWZ started late 2016

ASSET_GROUPS = {
    "all": TICKERS,
    "macro": ["VOO", "AGG", "PDBC", "GLD", "VNQ", "BTC-USD"],
    "equities": ["VOOV", "VXUS", "VOO", "COWZ", "VOOG", "QQQ", "IWM"],
    "fixed_income": ["VGSH", "AGG", "TIP", "IEF", "HYG", "LQD", "TLT"],
    "commodities_alts": ["GLD", "PDBC", "USO", "BTC-USD"],
}

class DataService:
    def __init__(self, cache_dir: str = "../cache"):
        self.cache_dir = Path(__file__).parent.parent.parent / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.prices_file = self.cache_dir / "prices.csv"
        self.df: pd.DataFrame = None

    def ensure_data(self):
        if not self.prices_file.exists():
            self.refresh_data()
        else:
            self.load_data()

            # Check if the cached data has all expected tickers
            if not self.df.empty:
                missing = [t for t in TICKERS if t not in self.df.columns]
                if missing:
                    print(f"Missing tickers in cache: {missing}. Refreshing...")
                    self.refresh_data(force=True)
                    return

            # Simple check if data is reasonably fresh (within last couple of weekdays)
            if not self.df.empty:
                last_date = pd.to_datetime(self.df.index[-1]).date()
                today = datetime.now().date()
                if (today - last_date).days > 3:
                    print("Data seems stale, refreshing...")
                    self.refresh_data()

    def refresh_data(self, force: bool = False):
        # Check if we already have the latest data to prevent unnecessary full downloads
        if not force and self.df is not None and not self.df.empty:
            try:
                # Do a tiny fetch to see what the latest available market date is
                check_df = yf.download("VOO", period="5d", progress=False)
                if not check_df.empty:
                    latest_market_date = check_df.index[-1].date()
                    current_last_date = self.df.index[-1].date()
                    
                    if current_last_date >= latest_market_date:
                        print(f"Cache is already up-to-date (Latest market date: {latest_market_date}). Skipping full download.")
                        return False # No update needed
            except Exception as e:
                print(f"Quick check failed: {e}")

        print(f"Downloading data for {len(TICKERS)} tickers...")

        # Separate ETFs from crypto (BTC-USD has no Adj Close)
        etf_tickers = [t for t in TICKERS if t not in CRYPTO_TICKERS]

        # Download ETFs together
        all_prices = pd.DataFrame()
        if etf_tickers:
            etf_data = yf.download(etf_tickers, start=START_DATE, group_by='ticker', auto_adjust=False)
            for ticker in etf_tickers:
                if ticker in etf_data and 'Adj Close' in etf_data[ticker]:
                    all_prices[ticker] = etf_data[ticker]['Adj Close']
                elif ('Adj Close', ticker) in etf_data.columns:
                    all_prices[ticker] = etf_data['Adj Close', ticker]

        # Download crypto separately (Close price, no Adj Close)
        for ticker in CRYPTO_TICKERS:
            try:
                crypto_data = yf.download(ticker, start=START_DATE, auto_adjust=False, progress=False)
                if not crypto_data.empty and 'Close' in crypto_data.columns:
                    all_prices[ticker] = crypto_data['Close']
            except Exception as e:
                print(f"Failed to download {ticker}: {e}")

        if all_prices.empty:
            print("ERROR: No data downloaded!")
            return False

        # Forward fill ETFs (but not crypto which trades 24/7)
        etf_cols = [c for c in all_prices.columns if c not in CRYPTO_TICKERS]
        all_prices[etf_cols] = all_prices[etf_cols].ffill()
        all_prices = all_prices.dropna(how='all')

        # Save to CSV
        all_prices.to_csv(self.prices_file)
        self.df = all_prices
        print(f"Data saved to {self.prices_file}. Shape: {self.df.shape}")
        return True
        
    def load_data(self) -> pd.DataFrame:
        if self.df is None:
            if not self.prices_file.exists():
                self.refresh_data()
            else:
                self.df = pd.read_csv(self.prices_file, index_col=0, parse_dates=True)
                # Auto-refresh if new tickers were added to config
                missing = [t for t in TICKERS if t not in self.df.columns]
                if missing:
                    print(f"Missing tickers in cache: {missing}. Refreshing...")
                    self.refresh_data(force=True)
        return self.df

    def get_last_date(self) -> str:
        if self.df is not None and not self.df.empty:
            return str(self.df.index[-1].date())
        return "N/A"

    def get_tickers_for_group(self, group: str) -> list:
        return ASSET_GROUPS.get(group, TICKERS)

data_service = DataService()
