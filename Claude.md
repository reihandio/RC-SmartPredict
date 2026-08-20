# CLAUDE.md

## Project

Build a modern Indonesian stock intelligence web app focused on finding potential capital-gain opportunities from IDX/IHSG market data.

This is a **vibe coding project**.

The priority is:

> Build a visually impressive, useful MVP quickly and deploy it to Vercel.

Do NOT over-engineer the application. The app is already deployed on Vercel — new features must stay light enough for Vercel's serverless/edge runtime (short execution time, small payloads, cacheable results). Prefer precomputing/caching over heavy per-request computation.

---

# 1. Tech Stack

Use:

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui if useful
* Lucide React
* TradingView Lightweight Charts
* Vercel

Optional:

* Vercel Serverless Functions / API routes
* Vercel Cron Jobs (for periodic/precomputed scoring, see Section 13c)
* Vercel KV / Edge Config (lightweight caching for computed scores)
* SWR or TanStack Query if needed

Do NOT introduce:

* NestJS
* Express
* Docker
* PostgreSQL
* Prisma
* Redis
* Kubernetes
* Microservices

unless explicitly requested later.

The entire MVP should be deployable directly to Vercel.

---

# 2. Main Goal

The application should help users identify Indonesian stocks that potentially have strong upside setups.

The application focuses on these things:

1. Corporate actions / company catalysts.
2. Big money / money-flow detection.
3. Distinguishing genuine accumulation-like activity from suspicious activity.
4. Filtering stocks with market cap above IDR 1 trillion.
5. Providing potential buy/sell timing signals.
6. Broker accumulation analysis ("Bandarmology") across 7D / 14D / 30D windows.
7. Detecting genuine vs. fake ("wash-traded") volume.
8. Swing-trade candidate screening that combines technical structure, broker accumulation, volume authenticity, and a fundamental sanity filter.

The application is an analytical tool.

It must NOT claim certainty or guaranteed returns.

---

# 3. Important Data Rule

Do not scrape TradingView.

Do not use undocumented TradingView APIs.

Do not assume TradingView provides a free raw-market-data API.

Use TradingView Lightweight Charts primarily for chart visualization.

**This app uses LIVE data. Do not fabricate or randomly-generate stock data as if it were real.** No single provider covers everything, so different data types will likely come from different free/public sources. Do not hardcode the assumption that it must be Yahoo Finance, IDX, or any other specific vendor — evaluate and pick sources per data type based on these criteria:

* Free / no paid subscription required.
* Publicly accessible (no login-walled scraping, no bypassing paywalls or auth).
* Reasonably stable/structured (an official or semi-official endpoint is preferable to scraping a page clearly not meant for programmatic access; if scraping is the only option, isolate it behind its own module — see below).
* Data types needed: price/OHLCV/market cap, broker net buy-sell per broker ("Bandarmology" — the hardest one to find for free), corporate action announcements, and basic fundamentals (EPS, ROE, ROA, DER, PBV).

Whenever a source is only reachable by scraping a public page (no official API), isolate it behind its own module so a page-structure change only breaks one file, not the whole app. Add a comment at the top of that module noting the source URL/structure it was written against and the date, so future breakage is easy to diagnose. Always call such sources server-side (Vercel Serverless Function / Cron), never directly from the browser, and cache results aggressively since unofficial sources are the most likely to rate-limit or block.

If, while implementing, no workable free source can be found for a given data type (this is most likely for broker summary/Bandarmology data), stop and report back instead of silently substituting fabricated data.

Create a simple abstraction per data domain so providers can be swapped without touching UI code:

```typescript
interface MarketDataProvider {
  getStocks(): Promise<Stock[]>;
  getStock(ticker: string): Promise<Stock | undefined>;
  getHistoricalPrices(ticker: string): Promise<PriceData[]>;
}

interface BrokerDataProvider {
  getBrokerSummary(ticker: string, range: "7D" | "14D" | "30D"): Promise<BrokerAccumulationSummary>;
}

interface FundamentalDataProvider {
  getFundamentals(ticker: string): Promise<Fundamentals>;
}
```

