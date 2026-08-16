import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { IntelligenceReport } from "../../types";
import { Card } from "../../components/ui/Card";

/**
 * Explainability panel — every signal must show why.
 * Evidence is phrased as observations, never claims of certainty.
 */
export function WhyPanel({ report }: { report: IntelligenceReport }) {
  return (
    <Card className="card-pad fade-up" style={{ animationDelay: "100ms" }}>
      <h3 className="text-sm font-semibold text-ink">Why this stock is interesting</h3>

      <div className="mt-3 space-y-2.5">
        {report.reasons.map((r, i) => (
          <div key={`r-${i}`} className="flex items-start gap-2 text-xs leading-relaxed">
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-up" aria-hidden />
            <span className="text-ink2">{r}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-white/5 pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Caution flags</div>
        <div className="mt-2 space-y-2.5">
          {report.risks.map((r, i) => (
            <div key={`w-${i}`} className="flex items-start gap-2 text-xs leading-relaxed">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
              <span className="text-ink2">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
