import { marketDataProvider } from "../services/marketData";
import { usePolling } from "../hooks/usePolling";
import { ErrorState, LoadingState } from "../components/states";
import { MarketOverview } from "../features/dashboard/MarketOverview";
import { TopOpportunities } from "../features/dashboard/TopOpportunities";
import { MoneyFlowLeaders } from "../features/dashboard/MoneyFlowLeaders";
import { CatalystPreview } from "../features/dashboard/CatalystPreview";

export default function DashboardPage() {
  // Conservative 60s polling — quotes refresh periodically, charts do not.
  const { data, loading, error, retry } = usePolling(
    () =>
      Promise.all([
        marketDataProvider.getUniverse(),
        marketDataProvider.getMarketOverview(),
        marketDataProvider.getEvents(),
      ]),
    [],
    60_000,
  );

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h2 className="text-xl font-bold tracking-tight text-ink">IDX STOCK INTELLIGENCE</h2>
        <p className="mt-0.5 text-sm text-muted">
          Discover potential capital-gain setups across the Indonesian market — money flow
          proxy, catalysts, accumulation, and anomaly risk, explained.
        </p>
      </div>

      {loading && !data && <LoadingState label="Loading market data…" />}
      {error && !data && <ErrorState message={error} onRetry={retry} />}

      {data && (
        <>
          <MarketOverview snapshot={data[1]} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TopOpportunities stocks={data[0].stocks} />
            </div>
            <div className="space-y-6">
              <MoneyFlowLeaders stocks={data[0].stocks} />
              <CatalystPreview actions={data[2].actions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
