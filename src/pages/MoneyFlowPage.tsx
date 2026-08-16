import { marketDataProvider } from "../services/marketData";
import { usePolling } from "../hooks/usePolling";
import { ErrorState, LoadingState } from "../components/states";
import { Card } from "../components/ui/Card";
import { StockTable } from "../components/StockTable";
import { FlowLeaderboard } from "../features/money-flow/FlowLeaderboard";

export default function MoneyFlowPage() {
  const { data, loading, error, retry } = usePolling(
    () => marketDataProvider.getUniverse(),
    [],
    60_000,
  );

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h2 className="text-xl font-bold tracking-tight text-ink">Big Money Radar</h2>
        <p className="mt-0.5 text-sm text-muted">
          Money Flow Proxy — a derived indicator from real price × volume data. It detects
          accumulation-like behavior, not any specific investor's activity.
        </p>
      </div>

      {loading && !data && <LoadingState label="Scanning money flow…" />}
      {error && !data && <ErrorState message={error} onRetry={retry} />}

      {data && (
        <>
          <FlowLeaderboard stocks={data.stocks} />

          <Card className="card-pad fade-up" style={{ animationDelay: "120ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">All Stocks by Money Flow Proxy</h2>
              <span className="num text-xs text-muted">{data.stocks.length} stocks</span>
            </div>
            <StockTable
              stocks={data.stocks}
              columns={[
                "ticker",
                "price",
                "changePercent",
                "volumeRatio",
                "moneyFlow",
                "accumulation",
                "risk",
                "overallScore",
                "signal",
              ]}
              defaultSort={{ key: "moneyFlow", dir: "desc" }}
              emptyTitle="No stocks available"
            />
          </Card>
        </>
      )}
    </div>
  );
}
