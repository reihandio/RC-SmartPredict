# CLAUDE.md

## Project

Build a modern Indonesian stock intelligence web app focused on finding potential capital-gain opportunities from IDX/IHSG market data.

This is a **vibe coding project**.

The priority is:

> Build a visually impressive, useful MVP quickly and deploy it to Vercel.

Do NOT over-engineer the application.

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

The application focuses on five things:

1. Corporate actions / company catalysts.
2. Big money / money-flow detection.
3. Distinguishing genuine accumulation-like activity from suspicious activity.
4. Filtering stocks with market cap above IDR 1 trillion.
5. Providing potential buy/sell timing signals.

The application is an analytical tool.

It must NOT claim certainty or guaranteed returns.

---

# 3. Important Data Rule

Do not scrape TradingView.

Do not use undocumented TradingView APIs.

Do not assume TradingView provides a free raw-market-data API.

Use TradingView Lightweight Charts primarily for chart visualization.

Create a simple abstraction for market data:

```typescript
interface MarketDataProvider {
  getStocks(): Promise<Stock[]>;
  getStock(ticker: string): Promise<Stock | undefined>;
  getHistoricalPrices(ticker: string): Promise<PriceData[]>;
}
```

Initially implement:

```typescript
MockMarketDataProvider
```

The provider should be easy to replace later with a legitimate market-data source.

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

Allow sorting by:

```text
Score
Money Flow
Volume
Daily Change
Market Cap
Risk
```

Add preset buttons:

```text
🔥 Big Money
🚀 Breakout
💰 Accumulation
📰 Corporate Catalyst
⭐ High Score
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

The UI wording must be:

> "Unusual trading pattern"

or:

> "Elevated anomaly risk"

Never say:

> "This stock is being manipulated."

unless there is actual verified evidence.

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

⚠ RSI approaching overbought
⚠ Short-term volatility elevated
```

Never create a black-box:

```text
AI says BUY
```

---

# 19. Demo Data

For the MVP, create realistic mock data.

Include around:

```text
50-100 Indonesian stocks
```

Include examples of different scenarios:

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
```

The data must clearly be marked as:

```text
DEMO DATA
```

Do not pretend mock data is real-time IDX data.

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

Mobile should transform tables into cards where necessary.

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

Avoid dependencies that require special server configuration.

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

Do not leave blank screens.

---

# 29. Financial Disclaimer

Include a small disclaimer in the application:

> This application provides analytical insights and does not constitute financial advice. Signals and scores are not guarantees of future performance.

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

Create mock stock data.

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

## Step 10

Polish UI.

## Step 11

Build production version.

## Step 12

Deploy to Vercel.

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
See manipulation risk
        ↓
See corporate catalyst
        ↓
See overall score
        ↓
See BUY / WATCH / SELL
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