Implement one live provider per interface, named after whatever source is actually chosen (e.g. `LiveMarketDataProvider`, `LiveBrokerSummaryProvider`), plus a `Mock*Provider` for each — the mock is only for local development/testing when the live source is down or rate-limited, never shown to end users as if it were real, and never the default in production. If a live provider fails at runtime, the UI must show the "data unavailable" empty state from Section 28, not silently fall back to mock numbers.

---

# 4. MVP Philosophy

Do not build a production-grade financial platform.

Build a convincing prototype.

Prioritize:

1. UI/UX
2. Stock discovery
3. Scoring
4. Visualization
5. Explainability
6. Vercel deployment

The user should be able to open the website and immediately understand:

> "Which stocks look interesting right now, and why?"

---

# 5. Application Pages

Create these pages:

```text
/
  Dashboard

/screener
  Stock Screener

/stock/:ticker
  Stock Detail

/money-flow
  Big Money Radar

/broker-radar
  Broker Accumulation Radar (Bandarmology)

/swing-candidates
  Swing Trade Candidates

/corporate-actions
  Corporate Action Radar
```

Keep routing simple.

---

# 6. Dashboard

The dashboard should feel like a modern fintech / stock intelligence terminal.

Use a dark theme by default.

Top section:

```text
IDX STOCK INTELLIGENCE

Market Overview
IHSG
Market Sentiment
Advancing
Declining
Total Volume
```

Then:

### Top Opportunities

Display the highest-ranked stocks.

Columns/cards:

* Ticker
* Company
* Price
* Daily Change
* Market Cap
* Money Flow
* Overall Score
* Risk
* Signal

Example:

```text
BBCA

Price       Rp 8,250
Change      +2.1%
Market Cap  Rp 1,020T

Money Flow  +78
Score       86

Signal      BUY
Risk        LOW
```

Optionally add a small "Top Swing Candidates" strip (from Section 13c) linking to `/swing-candidates`.

---

# 7. Stock Screener

Create a clean interactive stock screener.

Mandatory default filter:

```text
Market Cap > Rp 1 Trillion
```

Filters:

* Market Cap
* Daily change
* Volume
* Volume ratio
* Money flow
* Accumulation score
* Manipulation risk
* Overall score
* Signal
* Broker accumulation tier (A/B/C)
* Volume authenticity score

Allow sorting by:

```text
Score
Money Flow
Volume
Daily Change
Market Cap
Risk
Broker Accumulation Tier
Volume Authenticity
```

Add preset buttons:

```text
🔥 Big Money
🚀 Breakout
💰 Accumulation
📰 Corporate Catalyst
⭐ High Score
🏦 Broker Tier A
✅ Genuine Volume Only
```

---

# 8. Stock Detail

Route:

```text
/stock/:ticker
```

Header:

```text
Ticker
Company Name
Price
Daily Change
Market Cap
Signal
Overall Score
```

Main section:

### Price Chart

Use TradingView Lightweight Charts.

Support:

```text
1D
1W
1M
3M
6M
1Y
```

Show:

* Candlestick
* Volume
* Optional SMA
* Optional EMA

Add a "Bandarmology" tab (Section 13a) and a "Volume Quality" tab (Section 13b) alongside the existing intelligence cards below the chart.

---

# 9. Stock Intelligence

Below the chart, show intelligence cards.

Example:

```text
Money Flow
82 / 100
Strong accumulation-like activity

Accumulation
87 / 100
Buying pressure increasing

Technical
76 / 100
Price above major moving averages

Catalyst
71 / 100
Positive corporate event detected

Manipulation Risk
22 / 100
Low anomaly risk

Broker Accumulation
Tier A — 84 / 100
Consistent net buying across 7/14/30 days

Volume Authenticity
79 / 100
Genuine — volume backed by rising transaction frequency
```

Use progress bars / gauges.

---

# 10. Overall Score

Calculate a simple 0-100 score.

Example:

```typescript
overallScore =
  moneyFlowScore * 0.30 +
  technicalScore * 0.20 +
  catalystScore * 0.20 +
  accumulationScore * 0.20 +
  riskScore * 0.10;
```

Keep the calculation in a utility/service file.

Do not put scoring logic directly inside React components.

Weights can be adjusted easily later.

