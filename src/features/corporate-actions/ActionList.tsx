import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { CorporateAction } from "../../types";
import { formatDate } from "../../lib/utils";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/states";
import { actionTypeMeta, impactBadge } from "./actionMeta";

/** Real corporate-action radar list (Yahoo events + classified news feed). */
export function ActionList({ actions }: { actions: CorporateAction[] }) {
  if (actions.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No corporate actions match"
          detail="Try a different type, source, or impact filter."
        />
      </Card>
    );
  }

  return (
    <Card className="card-pad">
      <ul className="divide-y divide-white/5">
        {actions.map((a) => {
          const Icon = actionTypeMeta(a.type).icon;
          const impact = impactBadge(a.impact);
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
                    {a.companyName && (
                      <span className="truncate text-xs text-muted">{a.companyName}</span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {a.source}
                    </Badge>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-xs font-semibold text-ink2">{a.type}</span>
                    <span className="mx-1.5 text-muted">—</span>
                    <span className="text-xs leading-relaxed text-muted">
                      {a.sourceUrl ? (
                        <a
                          href={a.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-baseline gap-1 transition hover:text-accent"
                        >
                          {a.description}
                          <ExternalLink className="inline h-2.5 w-2.5 shrink-0" aria-hidden />
                        </a>
                      ) : (
                        a.description
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={impact.variant}>{impact.label}</Badge>
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
