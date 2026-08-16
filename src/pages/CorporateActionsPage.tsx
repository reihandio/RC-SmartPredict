import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { CorporateAction } from "../types";
import { marketDataProvider } from "../services/marketData";
import { useAsync } from "../hooks/useAsync";
import { ErrorState, LoadingState } from "../components/states";
import { Card } from "../components/ui/Card";
import { ActionList } from "../features/corporate-actions/ActionList";
import { cn } from "../lib/utils";

type ImpactFilter = "ALL" | CorporateAction["impact"];

const IMPACT_FILTERS: Array<{ id: ImpactFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "POSITIVE", label: "Positive" },
  { id: "NEUTRAL", label: "Neutral" },
];

const ACTION_TYPES: Array<CorporateAction["type"] | "ALL"> = ["ALL", "Dividend", "Stock Split"];

function ImpactTiles({ actions }: { actions: CorporateAction[] }) {
  const pos = actions.filter((a) => a.impact === "POSITIVE").length;
  const neu = actions.filter((a) => a.impact === "NEUTRAL").length;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="card-pad fade-up text-center">
        <div className="num text-2xl font-bold text-up">{pos}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Positive (dividends)
        </div>
      </Card>
      <Card className="card-pad fade-up text-center" style={{ animationDelay: "60ms" }}>
        <div className="num text-2xl font-bold text-ink2">{neu}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Neutral (splits)
        </div>
      </Card>
    </div>
  );
}

export default function CorporateActionsPage() {
  const { data, loading, error, retry } = useAsync(
    () => marketDataProvider.getEvents(),
    [],
  );
  const [impact, setImpact] = useState<ImpactFilter>("ALL");
  const [type, setType] = useState<CorporateAction["type"] | "ALL">("ALL");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.actions.filter((a) => {
      if (impact !== "ALL" && a.impact !== impact) return false;
      if (type !== "ALL" && a.type !== type) return false;
      return true;
    });
  }, [data, impact, type]);

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h2 className="text-xl font-bold tracking-tight text-ink">Corporate Action Radar</h2>
        <p className="mt-0.5 text-sm text-muted">
          Company events that can move prices — dividends and stock splits from the free data
          provider, with catalyst scores.
        </p>
      </div>

      <div className="fade-up flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-ink2" style={{ animationDelay: "40ms" }}>
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
        <span>
          The current free data source provides dividends and stock splits only. Other corporate
          action types (buybacks, acquisitions, mergers, rights issues, contracts, ownership
          changes) are <strong>data unavailable</strong> — a dedicated corporate-action provider
          can be added later.
        </span>
      </div>

      {loading && !data && <LoadingState label="Scanning corporate actions…" />}
      {error && !data && <ErrorState message={error} onRetry={retry} />}

      {data && (
        <>
          <ImpactTiles actions={data.actions} />

          <Card className="card-pad fade-up" style={{ animationDelay: "180ms" }}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex overflow-hidden rounded-lg border border-white/10">
                {IMPACT_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setImpact(f.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold transition",
                      impact === f.id
                        ? "bg-accent/15 text-accent"
                        : "text-muted hover:bg-white/5 hover:text-ink2",
                    )}
                    aria-pressed={impact === f.id}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CorporateAction["type"] | "ALL")}
                className="rounded-lg border border-white/10 bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-ink2 transition hover:border-white/20 focus:border-accent focus:outline-none"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "ALL" ? "All event types" : t}
                  </option>
                ))}
              </select>
              <span className="num ml-auto text-xs text-muted">{filtered.length} events</span>
            </div>
          </Card>

          <div className="fade-up" style={{ animationDelay: "240ms" }}>
            <ActionList actions={filtered} />
          </div>
        </>
      )}
    </div>
  );
}