Note: this is the general dashboard/screener score. The Swing Trade Candidate feature (Section 13c) uses its own, separate score weighted toward broker/volume data — don't merge the two formulas.

---

# 11. Big Money Detection

Create a simple money-flow model.

Use available demo data:

```text
Price
Volume
Price Change
Average Volume
Transaction Size
```

Example concept:

```text
moneyFlow =
  priceChangeDirection
  × volume
  × price
```

Normalize the result into:

```text
0 - 100
```

Also calculate:

```text
5D Money Flow
10D Money Flow
20D Money Flow
```

Show acceleration.

Example:

```text
Money Flow

5D    +24%
10D   +48%
20D   +31%

🔥 Acceleration detected
```

Important:

Do NOT state:

> "Institutions are definitely buying."

Instead say:

> "Accumulation-like money flow detected."

---

# 12. Large Transaction Detection

Use transaction data if available in the dataset.

Classify:

```text
Normal
Large
Accumulation-like
Distribution-like
Anomalous
```

A large transaction alone should NOT automatically mean bullish.

Example:

```text
Large transaction
+
Positive price response
+
Sustained volume
=
Accumulation-like
```

Example:

```text
Large transaction
+
Sharp spike
+
Immediate reversal
=
Anomalous
```

---

# 13. Manipulation Risk

Create:

```text
Manipulation Risk: 0-100
```

Display:

```text
0-20   LOW
21-40  MODERATE
41-60  ELEVATED
61-80  HIGH
81-100 EXTREME
```

Use simple factors:

* Volume spike
* Price spike
* Immediate reversal
* Volume/price divergence
* Abnormal transaction size
* Low liquidity

Feed the Volume Authenticity Score (Section 13b) in as an additional factor here — a low authenticity score should push Manipulation Risk up.

The UI wording must be:

> "Unusual trading pattern"

or:

> "Elevated anomaly risk"

Never say:

> "This stock is being manipulated."

unless there is actual verified evidence.

---

# 13a. Broker Accumulation Analysis ("Bandarmology")

New feature, surfaced on `/broker-radar` and as a "Bandarmology" tab on Stock Detail.

Analyze broker activity — large-lot purchases with relatively low transaction frequency — across three windows: **7D, 14D, 30D**.

For each time window, compute:

* Top 5 net-buying brokers, with cumulative net value and net volume.
* Whether the same broker(s) accumulate consistently across all three windows, vs. only a one-day frequency spike.
* Whether a broker's large purchases look genuine or potentially manipulative (cross-reference with Section 13b).
* Whether accumulation appears foreign-led, domestic-institution-led, or unidentified (possible insider or coordinated group).
* Each top broker's estimated ownership percentage, to flag brokers with enough position to plausibly move price.

Tier classification:

```text
Tier A (Strong)
Consistent net buying across 7/14/30 days, intensity increasing in the
last 7 days, low seller concentration, price still relatively flat/
sideways (accumulation ahead of a potential move).

Tier B (Moderate)
Accumulation visible over 14/30 days, but the last 7 days show
profit-taking or mixed signals.

Tier C (Weak/Suspicious)
Accumulation only in the last 1-2 days, single broker dominance >60%,
no multi-week pattern — likely short-term speculative flow rather
than genuine accumulation.
```

Produce a **Broker Accumulation Score (0-100)** per stock, with the reasoning shown transparently (which brokers, which window, tier, and why) — never just a bare tier label.

```typescript
interface BrokerNetActivity {
  brokerCode: string;
  brokerName: string;
  netVolume: number;
  netValue: number;
  buyVolume: number;
  sellVolume: number;
  ownershipPercent: number;
}

interface BrokerAccumulationSummary {
  ticker: string;
  windows: {
    range: "7D" | "14D" | "30D";
    topNetBuyers: BrokerNetActivity[];
    topNetSellers: BrokerNetActivity[];
  }[];
  consistentAcrossWindows: boolean;
  dominantParty: "FOREIGN" | "DOMESTIC_INSTITUTION" | "UNIDENTIFIED" | "MIXED";
  concentrationRisk: number; // % held by the single largest broker
  tier: "A" | "B" | "C";
  tierReason: string;
  score: number; // 0-100
}
```

