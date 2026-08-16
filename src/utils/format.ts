/** Number formatting helpers (Indonesian market conventions). */

/** "Rp 8,250" */
export function formatRupiah(v: number): string {
  return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

/**
 * Compact market-cap style: 1,020,000,000,000 → "Rp 1,020T".
 * T = triliun, B = miliar, M = juta.
 */
export function formatMarketCap(v: number): string {
  if (v >= 1e12) return `Rp ${trimZeros(v / 1e12)}T`;
  if (v >= 1e9) return `Rp ${trimZeros(v / 1e9)}B`;
  return `Rp ${trimZeros(v / 1e6)}M`;
}

function trimZeros(v: number): string {
  return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/** "+2.1%" / "-1.4%" / "0.0%" */
export function formatPercent(v: number, decimals = 1): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}%`;
}

/** Signed with color-agnostic sign: "+3.2" / "-1.5". */
export function formatSigned(v: number, decimals = 1): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}`;
}

/** 18,600,000,000 → "18.6B" (shares) */
export function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

/** Plain thousands grouping: 7842.61 → "7,842.61" */
export function formatNumber(v: number, decimals = 0): string {
  return v.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a yyyy-mm-dd date as "15 Aug 2026". */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── time / freshness ────────────────────────────────────────────────────

/** ISO timestamp → "14:35 WIB" (Indonesia Western Time). */
export function formatTimeWIB(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  );
}

/** ISO timestamp → "17 Aug 2026 · 14:35 WIB". */
export function formatDateTimeWIB(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  return `${date} · ${formatTimeWIB(iso)}`;
}

/** True while the IDX is in a trading session (Mon–Fri 09:00–15:30 WIB). */
export function isMarketOpenWIB(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  if (day === "Sat" || day === "Sun") return false;
  const hh = Number(get("hour"));
  const mm = Number(get("minute"));
  const t = hh + mm / 60;
  return t >= 9 && t <= 15.5;
}
