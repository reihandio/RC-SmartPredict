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

/** Real corporate events for this ticker (dividends / splits). */
export function RecentActions({ actions }: { actions: CorporateAction[] }) {
  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "220ms" }}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Corporate Actions</h3>
        <Link
          to="/corporate-actions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition hover:text-ink"
        >
          All events
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      {actions.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          No recent corporate actions in the available data for this ticker.
        </p>
      ) : (
        <ul className="space-y-2">
          {actions.slice(0, 3).map((a) => {
            const Icon = TYPE_ICON[a.type];
            return (
              <li key={a.id} className="rounded-lg border border-white/5 bg-surface2/50 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 ring-1 ring-accent/20">
                    <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">{a.type}</span>
                      <Badge variant={a.impact === "POSITIVE" ? "good" : "neutral"}>
                        {a.impact === "POSITIVE" ? "Positive" : "Neutral"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {formatDate(a.date)} · Catalyst {a.score}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink2">{a.description}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