This computation can get heavy across three rolling windows for many tickers — precompute it on a schedule (Vercel Cron) and cache the result rather than recalculating on every page load.

---

# 13b. Volume Authenticity Detection (Real vs. Fake Volume)

New feature, surfaced as a "Volume Quality" tab on Stock Detail and used as an input to Section 13 (Manipulation Risk).

This is a separate score from Broker Accumulation, though the two inform each other.

Signals of genuine volume:

* Volume increase accompanied by a proportional rise in transaction frequency (many small-to-medium trades, not just a few block trades).
* Price holds (doesn't fall back) for 2-3+ days after the volume spike, instead of reversing immediately.
* Bid-offer spread stays tight during the spike (liquidity genuinely improved).
* The volume rise correlates with the broker accumulation pattern from Section 13a (not just one broker moving shares between its own accounts).
* Transaction value (Rp) rises proportionally with volume — not just lot count inflating on a low-priced stock.

Red flags for fake/manipulated volume:

* Volume spike driven by crossing / negotiated deals between related broker codes, especially on stocks with a history of low liquidity.
* Volume spikes but price closes flat or reverses the same day or the next ("pump and immediate dump").
* Very high volume with unusually low transaction frequency (few large trades = wash-trading pattern, common in thinly-traded speculative stocks).
* Very small free float with a single day's volume exceeding a large percentage of free float — easy to manipulate.
* No corresponding broker accumulation trend from Section 13a — volume with no "story" behind it.
* A stock with a repeated history of pump-and-dump cycles.

Produce a **Volume Authenticity Score (0-100)** and explicitly flag stocks below a threshold (e.g. `<40`) as:

> "High manipulation risk — excluded from swing candidates regardless of technical setup."

```typescript
interface VolumeAuthenticity {
  ticker: string;
  score: number; // 0-100
  classification: "GENUINE" | "SUSPICIOUS";
  frequencyToVolumeRatio: number;
  priceHeldAfterSpike: boolean;
  spreadStability: number; // 0-100
  correlatesWithBrokerAccumulation: boolean;
  redFlags: string[];
}
```

---

# 13c. Swing Trade Candidate Detection

New feature, surfaced on `/swing-candidates` and as a preset in the Screener (Section 7).

Combine technical structure with Sections 13a and 13b. A valid swing candidate should meet most of the following:

Technical criteria:

* Price breaks out of a clear consolidation/base (at least 2-3 weeks of sideways movement) on above-average volume.
* Moving average alignment: price above MA20 and MA50, ideally MA20 crossing above MA50, or a clean pullback to MA20 holding as support.
* MACD shows a bullish crossover or a widening positive histogram.
* Support/resistance identified to compute risk-reward; only flag setups with **R:R ≥ 1:2**.
* Higher lows forming on the daily chart.

Combine with 13a & 13b:

* Prioritize stocks with Broker Tier A/B + Volume Authenticity ≥ 60 + a valid technical breakout/setup.
* Reject a technically "good-looking" breakout if Volume Authenticity is low — likely a trap.

Fundamental sanity layer (filter/warning only, **not** part of scoring):

* EPS trend positive or improving over the last 2-4 quarters (or a clear turnaround narrative).
* Cheap on valuation (PBV).
* Healthy ROA & ROE.
* DER (debt-to-equity) within a reasonable range for its sector.
* No recent red flags: auditor going-concern notes, major shareholder sell-offs, delisting/suspension history, unusual related-party transactions.
* Sector context: is the sector currently in favor (commodity cycle, rate-sensitive sector during a rate cut, etc.)?

Swing Candidate Score:

```typescript
swingCandidateScore =
  brokerAccumulationScore * 0.35 +
  volumeAuthenticityScore * 0.30 +
  technicalSetupScore * 0.35;

// Hard filter, applied after scoring:
// if volumeAuthenticityScore < 40 -> excluded regardless of score
```

Output format:

```text
Ticker — Overall Score: XX/100 | Confidence: High/Medium/Low

Broker Accumulation: Tier [A/B/C] — [short reason, broker codes]
Volume Authenticity: XX/100 — [Genuine/Suspicious] — [short reason]
Technical Setup: [Breakout/Pullback/Range] | Entry: xxxx | SL: xxxx | TP1/TP2: xxxx
Fundamental Note: [short red flag, or "no red flags"]
Estimated Holding Horizon: X-X days
Category: [Scalping/Intraday/Swing/Investment]
Risk Notes: [manipulation risk / liquidity risk / sector risk, if any]
```

Sort the list from highest to lowest overall score. Always show the Section 29 disclaimer near this list.

```typescript
interface SwingCandidate {
  ticker: string;
  overallScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  brokerTier: "A" | "B" | "C";
  brokerReason: string;
  volumeAuthenticityScore: number;
  volumeClassification: "GENUINE" | "SUSPICIOUS";
  technicalSetup: "BREAKOUT" | "PULLBACK" | "RANGE";
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  fundamentalNote: string;
  holdingHorizonDays: [number, number];
  category: "SCALPING" | "INTRADAY" | "SWING" | "INVESTMENT";
  riskNotes: string[];
}
```

---

# 14. Corporate Actions

Create a Corporate Action Radar.

Show events such as:

* Dividend
* Buyback
* Acquisition
* Merger
* Rights issue
* Stock split
* New contract
* Strategic partnership
* Ownership change

Each event should have:

```text
Ticker
Date
Event
Impact
Catalyst Score
```

Example:

```text
BBRI
15 Aug 2026

Corporate Action
Share Buyback

Impact
Positive

Catalyst Score
82
```

Use demo data initially.

Clearly label demo/simulated data where applicable.

---

# 15. Buy / Sell Signals

Create simple signals:

```text
STRONG BUY
BUY
WATCH
HOLD
REDUCE
SELL
AVOID
```

Signals should be based on:

* Overall score
* Money flow
* Technical score
* Accumulation
* Catalyst
* Risk
* Broker accumulation tier
* Volume authenticity

Example:

```text
Score >= 80
→ STRONG BUY

Score 70-79
→ BUY

Score 55-69
→ WATCH

Score 40-54
→ HOLD

Score 30-39
→ REDUCE

Score < 30
→ SELL / AVOID
```

A Volume Authenticity score below the manipulation threshold should cap the signal at `WATCH` at most, regardless of overall score.

These thresholds should be easy to change.

---

# 16. Buy Timing

Do not say:

> "Best time to buy."

Use:

> "Potential Entry Zone"

Show:

```text
Potential Entry
Rp 4,850 - Rp 4,950

Support
Rp 4,700

Target
Rp 5,300

Risk/Reward
1 : 2.1
```

This is analytical information, not a guarantee.

---

# 17. Sell Timing

Show:

```text
Potential Exit
Rp 5,300

Invalidation
Rp 4,700

Momentum
Strong

Distribution Risk
Moderate
```

The user should understand why the signal changed.

---

# 18. Explainability

Every stock signal must show:

### Why?

Example:

```text
Why this stock is interesting

✓ Money flow increased 42% over 10 days
✓ Volume is 1.8x the average
✓ Stock is outperforming IHSG
✓ Positive corporate catalyst
✓ Market cap above Rp 1T
✓ Broker Tier A accumulation (consistent 7/14/30D net buying)
✓ Volume Authenticity 79/100 — genuine

⚠ RSI approaching overbought
⚠ Short-term volatility elevated
```

Never create a black-box:

```text
AI says BUY
```

---

# 19. Live Data & Local Fallback

The app runs on **live data** from Section 3's providers (Yahoo Finance for price/OHLCV, IDX broker summary scraping for Bandarmology, IDX disclosures for corporate actions). Do not present fabricated numbers to end users as if they were real.

For local development and tests only, keep small `Mock*Provider` fixtures covering scenarios like:

```text
Strong accumulation
Strong distribution
Breakout
False breakout
High volume
Low volume
Corporate catalyst
High anomaly risk
Low anomaly risk
Tier A broker accumulation
Tier C / suspicious broker activity
Genuine volume spike
Fake/wash-trading volume spike
Valid swing candidate
Rejected swing candidate (good technical, weak volume authenticity)
```

These fixtures exist so scoring logic can be unit-tested without hitting live IDX/Yahoo endpoints on every dev run, and so the UI has something to render if a live source is temporarily down during development. They must never be the default data source in production, and if the UI is ever showing fixture data (e.g. a live scrape failed), it must say so explicitly rather than presenting it as real — reuse the "data unavailable" empty state from Section 28 instead of silently substituting fixture data.

---

# 20. Data Model

Keep the data model simple.

Example:

```typescript
interface Stock {
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  marketCap: number;
  volume: number;

  moneyFlowScore: number;
  accumulationScore: number;
  technicalScore: number;
  catalystScore: number;
  manipulationRisk: number;
  overallScore: number;

  brokerAccumulationScore: number;
  brokerTier: "A" | "B" | "C";
  volumeAuthenticityScore: number;

  signal: Signal;
}
```

Price:

```typescript
interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

Corporate action:

```typescript
interface CorporateAction {
  ticker: string;
  date: string;
  type: string;
  description: string;
  impact: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number;
}
```

Broker / volume / swing types are defined in Sections 13a-13c (`BrokerAccumulationSummary`, `VolumeAuthenticity`, `SwingCandidate`).

Fundamentals (used only as a filter layer in Section 13c):

```typescript
interface Fundamentals {
  ticker: string;
  epsTrend: "IMPROVING" | "FLAT" | "DECLINING";
  pbv: number;
  roa: number;
  roe: number;
  der: number;
  redFlags: string[];
  sector: string;
  sectorInFavor: boolean;
}
```

---

# 21. UI Design

Visual direction:

```text
Modern fintech
+
Trading terminal
+
Premium dark dashboard
```

Use:

* Dark background
* Cards
* Tables
* Charts
* Score indicators
* Badges
* Subtle borders
* Clean typography
* Compact spacing

Avoid:

* Excessive gradients
* Huge hero sections
* Generic SaaS landing-page design
* Excessive animations
* Clutter

The app is primarily a data/intelligence product.

---

# 22. Responsive Design

Must work on:

* Desktop
* Tablet
* Mobile

Desktop should prioritize information density.

Mobile should transform tables into cards where necessary — including the broker net-buy table and the swing candidate list.

Do not simply horizontally overflow every table.

---

# 23. Components

Create reusable components such as:

```text
MarketOverview
StockTable
StockCard
ScoreCard
ScoreBadge
SignalBadge
MoneyFlowCard
RiskBadge
CorporateActionCard
PriceChart
VolumeChart
StockScreener
FilterPanel
IntelligenceSummary
BrokerAccumulationTable
BrokerTierBadge
VolumeAuthenticityCard
SwingCandidateCard
SwingCandidateList
FundamentalWarningNote
```

Keep components reasonably small.

---

# 24. Folder Structure

Use a simple structure:

```text
src/
├── components/
├── pages/
├── features/
│   ├── dashboard/
│   ├── screener/
│   ├── stock/
│   ├── money-flow/
│   ├── broker-radar/
│   ├── swing-candidates/
│   └── corporate-actions/
├── data/
├── services/
├── utils/
├── hooks/
├── types/
├── lib/
├── App.tsx
└── main.tsx
```

Do not create unnecessary abstraction layers.

---

# 25. Vercel Deployment

The project MUST work with:

```bash
npm install
npm run dev
```

and:

```bash
npm run build
```

The final project should be deployable using:

```bash
vercel
```

or through GitHub → Vercel.

Avoid dependencies that require special server configuration. Broker/volume scoring (Sections 13a-13b) is the heaviest computation **and** typically relies on the most fragile data source (Bandarmology data rarely has an official free API) — always run it in a Vercel Serverless Function or Cron Job that writes precomputed results to a cache (Vercel KV / Edge Config), never client-side or on every request. Apply the same caching discipline to any unofficial/scraped endpoint used for live price data (Section 3), since those are the most rate-limit-prone.

---

# 26. Environment Variables

If an external API is introduced later:

```text
VITE_*
```

variables may be used only for values that are safe to expose publicly.

Never put private API keys into:

```text
VITE_*
```

Private secrets must use Vercel server-side environment variables.

---

# 27. Vercel API

If a backend endpoint is required, prefer Vercel serverless functions.

Example:

```text
/api/stocks
/api/stocks/[ticker]
/api/corporate-actions
/api/broker-summary/[ticker]
/api/volume-authenticity/[ticker]
/api/swing-candidates
```

Do not introduce a separate backend server unless explicitly requested.

---

# 28. Error Handling

Every async UI must have:

* Loading state
* Error state
* Empty state

Example:

```text
Unable to load stock data.

Try again
```

Do not leave blank screens. If broker or volume-authenticity data isn't available for a ticker, show an explicit "Broker data unavailable" state rather than a broken card.

---

# 29. Financial Disclaimer

Include a small disclaimer in the application:

> This application provides analytical insights and does not constitute financial advice. Signals and scores are not guarantees of future performance. Past broker accumulation and volume patterns do not guarantee future price movement.

Do not use:

```text
Guaranteed profit
Guaranteed increase
100% accurate
Insider buying confirmed
Manipulation confirmed
```

Prefer:

```text
Potential accumulation
Bullish setup
Unusual trading pattern
Positive catalyst
Elevated risk
Potential entry zone
Broker accumulation detected (Tier A/B/C)
Volume authenticity assessment
```

---

# 30. Development Approach

Claude should work feature-by-feature.

Start with:

## Step 1

Create:

```text
React + Vite
TypeScript
Tailwind
Routing
Dark UI
```

## Step 2

Research and pick a free, public live source for price/OHLCV/market-cap data per Section 3, then connect it via a live provider, plus small `Mock*Provider` fixtures for local dev/testing per Section 19.

## Step 3

Build Dashboard.

## Step 4

Build Screener.

## Step 5

Build Stock Detail.

## Step 6

Add Lightweight Charts.

## Step 7

Add Money Flow scoring.

## Step 8

Add Corporate Action Radar.

## Step 9

Add Buy/Sell scoring.

## Step 9a

Add mock broker data + Broker Accumulation Analysis (Section 13a), including `/broker-radar` and the Bandarmology tab.

## Step 9b

Add Volume Authenticity Detection (Section 13b) and feed it into Manipulation Risk (Section 13).

## Step 9c

Add Swing Trade Candidate Detection (Section 13c), including `/swing-candidates` and the fundamental warning layer.

## Step 10

Polish UI.


---

# 31. Claude Code Rule

Do not build everything in one giant change.

After every meaningful feature:

```text
1. Implement
2. Run npm run build
3. Fix errors
4. Review UI
5. Continue
```

Do not rewrite working code unnecessarily.

Prefer the simplest implementation that works.

**Do not change or remove existing core features** (Dashboard, Screener, Stock Detail, Price Chart, Money Flow, Manipulation Risk, Corporate Action Radar, Buy/Sell Signals) while adding new ones. New features (Bandarmology, Volume Authenticity, Swing Candidates, live data providers, etc.) should be additive: new files, new components, new tabs/routes, or small integration points explicitly called for in this document (e.g. a new filter in the Screener, a new tab on Stock Detail). If a new feature seems to require changing how an existing core feature works or looks, stop and confirm before doing it rather than refactoring it as a side effect.

---

# 32. MVP Definition

The MVP is successful when a user can:

```text
Open dashboard
        ↓
See IHSG overview
        ↓
See top opportunities
        ↓
Filter Market Cap > Rp 1T
        ↓
Sort by Money Flow
        ↓
Open a stock
        ↓
See chart
        ↓
See money-flow score
        ↓
See accumulation score
        ↓
See broker accumulation tier (Bandarmology)
        ↓
See volume authenticity score
        ↓
See manipulation risk
        ↓
See corporate catalyst
        ↓
See overall score
        ↓
See BUY / WATCH / SELL
        ↓
Open Swing Candidates page
        ↓
See ranked list with entry/SL/TP and fundamental warnings
        ↓
Understand why
```

Keep the experience fast, clean, and visually convincing.

---

# 33. Final Rule

This is a **Vercel-first MVP**.

Do not over-engineer.

The priority is:

```text
Simple
→ Fast
→ Beautiful
→ Useful
→ Deployable
→ Expandable
```

Build the simplest version that demonstrates the concept convincingly.
