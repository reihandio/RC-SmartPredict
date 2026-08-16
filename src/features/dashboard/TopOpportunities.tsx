import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ScoredStock } from "../../types";
import { above1Trillion } from "../../services/scoring";
import { Card } from "../../components/ui/Card";
import { StockTable } from "../../components/StockTable";

/** Highest-ranked stocks, restricted to the Rp 1T+ universe. */
export function TopOpportunities({ stocks }: { stocks: ScoredStock[] }) {
  const top = [...stocks]
    .filter((s) => above1Trillion(s.marketCap))
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10);

  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "220ms" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Top Opportunities</h2>
          <p className="text-xs text-muted">Highest-ranked · Market cap above Rp 1T</p>
        </div>
        <Link
          to="/screener"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition hover:text-ink"
        >
          Open screener
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <StockTable
        stocks={top}
        columns={[
          "ticker",
          "price",
          "changePercent",
          "marketCap",
          "moneyFlow",
          "overallScore",
          "risk",
          "signal",
        ]}
        defaultSort={{ key: "overallScore", dir: "desc" }}
        emptyTitle="No opportunities found"
      />
    </Card>
  );
}
