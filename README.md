# Asset Correlation Monitor

A web-based macroeconomic asset allocation and correlation monitor. It tracks 11 key ETFs across equities, bonds, and commodities, calculating rolling correlations, volatility, returns, and detecting anomaly signals (Z-scores) to guide portfolio allocation.

> **Acknowledgments**
> The core analytical framework and asset allocation insights implemented in this project were inspired by the excellent discussions on the [《面基》播客 (资产配置与有效前沿：去找更好的，更不一样的，更贴近时代的)](https://www.xiaoyuzhoufm.com/episode/6a097340e1eb34a9398d4dc9).

## Live Demo
🚀 **[https://asset-correlation-monitor.pages.dev](https://asset-correlation-monitor.pages.dev)**

## Architecture

*   **Backend**: Python, FastAPI, Pandas, yfinance (Hosted on Hugging Face Spaces Docker)
*   **Frontend**: Next.js 14, React, Tailwind CSS, Recharts, Plotly.js (Hosted on Cloudflare Pages)
*   **Data**: Daily adjusted close prices cached locally. Features an intelligent anti-abuse refresh mechanism that checks the latest market date to avoid unnecessary full downloads and rate limits.

## Features

*   **Overview Dashboard**: Summary statistics (CAGR, Vol, Max DD) and Correlation Heatmaps (Recent vs Long-Term).
*   **Rolling Time Series**: Interactive charts for rolling correlation and volatility.
*   **Anomaly Signals**: Z-Score based alerting for ETF pairs diverging from historical norms.
*   **Insights Panel**: Auto-generated regime notes and allocation suggestions based on current correlations.

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
npm run dev -p 3012
```

Open [http://localhost:3012](http://localhost:3012) in your browser.
