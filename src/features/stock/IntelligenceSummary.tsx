import type { ScoredStock } from "../../types";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import type { ProgressTone } from "../../components/ui/ProgressBar";
import { riskLevel } from "../../services/scoring";

interface GaugeDef {
  label: string;
  value: number;
  tone: ProgressTone;
  description: string;
}

function buildGauges(s: ScoredStock): GaugeDef[] {
  const risk = riskLevel(s.anomalyRisk);
  return [
    {
      label: "Money Flow Proxy",
      value: s.moneyFlowScore,
      tone: toneOf(s.moneyFlowScore),
      description:
        s.moneyFlowScore >= 70
          ? "Strong accumulation-like activity"
          : s.moneyFlowScore >= 45
            ? "Moderate net buying pressure"
            : "Distribution-like selling pressure",
    },
    {
      label: "Accumulation",
      value: s.accumulationScore,
      tone: toneOf(s.accumulationScore),
      description:
        s.accumulationScore >= 70
          ? "Up-day volume dominates — accumulation-like"
          : s.accumulationScore >= 45
            ? "Mixed accumulation signals"
            : "Limited accumulation evidence",
    },
    {
      label: "Technical",
      value: s.technicalScore,
      tone: toneOf(s.technicalScore),
      description:
        s.technicalScore >= 70
          ? "Price above major moving averages"
          : s.technicalScore >= 45
            ? "Mixed technical structure"
            : "Weak technical structure",
    },
    {
      label: "Catalyst",
      value: s.catalystScore,
      tone: toneOf(s.catalystScore),
      description:
        s.catalystScore >= 70
          ? "Recent corporate event (dividend / split)"
          : s.catalystScore > 50
            ? "Earlier corporate event detected"
            : "No recent corporate events in the data",
    },
    {
      label: "Anomaly Risk",
      value: s.anomalyRisk,
      tone:
        risk === "LOW"
          ? "good"
          : risk === "MODERATE"
            ? "warn"
            : risk === "ELEVATED"
              ? "serious"
              : "critical",
      description:
        risk === "LOW"
          ? "Low anomaly signals"
          : risk === "MODERATE"
            ? "Some unusual activity"
            : "Unusual trading pattern detected",
    },
  ];
}

function toneOf(v: number): ProgressTone {
  if (v >= 70) return "good";
  if (v >= 45) return "warn";
  return "critical";
}

/** The five intelligence gauges with score + plain-language description. */
export function IntelligenceSummary({ stock }: { stock: ScoredStock }) {
  const gauges = buildGauges(stock);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {gauges.map((g, i) => (
        <Card
          key={g.label}
          className="card-pad fade-up"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-ink2">{g.label}</span>
            <span className="num text-lg font-bold text-ink">
              {Math.round(g.value)}
              <span className="text-[11px] font-normal text-muted"> / 100</span>
            </span>
          </div>
          <ProgressBar value={g.value} tone={g.tone} className="mt-2" />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">{g.description}</p>
        </Card>
      ))}
    </div>
  );
}
