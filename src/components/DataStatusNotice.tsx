import { Info, Satellite } from "lucide-react";
import { Badge } from "./ui/Badge";
import { formatDateTimeWIB, isMarketOpenWIB } from "../utils/format";

const SOURCE_NOTE =
  "Market data is provided by a free public market-data source and may be delayed.";

/** Compact data-freshness badge for the top bar. */
export function DataStatusBadge() {
  const open = isMarketOpenWIB();
  return (
    <Badge variant={open ? "warn" : "neutral"} icon={<Satellite className="h-3 w-3" aria-hidden />}>
      {open ? "DELAYED" : "MARKET CLOSED"}
    </Badge>
  );
}

/**
 * Persistent banner under the top bar: honest freshness status.
 * Never claims real-time — Yahoo's free feed is delayed.
 */
export function DataStatusBanner({ updatedAt }: { updatedAt?: string }) {
  const open = isMarketOpenWIB();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 border-b border-white/5 bg-surface2/40 px-4 py-1.5 text-center text-[11px] font-medium">
      <span className={open ? "text-warn" : "text-ink2"}>
        {open ? "MARKET DATA · DELAYED" : "MARKET DATA · MARKET CLOSED"}
        {updatedAt ? ` · Last updated: ${formatDateTimeWIB(updatedAt)}` : ""}
      </span>
      <span
        className="inline-flex items-center gap-1 text-muted underline decoration-dotted underline-offset-2"
        title={SOURCE_NOTE}
      >
        <Info className="h-3 w-3" aria-hidden />
        Free public data source — may be delayed
      </span>
    </div>
  );
}
