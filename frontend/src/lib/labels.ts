const TICKER_DISPLAY: Record<string, string> = {
  "BTC-USD": "BTC",
};

export function tickerDisplay(ticker: string): string {
  let result = ticker;
  for (const [raw, display] of Object.entries(TICKER_DISPLAY)) {
    result = result.replaceAll(raw, display);
  }
  return result;
}

export const TYPICAL_PORTFOLIO_TICKERS = [
  "VOO", "QQQ", "COWZ", "VGSH", "LQD", "TLT", "GLD", "PDBC", "BTC-USD",
];

export const TICKER_DEFINITIONS: Record<string, string> = {
  VOO: "Vanguard S&P 500 ETF",
  QQQ: "Invesco QQQ Trust (Nasdaq-100)",
  COWZ: "Pacer US Cash Flows 100 ETF",
  VGSH: "Vanguard Short-Term Treasury ETF",
  AGG: "iShares Core US Aggregate Bond ETF",
  TIP: "iShares TIPS Bond ETF",
  IEF: "iShares 7-10 Year Treasury Bond ETF",
  HYG: "iShares iBoxx $ High Yield Corporate Bond ETF",
  LQD: "iShares iBoxx $ Investment Grade Corporate Bond ETF",
  TLT: "iShares 20+ Year Treasury Bond ETF",
  GLD: "SPDR Gold Shares",
  VOOV: "Vanguard S&P 500 Value ETF",
  VXUS: "Vanguard Total International Stock ETF",
  PDBC: "Invesco Optimum Yield Diversified Commodity Strategy No K-1 ETF",
  VOOG: "Vanguard S&P 500 Growth ETF",
  VNQ: "Vanguard Real Estate ETF",
  IWM: "iShares Russell 2000 ETF",
  USO: "United States Oil Fund",
  "BTC-USD": "Bitcoin (USD)",
};

const TICKER_DEF_KEYS = Object.keys(TICKER_DEFINITIONS).sort((a, b) => b.length - a.length);

export function pairDefinitions(pair: string): string {
  const found: string[] = [];
  let remaining = pair;
  for (const key of TICKER_DEF_KEYS) {
    if (remaining.includes(key)) {
      found.push(TICKER_DEFINITIONS[key]);
      remaining = remaining.replace(key, "");
    }
  }
  return found.join(" / ") || pair;
}
