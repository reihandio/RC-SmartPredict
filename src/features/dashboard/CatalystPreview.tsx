import { Link } from "react-router-dom";
import { ArrowRight, Banknote, Scissors } from "lucide-react";
import type { CorporateAction } from "../../types";
import { formatDate } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

const TYPE_ICON = {
  Dividend: Banknote,
  "Stock Split": Scissors,
} as const;

/** Latest real corporate events (dividends / splits from the data provider). */
export function CatalystPreview({ actions }: { actions: CorporateAction[] }) {
  const latest = actions.slice(0, 5);

  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "340ms" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Latest Corporate Actions</h2>
          <p className="text-xs text-muted">Dividends & splits from the data provider</p>
        </div>
        <Link
          to="/corporate-actions"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition hover:text-ink"
        >
          All events
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {latest.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          Corporate action data unavailable right now.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {latest.map((a) => {
            const Icon = TYPE_ICON[a.type];
            return (
              <li key={a.id}>
                <Link
                  to={`/stock/${a.ticker}`}
                  className="group flex items-start gap-3 rounded-lg p-2 transition hover:bg-white/[0.03]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                    <Icon className="h-4 w-4 text-accent" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink transition group-hover:text-accent">
                        {a.ticker}
                      </span>
                      <span className="text-xs text-muted">{a.type}</span>
                      <span className="ml-auto text-[11px] text-muted">{formatDate(a.date)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink2">{a.description}</span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <Badge variant={a.impact === "POSITIVE" ? "good" : "neutral"}>
                        {a.impact === "POSITIVE" ? "Positive" : "Neutral"}
                      </Badge>
                      <span className="num text-[11px] text-muted">Catalyst {a.score}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
