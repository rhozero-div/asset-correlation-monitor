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
