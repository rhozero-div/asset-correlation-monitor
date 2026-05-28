"use client";

import dynamic from "next/dynamic";
import { FrontierResponse } from "@/lib/types";
import { tickerDisplay } from "@/lib/labels";

// Load plotly dynamically to avoid bundle size issues
const Plot = dynamic(() => 
  Promise.all([
    import("react-plotly.js/factory"),
    // @ts-expect-error - no types available for this specific dist
    import("plotly.js-cartesian-dist")
  ]).then(([factoryModule, plotlyModule]) => {
    const createPlotComponent = factoryModule.default;
    const Plotly = plotlyModule.default || plotlyModule;
    return createPlotComponent(Plotly);
  }), 
  { ssr: false, loading: () => <div className="w-full h-full min-h-[500px] animate-pulse bg-surface/50 rounded" /> }
);

interface Props {
  data: FrontierResponse | null;
  customPortfolio: { ret: number; vol: number; sharpe: number; weights: Record<string, number> } | null;
}

export default function FrontierPlot({ data, customPortfolio }: Props) {
  if (!data) return null;

  const { efPoints, maxSharpe, minVol, assetPoints } = data;
  
  // Need to bypass TypeScript for Plotly trace arrays since we're using any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traces: any[] = [];

  // Format hover text for weights
  const formatWeights = (weights: number[], tickers: string[]) => {
    if (!weights || weights.length !== tickers.length) return "";
    return tickers
      .map((t, i) => `${tickerDisplay(t)}: ${(weights[i] * 100).toFixed(1)}%`)
      .filter((_, i) => weights[i] > 0.005 || weights[i] < -0.005) // hide tiny weights
      .join("<br>");
  };

  const tickers = assetPoints.tickers;

  // 1. Efficient Frontier Curve
  if (efPoints && efPoints.length > 0) {
    const vols = efPoints.map((p) => p.vol);
    const rets = efPoints.map((p) => p.ret);
    const sharpes = efPoints.map((p) => p.sharpe);
    const hoverTexts = efPoints.map((p) => formatWeights(p.weights, tickers));

    traces.push({
      type: "scatter",
      x: vols,
      y: rets,
      mode: "lines+markers",
      name: "Efficient Frontier",
      line: { color: "#6c5ce7", width: 2 },
      marker: {
        size: 5,
        color: sharpes,
        colorscale: [
          [0, "#ff6b6b"], // Red for low Sharpe
          [0.5, "#ffd93d"], // Yellow for medium
          [1, "#00d4aa"] // Teal for high Sharpe
        ],
        showscale: true,
        colorbar: { 
          title: { text: "Sharpe Ratio", font: { color: "#9ca3af" } }, 
          x: 1.02,
          tickfont: { color: "#9ca3af" }
        },
      },
      text: hoverTexts,
      hovertemplate: "<b>Frontier Portfolio</b><br>Vol: %{x:.2%}<br>Ret: %{y:.2%}<br>Sharpe: %{marker.color:.3f}<br><br><b>Weights:</b><br>%{text}<extra></extra>",
    });
  }

  // 2. Individual Assets
  if (assetPoints && assetPoints.tickers.length > 0) {
    traces.push({
      type: "scatter",
      x: assetPoints.vol,
      y: assetPoints.ret,
      mode: "markers+text",
      name: "Assets",
      marker: { symbol: "circle", size: 8, color: "#6b7280" },
      text: assetPoints.tickers.map(tickerDisplay),
      textposition: "top center",
      textfont: { color: "#9ca3af" },
      hovertemplate: "<b>%{text}</b><br>Vol: %{x:.2%}<br>Ret: %{y:.2%}<extra></extra>",
    });
  }

  // 3. Min Volatility Portfolio
  if (minVol) {
    traces.push({
      type: "scatter",
      x: [minVol.vol],
      y: [minVol.ret],
      mode: "markers+text",
      name: "Min Volatility",
      marker: { symbol: "diamond", size: 14, color: "#74b9ff", line: { width: 1, color: "#fff" } },
      text: ["Min Vol"],
      textposition: "bottom center",
      textfont: { color: "#74b9ff", weight: "bold" },
      hovertext: [formatWeights(minVol.weights, tickers)],
      hovertemplate: "<b>💎 Min Volatility</b><br>Vol: %{x:.2%}<br>Ret: %{y:.2%}<br>Sharpe: %{customdata:.3f}<br><br><b>Weights:</b><br>%{hovertext}<extra></extra>",
      customdata: [minVol.sharpe]
    });
  }

  // 4. Max Sharpe Portfolio
  if (maxSharpe) {
    traces.push({
      type: "scatter",
      x: [maxSharpe.vol],
      y: [maxSharpe.ret],
      mode: "markers+text",
      name: "Max Sharpe",
      marker: { symbol: "star", size: 18, color: "#ffd93d", line: { width: 1, color: "#fff" } },
      text: ["Max Sharpe"],
      textposition: "top center",
      textfont: { color: "#ffd93d", weight: "bold" },
      hovertext: [formatWeights(maxSharpe.weights, tickers)],
      hovertemplate: "<b>⭐ Max Sharpe</b><br>Vol: %{x:.2%}<br>Ret: %{y:.2%}<br>Sharpe: %{customdata:.3f}<br><br><b>Weights:</b><br>%{hovertext}<extra></extra>",
      customdata: [maxSharpe.sharpe]
    });
  }

  // 5. Custom Portfolio
  if (customPortfolio) {
    // Format custom weights for hover
    const customWeightsText = Object.entries(customPortfolio.weights)
      .filter(([, w]) => w > 0.5 || w < -0.5) // filter > 0.5%
      .map(([t, w]) => `${t}: ${w.toFixed(1)}%`)
      .join("<br>");

    traces.push({
      type: "scatter",
      x: [customPortfolio.vol],
      y: [customPortfolio.ret],
      mode: "markers+text",
      name: "Your Portfolio",
      marker: { symbol: "x", size: 14, color: "#ff8a5c", line: { width: 2, color: "#ff8a5c" } },
      text: ["Your Portfolio"],
      textposition: "middle right",
      textfont: { color: "#ff8a5c", weight: "bold" },
      hovertext: [customWeightsText],
      hovertemplate: "<b>❌ Your Portfolio</b><br>Vol: %{x:.2%}<br>Ret: %{y:.2%}<br>Sharpe: %{customdata:.3f}<br><br><b>Weights:</b><br>%{hovertext}<extra></extra>",
      customdata: [customPortfolio.sharpe]
    });
  }

  return (
    <div className="card h-[600px]">
      <h3 className="text-xl font-semibold mb-4 text-accent">Efficient Frontier</h3>
      <div className="w-full h-[500px]">
        <Plot
          data={traces}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#e5e5e5" },
            hovermode: "closest",
            xaxis: { 
              title: { text: "Annualized Risk (Volatility σ)" }, 
              tickformat: ".0%", 
              gridcolor: "#2a2a3a", 
              zerolinecolor: "#3f3f46" 
            },
            yaxis: { 
              title: { text: "Annualized Expected Return (μ)" }, 
              tickformat: ".0%", 
              gridcolor: "#2a2a3a", 
              zerolinecolor: "#3f3f46" 
            },
            margin: { l: 60, r: 20, t: 20, b: 50 },
            showlegend: false, // Too cluttered, we use text labels on markers
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
