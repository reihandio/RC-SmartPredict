import { useMemo, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { CorporateAction } from "../types";
import { CORPORATE_ACTION_TYPES } from "../types";
import { marketDataProvider } from "../services/marketData";
import { useAsync } from "../hooks/useAsync";
import { ErrorState, LoadingState } from "../components/states";
import { Card } from "../components/ui/Card";
import { ActionList } from "../features/corporate-actions/ActionList";
import { CorporateActionFilterChips } from "../features/corporate-actions/CorporateActionFilterChips";
import { cn } from "../lib/utils";

type ImpactFilter = "ALL" | CorporateAction["impact"];

const IMPACT_FILTERS: Array<{ id: ImpactFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "POSITIVE", label: "Positive" },
  { id: "NEUTRAL", label: "Neutral" },
  { id: "NEGATIVE", label: "Negative" },
];

/** Canonical order first, then any type the feed introduced, alphabetically. */
function orderTypes(types: string[]): string[] {
  const rank = new Map<string, number>(CORPORATE_ACTION_TYPES.map((t, i) => [t, i]));
  return [...types].sort((a, b) => {
    const ra = rank.get(a);
    const rb = rank.get(b);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.localeCompare(b);
  });
}

function ImpactTiles({ actions }: { actions: CorporateAction[] }) {
  const pos = actions.filter((a) => a.impact === "POSITIVE").length;
  const neu = actions.filter((a) => a.impact === "NEUTRAL").length;
  const neg = actions.filter((a) => a.impact === "NEGATIVE").length;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="card-pad fade-up text-center">
        <div className="num text-2xl font-bold text-up">{pos}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Positive
        </div>
      </Card>
      <Card className="card-pad fade-up text-center" style={{ animationDelay: "60ms" }}>
        <div className="num text-2xl font-bold text-ink2">{neu}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Neutral
        </div>
      </Card>
      <Card className="card-pad fade-up text-center" style={{ animationDelay: "120ms" }}>
        <div className="num text-2xl font-bold text-down">{neg}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Negative
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
  const [selectedTypes, setSelectedTypes] = useState<ReadonlySet<string>>(new Set());
  const [selectedSources, setSelectedSources] = useState<ReadonlySet<string>>(new Set());

  const actions = data?.actions ?? [];
  const warnings = data?.warnings ?? [];

  const availableTypes = useMemo(
    () => orderTypes([...new Set(actions.map((a) => a.type))]),
    [actions],
  );
  const availableSources = useMemo(
    () => [...new Set(actions.map((a) => a.source))].sort(),
    [actions],
  );
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of actions) counts[a.type] = (counts[a.type] ?? 0) + 1;
    return counts;
  }, [actions]);
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of actions) counts[a.source] = (counts[a.source] ?? 0) + 1;
    return counts;
  }, [actions]);

  const toggle = (set: ReadonlySet<string>, value: string): ReadonlySet<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const filtered = useMemo(() => {
    return actions.filter((a) => {
      if (impact !== "ALL" && a.impact !== impact) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(a.type)) return false;
      if (selectedSources.size > 0 && !selectedSources.has(a.source)) return false;
      return true;
    });
  }, [actions, impact, selectedTypes, selectedSources]);

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h2 className="text-xl font-bold tracking-tight text-ink">Corporate Action Radar</h2>
        <p className="mt-0.5 text-sm text-muted">
          Company events that can move prices — dividends and splits from the market-data
          provider, plus acquisitions, buybacks, rights issues and more classified live from
          Indonesian financial news.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="fade-up flex items-start gap-2 rounded-lg border border-warn/25 bg-warn/[0.07] px-3 py-2.5 text-[11px] leading-relaxed text-ink2" style={{ animationDelay: "40ms" }}>
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
          <span>
            {warnings.join(" · ")} — menampilkan data dari sumber lain yang masih tersedia.
          </span>
        </div>
      )}

      <div className="fade-up flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-ink2" style={{ animationDelay: "40ms" }}>
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
        <span>
          Event types are classified automatically from public news headlines with keyword
          rules — not verified announcements. Tap a headline to read the article.
        </span>
      </div>

      {loading && !data && <LoadingState label="Scanning corporate actions…" />}
      {error && !data && <ErrorState message={error} onRetry={retry} />}

      {data && (
        <>
          <ImpactTiles actions={actions} />

          <Card className="card-pad fade-up space-y-3" style={{ animationDelay: "180ms" }}>
            <CorporateActionFilterChips
              types={availableTypes}
              typeCounts={typeCounts}
              selectedTypes={selectedTypes}
              onToggleType={(t) => setSelectedTypes((prev) => toggle(prev, t))}
              onClearTypes={() => setSelectedTypes(new Set())}
              sources={availableSources}
              sourceCounts={sourceCounts}
              selectedSources={selectedSources}
              onToggleSource={(s) => setSelectedSources((prev) => toggle(prev, s))}
              onClearSources={() => setSelectedSources(new Set())}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
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
