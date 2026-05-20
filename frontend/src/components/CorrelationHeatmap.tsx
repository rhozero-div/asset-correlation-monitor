"use client";

import dynamic from "next/dynamic";
import { MatrixResponse } from "@/lib/types";

// Load plotly basic/cartesian dynamically to avoid 28MB bundle size
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
  { ssr: false }
);

export default function CorrelationHeatmap({
  recent,
  longTerm,
}: {
  recent: MatrixResponse | null;
  longTerm: MatrixResponse | null;
}) {
  if (!recent || !longTerm) return <div className="card h-[400px] animate-pulse" />;

  const renderHeatmap = (title: string, data: MatrixResponse) => {
    return (
      <div className="w-full h-full min-h-[350px]">
        <Plot
          data={[
            {
              z: data.matrix,
              x: data.tickers,
              y: data.tickers,
              type: "heatmap",
              colorscale: "RdBu",
              zmin: -1,
              zmax: 1,
              hoverongaps: false,
              texttemplate: "%{z:.2f}",
              showscale: false,
            },
          ]}
          layout={{
            title: { text: title, font: { color: "#e5e5e5", size: 14 } },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            margin: { t: 40, l: 50, r: 20, b: 50 },
            xaxis: { tickfont: { color: "#e5e5e5" }, tickangle: -45 },
            yaxis: { tickfont: { color: "#e5e5e5" }, autorange: "reversed" },
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  };

  return (
    <div className="card">
      <h3 className="text-xl font-semibold mb-2 text-accent">Correlation Matrices</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded border border-border p-2 bg-surface">
          {renderHeatmap("Recent (Rolling Window)", recent)}
        </div>
        <div className="rounded border border-border p-2 bg-surface">
          {renderHeatmap("Long-Term (Full Period)", longTerm)}
        </div>
      </div>
    </div>
  );
}
