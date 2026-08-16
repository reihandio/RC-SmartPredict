# RC SmartPredict — IDX Stock Intelligence

A modern Indonesian stock intelligence web app for discovering potential
capital-gain opportunities from IDX/IHSG market data.

> **Real data.** Quotes, historical OHLCV, and corporate events (dividends /
> splits) come from a free public market-data source (Yahoo Finance) and may
> be delayed — the UI shows a DELAYED / MARKET CLOSED status with the last
> update time. All analytics are derived from that real data.

## Features

- **Dashboard** — IHSG market overview, sentiment, breadth, top opportunities,
  money-flow leaders, latest corporate actions.
- **Stock Screener** — filters (market cap > Rp 1T by default, scores, flows,
  risk, signal) + presets (Big Money, Breakout, Accumulation, Corporate
  Catalyst, High Score).
- **Stock Detail** — TradingView Lightweight Charts candlesticks + volume
  (1D–1Y, SMA/EMA overlays), intelligence gauges, money-flow windows, large
  transaction classification, buy/sell timing zones, and a full
  "why this stock" explanation for every signal.
- **Money Flow Radar** — ranked flow leaderboard with acceleration detection.
- **Corporate Action Radar** — demo events (dividends, buybacks, deals,
  contracts) with impact and catalyst scores.

## Tech

React · TypeScript · Vite · Tailwind CSS · React Router · Lucide React ·
TradingView Lightweight Charts · Vercel

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

```bash
vercel
```

or connect the GitHub repo to Vercel — the project needs no special server
configuration (`vercel.json` handles the SPA rewrite).

## Architecture

```text
React → Vercel API (/api/*) → YahooFinanceProvider → Yahoo Finance
```

- `server/` — `YahooFinanceProvider` (yahoo-finance2 library, structured
  endpoints — no scraping), analytics engine (Money Flow Proxy, accumulation,
  technical, anomaly risk, relative strength, Large Activity Proxy, catalyst
  scores — all derived from real OHLCV), scoring orchestrator with
  per-instance caching + stale-while-revalidate.
- `api/` — Vercel serverless functions (thin adapters over the handlers).
- `server/devApi.ts` — vite dev middleware serving the same handlers, so
  `npm run dev` works without the Vercel CLI.
- `src/services/` — `MarketDataProvider` abstraction (`ApiMarketDataProvider`
  fetches `/api/*`; the UI never touches Yahoo directly), signal
  explainability, client-side TTL cache + 60s polling.
- `src/features/` — page-level feature components; `src/components/` — shared
  UI; `src/pages/` — routes.

### Data honesty

- Market cap > Rp 1T default filter uses real provider market caps.
- IHSG (`^JKSE`) values are fetched, never hardcoded.
- Corporate actions: real dividends/splits only — other event types show
  "data unavailable" rather than invented events.
- No transaction-level data is available from the free source, so abnormal
  value-traded days are labeled **Large Activity Proxy**.
- If the provider fails, the UI shows a real error — there is no mock
  fallback.

## Disclaimer

This application provides analytical insights and does not constitute
financial advice. Signals and scores are not guarantees of future performance.

## License

RC SmartPredict is available for personal, educational, research, and
non-commercial use only.

Commercial use requires prior written permission from the author.

See [LICENSE](LICENSE) for details.