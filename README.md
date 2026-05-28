# Asset Correlation Monitor

A web-based macroeconomic asset allocation and correlation monitor. Tracks **19 assets** across **4 hierarchical groups** (Macro, Equities, Fixed Income, Commodities & Alts), calculating rolling correlations, volatility, returns, and detecting anomaly signals (Z-scores) to guide portfolio allocation.

> **Acknowledgments**
> * The core analytical framework and asset allocation insights were inspired by the excellent discussions on the [《面基》播客 (资产配置与有效前沿：去找更好的，更不一样的，更贴近时代的)](https://www.xiaoyuzhoufm.com/episode/6a097340e1eb34a9398d4dc9).
> * The GARCH + Kalman Filter dynamic correlation algorithm and the Markowitz Efficient Frontier optimization architecture were adapted from [TwoPendulum/portfolio-analytics-suite](https://github.com/TwoPendulum/portfolio-analytics-suite).

## Live Demo
🚀 **[https://asset-correlation-monitor.pages.dev](https://asset-correlation-monitor.pages.dev)**

## Architecture

*   **Backend**: Python, FastAPI, Pandas, yfinance (Hosted on Hugging Face Spaces Docker)
*   **Frontend**: Next.js 14, React, Tailwind CSS, Recharts, Plotly.js (Hosted on Cloudflare Pages)
*   **Data**: Daily adjusted close prices cached locally. Features dead-column detection and per-ticker retry for yfinance flaky downloads.

### Asset Groups

| Group | Assets | Purpose |
|-------|--------|---------|
| **Macro** | VOO, AGG, PDBC, GLD, VNQ, BTC-USD | Cross-asset regime monitoring |
| **Equities** | VOO, VOOG, VOOV, QQQ, IWM, COWZ, VXUS | Style & factor rotation |
| **Fixed Income** | AGG, TLT, IEF, VGSH, LQD, HYG, TIP | Duration & credit spreads |
| **Commodities & Alts** | PDBC, GLD, USO, BTC-USD | Commodity & crypto sub-analysis |

## Features

*   **Hierarchical Group Navigation**: Two-tier tabs — switch between 4 macro groups, then drill into Overview / Time Series / Insights.
*   **Dynamic Correlation (Kalman Filter)**: Replaces standard rolling windows with a GARCH(1,1) + 1D Kalman Filter (random walk) algorithm to eliminate "ghost effects", offering 3 sensitivity tiers (Fast / Standard / Smooth).
*   **Efficient Frontier Optimizer**: A standalone sandbox to run Markowitz mean-variance optimization across all 19 assets using the latest Smooth Kalman covariance matrix. Features Max Sharpe, Min Vol, and editable forward estimates with localStorage persistence.
*   **Overview Dashboard**: Summary statistics (CAGR, Vol, Max DD) and Correlation Heatmaps (Fast vs Smooth sensitivities), sorted by historical volatility within each group.
*   **Rolling Time Series (Multi-Line)**: Select a base asset to view N−1 correlation lines simultaneously. Shows rolling volatility for all assets at once.
*   **Anomaly Signals**: Z-Score based alerting for ETF pairs diverging from historical norms.
*   **Insights Panel**: Auto-generated regime notes and allocation suggestions based on current correlations.
*   **Stale Response Protection**: Tracks latest group/window params to ignore stale Promise resolves.
*   **Custom Hover Tooltips**: Hovering over tickers in Summary, Forward Table, Custom Portfolio, and Anomaly Signals shows full asset definitions (e.g. "BTC" → "Bitcoin (USD)").

## Recent Fixes

*   **Time Series date alignment**: Fixed a bug where `iloc` positional sampling caused BTC-USD (weekend data) and ETFs (trading days only) to produce disjoint date sets, resulting in invisible lines on the Rolling Time Series chart. Now samples from the union of all dates so all series share the same x-axis.
*   **Ticker hover definitions**: Replaced native `title` attribute (unreliable on macOS) with custom styled React tooltips across all table components.

## Local Setup

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install --upgrade yfinance  # Ensure latest for API compatibility
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Running Locally

You can start both the backend and frontend simultaneously using the provided script:

```bash
chmod +x start.sh
./start.sh
```

Or run them individually:

**Backend:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8012
```

**Frontend:**
```bash
cd frontend
npm run dev -- -p 3012
```

Open [http://localhost:3012](http://localhost:3012) in your browser.
