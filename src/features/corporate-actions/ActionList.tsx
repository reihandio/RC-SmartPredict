import { Link } from "react-router-dom";
import { Banknote, Scissors } from "lucide-react";
import type { CorporateAction } from "../../types";
import { formatDate } from "../../lib/utils";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/states";

const TYPE_ICON = {
  Dividend: Banknote,
  "Stock Split": Scissors,
} as const;

/** Real corporate-action radar list (dividends / splits from the provider). */
export function ActionList({ actions }: { actions: CorporateAction[] }) {
  if (actions.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No corporate actions match"
          detail="Try a different impact or type filter."
        />
      </Card>
    );
  }

  return (
    <Card className="card-pad">
      <ul className="divide-y divide-white/5">
        {actions.map((a) => {
          const Icon = TYPE_ICON[a.type];
          return (
            <li key={a.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                  <Icon className="h-4 w-4 text-accent" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Link
                      to={`/stock/${a.ticker}`}
                      className="text-sm font-bold text-ink transition hover:text-accent"
                    >
                      {a.ticker}
                    </Link>
                    <span className="truncate text-xs text-muted">{a.companyName}</span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-xs font-semibold text-ink2">{a.type}</span>
                    <span className="mx-1.5 text-muted">—</span>
                    <span className="text-xs leading-relaxed text-muted">{a.description}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {a.impact === "POSITIVE" ? (
                    <Badge variant="good">Positive</Badge>
                  ) : (
                    <Badge variant="neutral">Neutral</Badge>
                  )}
                  <div className="w-14 text-right">
                    <div className={cn("num text-sm font-bold", a.score >= 60 ? "text-up" : "text-ink2")}>{a.score}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                      Catalyst
                    </div>
                  </div>
                  <div className="hidden w-24 text-right text-xs text-muted md:block">
                    {formatDate(a.date)}
                  </div>
                </div>
              </div>
              {/* Mobile date */}
              <div className="mt-1.5 text-xs text-muted md:hidden">{formatDate(a.date)}</div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
