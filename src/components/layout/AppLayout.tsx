import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  Radar,
  SlidersHorizontal,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { marketDataProvider } from "../../services/marketData";
import { usePolling } from "../../hooks/usePolling";
import { formatNumber, formatPercent, formatRupiah } from "../../utils/format";
import { DataStatusBadge, DataStatusBanner } from "../DataStatusNotice";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/screener", label: "Stock Screener", icon: SlidersHorizontal, end: false },
  { to: "/money-flow", label: "Money Flow Radar", icon: Radar, end: false },
  { to: "/corporate-actions", label: "Corporate Actions", icon: CalendarDays, end: false },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/screener": "Stock Screener",
  "/money-flow": "Money Flow Radar",
  "/corporate-actions": "Corporate Action Radar",
};

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/30">
        <TrendingUp className="h-4.5 w-4.5 text-accent" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-tight text-ink">RC SmartPredict</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          IDX Stock Intelligence
        </span>
      </span>
    </Link>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-white/[0.06] text-ink"
                : "text-muted hover:bg-white/[0.03] hover:text-ink2",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" aria-hidden />
              )}
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Sidebar card with the live IHSG snapshot from the provider. */
function MarketMiniCard({ updatedAt }: { updatedAt?: string }) {
  const { data } = usePolling(() => marketDataProvider.getMarketOverview(), [], 60_000);
  if (!data) {
    return <div className="card-pad card text-xs text-muted">Loading IHSG…</div>;
  }
  const m = data;
  return (
    <div className="card-pad card">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">IHSG</div>
      <div className="num mt-1 flex items-baseline gap-2">
        <span className="text-lg font-bold text-ink">{formatNumber(m.ihsgValue, 2)}</span>
        <span className={cn("text-xs font-semibold", m.ihsgChangePercent >= 0 ? "text-up" : "text-down")}>
          {formatPercent(m.ihsgChangePercent)}
        </span>
      </div>
      <div className="num mt-2 flex justify-between text-[11px] text-muted">
        <span>Value {formatRupiah(m.totalValue)}</span>
        <span className="text-warn">DELAYED</span>
      </div>
      <div className="mt-2 border-t border-white/5 pt-2 text-[10px] leading-relaxed text-muted">
        {m.universeSize} tracked IDX stocks
        {updatedAt ? ` · last update ${formatTimeMini(updatedAt)}` : ""}
      </div>
    </div>
  );
}

function formatTimeMini(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const title =
    pathname.startsWith("/stock/") ? "Stock Detail" : (PAGE_TITLES[pathname] ?? "Dashboard");

  // One shared overview fetch powers the status banner + sidebar mini card.
  const { data: overview } = usePolling(() => marketDataProvider.getMarketOverview(), [], 60_000);

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-surface/40 p-4 backdrop-blur lg:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavItems />
        </div>
        <MarketMiniCard updatedAt={overview?.updatedAt} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/10 bg-surface p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-ink"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-8 flex-1">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </div>
            <MarketMiniCard updatedAt={overview?.updatedAt} />
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-bg/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4 md:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <h1 className="text-sm font-semibold text-ink2">{title}</h1>
            <div className="ml-auto flex items-center gap-3">
              <DataStatusBadge />
            </div>
          </div>
        </header>

        <DataStatusBanner updatedAt={overview?.updatedAt} />

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-6 md:px-6">
          <Outlet />

          <footer className="mt-12 border-t border-white/5 pt-5">
            <p className="text-[11px] leading-relaxed text-muted">
              This application provides analytical insights and does not constitute financial
              advice. Signals and scores are not guarantees of future performance. Market data is
              provided by a free public market-data source and may be delayed.
            </p>
            <p className="mt-2 text-[11px] text-muted/70">
              RC SmartPredict · Indonesian stock intelligence prototype
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
