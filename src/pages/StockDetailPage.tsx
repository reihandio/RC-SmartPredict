import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { TimeRange } from "../types";
import { marketDataProvider } from "../services/marketData";
import { buildIntelligenceReport } from "../services/signals";
import { useAsync } from "../hooks/useAsync";
import { usePolling } from "../hooks/usePolling";
import { ErrorState, LoadingState } from "../components/states";
import { Card } from "../components/ui/Card";
import { PriceChart, TIME_RANGES } from "../components/PriceChart";
import { StockHeader } from "../features/stock/StockHeader";
import { IntelligenceSummary } from "../features/stock/IntelligenceSummary";
import { MoneyFlowDetail } from "../features/stock/MoneyFlowDetail";
import { WhyPanel } from "../features/stock/WhyPanel";
import { EntryExitPanel } from "../features/stock/EntryExitPanel";
import { LargeActivityPanel } from "../features/stock/LargeActivityPanel";
import { RecentActions } from "../features/stock/RecentActions";
import { BrokerVolumeTabs } from "../features/stock/BrokerVolumeTabs";
import { cn } from "../lib/utils";
import { C } from "../lib/colors";

export default function StockDetailPage() {
  const { ticker = "" } = useParams();
  const t = ticker.toUpperCase();
  const [range, setRange] = useState<TimeRange>("6M");
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);

  // 60s polling on quotes; chart data uses its own cache and is not re-polled.
  const { data, loading, error, retry } = usePolling(
    () => marketDataProvider.getStockDetail(t),
    [t],
    60_000,
  );

  const history = useAsync(
    () => marketDataProvider.getHistoricalPrices(t, range),
    [t, range],
  );

  const report = useMemo(() => {
    if (!data) return undefined;
    const action = data.actions?.[0];
    const catalystNote = action
      ? `${action.type}: ${action.description} (${action.date})`
      : undefined;
    return buildIntelligenceReport(data.stock, catalystNote);
  }, [data]);

  if (!loading && !error && data && !data.stock) {
    return (
      <div className="card">
        <ErrorState message={`Data unavailable for ticker "${t}".`} />
        <div className="pb-8 text-center">
          <Link
            to="/screener"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-surface2 px-3 py-1.5 text-xs font-semibold text-ink2 transition hover:border-white/20 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to screener
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/screener"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Screener
      </Link>

      {loading && !data && <LoadingState label="Loading stock…" />}
      {error && !data && <ErrorState message={error} onRetry={retry} />}

      {data && report && (
        <>
          <StockHeader stock={data.stock} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              {/* Chart card */}
              <Card className="card-pad fade-up" style={{ animationDelay: "60ms" }}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-white/10">
                      {TIME_RANGES.map((r) => (
                        <button
                          key={r}
                          onClick={() => setRange(r)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-semibold transition",
                            range === r ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-ink2",
                          )}
                          aria-pressed={range === r}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {/* Overlay legend: SMA (blue) / EMA (orange) */}
                    <button
                      onClick={() => setShowSMA((v) => !v)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold transition",
                        showSMA
                          ? "border-white/20 bg-white/5 text-ink2"
                          : "border-white/10 text-muted hover:text-ink2",
                      )}
                      aria-pressed={showSMA}
                    >
                      <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: C.series1 }} aria-hidden />
                      SMA 20
                    </button>
                    <button
                      onClick={() => setShowEMA((v) => !v)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold transition",
                        showEMA
                          ? "border-white/20 bg-white/5 text-ink2"
                          : "border-white/10 text-muted hover:text-ink2",
                      )}
                      aria-pressed={showEMA}
                    >
                      <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: C.series2 }} aria-hidden />
                      EMA 20
                    </button>
                  </div>
                </div>
                {history.error ? (
                  <ErrorState message={history.error} onRetry={history.retry} />
                ) : history.data ? (
                  <PriceChart
                    data={history.data}
                    range={range}
                    loading={history.loading}
                    showSMA={showSMA}
                    showEMA={showEMA}
                  />
                ) : (
                  <LoadingState label="Loading chart…" />
                )}
              </Card>

              <IntelligenceSummary stock={data.stock} />
              <MoneyFlowDetail stock={data.stock} />
              {/* NEW (13a/13b): Bandarmology + Volume Quality tabs — additive */}
              <BrokerVolumeTabs ticker={t} />
            </div>

            <div className="space-y-5">
              <WhyPanel report={report} />
              <EntryExitPanel stock={data.stock} />
              <LargeActivityPanel stock={data.stock} />
              <RecentActions actions={data.actions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
