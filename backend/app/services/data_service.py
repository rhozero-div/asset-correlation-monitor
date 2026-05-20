import yfinance as yf
import pandas as pd
from pathlib import Path
import os
from datetime import datetime

TICKERS = ["VOO", "QQQ", "IWM", "COWZ", "TLT", "IEF", "VGSH", "AGG", "LQD", "GLD", "PDBC"]
START_DATE = "2016-01-01"  # COWZ started late 2016

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
            
            # Simple check if data is reasonably fresh (within last couple of weekdays)
            # If not, auto refresh. For simplicity, if last date is < today - 3 days.
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
        # Download all at once
        data = yf.download(TICKERS, start=START_DATE, group_by='ticker', auto_adjust=False)
        
        # Extract Adj Close
        adj_close = pd.DataFrame()
        
        if len(TICKERS) == 1: # Fallback if only 1 ticker
             adj_close[TICKERS[0]] = data['Adj Close']
        else:
            for ticker in TICKERS:
                if ticker in data and 'Adj Close' in data[ticker]:
                    adj_close[ticker] = data[ticker]['Adj Close']
                elif ('Adj Close', ticker) in data.columns: # Alternative yfinance format
                    adj_close[ticker] = data['Adj Close', ticker]

        # Forward fill missing values (e.g. holidays) and drop rows with all NAs
        adj_close = adj_close.ffill().dropna(how='all')
        
        # Save to CSV
        adj_close.to_csv(self.prices_file)
        self.df = adj_close
        print(f"Data saved to {self.prices_file}. Shape: {self.df.shape}")
        return True
        
    def load_data(self) -> pd.DataFrame:
        if self.df is None:
            if not self.prices_file.exists():
                self.refresh_data()
            else:
                self.df = pd.read_csv(self.prices_file, index_col=0, parse_dates=True)
        return self.df

    def get_last_date(self) -> str:
        if self.df is not None and not self.df.empty:
            return str(self.df.index[-1].date())
        return "N/A"

data_service = DataService()
