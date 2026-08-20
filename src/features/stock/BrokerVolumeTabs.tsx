import { useState } from "react";
import { BarChart3, Waves } from "lucide-react";
import type { StockDetail } from "../../types";
import { cn } from "../../lib/utils";
import { Card } from "../../components/ui/Card";
import { BandarmologyPanel } from "./BandarmologyPanel";
import { VolumeQualityPanel } from "./VolumeQualityPanel";

type TabId = "bandarmology" | "volume-quality";

/**
 * NEW section on Stock Detail (Section 13a/13b): Bandarmology + Volume
 * Quality tabs below the chart, alongside the existing intelligence cards.
 * Purely additive — existing sections above/below are untouched.
 */
export function BrokerVolumeTabs({ ticker, stock }: { ticker: string; stock: StockDetail }) {
  const [tab, setTab] = useState<TabId>("bandarmology");

  const tabs: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
    { id: "bandarmology", label: "Bandarmology", icon: BarChart3 },
    { id: "volume-quality", label: "Volume Quality", icon: Waves },
  ];

  return (
    <Card className="card-pad fade-up">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
              tab === id
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-white/10 bg-surface2 text-muted hover:border-white/20 hover:text-ink2",
            )}
            aria-pressed={tab === id}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "bandarmology" ? (
        <BandarmologyPanel ticker={ticker} />
      ) : (
        <VolumeQualityPanel ticker={ticker} stock={stock} />
      )}
    </Card>
  );
}
