import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, MouseEventParams, Time } from "lightweight-charts";
import type { PriceData, TimeRange } from "../types";
import { C } from "../lib/colors";
import { cn } from "../lib/utils";
import { formatVolume } from "../utils/format";

export const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];

/** Simple moving average — null until the window fills. */
function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

/** Exponential moving average (seeded with SMA). */
function ema(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  seed /= period;
  out[period - 1] = seed;
  let prev = seed;
  for (let i = period; i < values.length; i++) {
    const v = values[i] * k + prev * (1 - k);
    out[i] = v;
    prev = v;
  }
  return out;
}

const tooltipTime = (time: Time): string => {
  const d = new Date((time as number) * 1000);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const clock = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return `${date} · ${clock} WIB`;
};

interface PriceChartProps {
  data: PriceData[];
  range: TimeRange;
  loading?: boolean;
  showSMA: boolean;
  showEMA: boolean;
}

/**
 * Candlestick + volume chart (TradingView Lightweight Charts).
 * One measure per pane: price candles with optional SMA/EMA overlays on top,
 * volume histogram in its own pane below. Crosshair + HTML tooltip.
 */
export function PriceChart({ data, range, loading, showSMA, showEMA }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [tip, setTip] = useState<{
    x: number;
    y: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    time: Time;
  } | null>(null);

  // Refs so the crosshair handler (bound once) reads fresh data.
  const dataRef = useRef(data);
  dataRef.current = data;
  const showSMARef = useRef(showSMA);
  showSMARef.current = showSMA;
  const showEMARef = useRef(showEMA);
  showEMARef.current = showEMA;

  const closes = useMemo(() => data.map((d) => d.close), [data]);
  const sma20 = useMemo(() => sma(closes, 20), [closes]);
  const ema20 = useMemo(() => ema(closes, 20), [closes]);

  // ── create chart once ────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: C.muted,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: C.surface3 },
        horzLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: C.surface3 },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 4 },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: C.up,
      downColor: C.down,
      wickUpColor: C.up,
      wickDownColor: C.down,
      borderVisible: false,
    });

    const volume = chart.addSeries(
      HistogramSeries,
      { priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false },
      1,
    );

    chart.priceScale("right", 1).applyOptions({ visible: false });
    chart.panes()[0].setStretchFactor(0.74);
    chart.panes()[1].setStretchFactor(0.26);

    const smaSeries = chart.addSeries(LineSeries, {
      color: C.series1,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const emaSeries = chart.addSeries(LineSeries, {
      color: C.series2,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const el2 = containerRef.current;
      const tipEl = tooltipRef.current;
      if (!el2 || !tipEl) return;

      if (!param.time || !param.point) {
        setTip(null);
        return;
      }

      const candleData = param.seriesData.get(candles) as
        | { open: number; high: number; low: number; close: number; volume?: number }
        | undefined;
      const idx = dataRef.current.findIndex((d) => d.time === (param.time as Time));
      if (!candleData || idx < 0) {
        setTip(null);
        return;
      }

      const rect = el2.getBoundingClientRect();
      const tooltipW = 168;
      const x = Math.min(param.point.x + 14, rect.width - tooltipW - 8);
      setTip({
        x,
        y: Math.max(param.point.y - 60, 8),
        o: candleData.open,
        h: candleData.high,
        l: candleData.low,
        c: candleData.close,
        v: dataRef.current[idx].volume,
        time: param.time as Time,
      });
    });

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;
    smaSeriesRef.current = smaSeries;
    emaSeriesRef.current = emaSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // ── data + range ─────────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const intraday = range === "1D";

    chart.applyOptions({
      timeScale: {
        timeVisible: intraday,
        secondsVisible: false,
        tickMarkFormatter: (time: Time) =>
          intraday && typeof time === "number"
            ? new Date(time * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : String(time),
      },
      localization: { locale: "en-GB" },
    });

    candleRef.current?.setData(data.map((d) => ({ time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close })));
    volumeRef.current?.setData(
      data.map((d) => ({
        time: d.time as Time,
        value: d.volume,
        color: d.close >= d.open ? `${C.up}3d` : `${C.down}3d`,
      })),
    );
    chart.timeScale().fitContent();
  }, [data, range]);

  // ── overlays ─────────────────────────────────────────────────────────
  useEffect(() => {
    const smaSeries = smaSeriesRef.current;
    const emaSeries = emaSeriesRef.current;
    if (!smaSeries || !emaSeries) return;

    const time = data.map((d) => d.time as Time);
    if (showSMA) {
      smaSeries.setData(
        sma20
          .map((v, i) => (v === null ? null : { time: time[i], value: round2(v) }))
          .filter((p): p is { time: Time; value: number } => p !== null),
      );
      smaSeries.applyOptions({ visible: true });
    } else {
      smaSeries.applyOptions({ visible: false });
    }

    if (showEMA) {
      emaSeries.setData(
        ema20
          .map((v, i) => (v === null ? null : { time: time[i], value: round2(v) }))
          .filter((p): p is { time: Time; value: number } => p !== null),
      );
      emaSeries.applyOptions({ visible: true });
    } else {
      emaSeries.applyOptions({ visible: false });
    }
  }, [data, showSMA, showEMA, sma20, ema20]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-[380px] w-full transition-opacity duration-200", loading && "opacity-50")}
    >
      {/* Crosshair tooltip */}
      {tip && (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-10 w-[168px] rounded-lg border border-white/10 bg-surface3/95 p-2.5 text-xs shadow-xl backdrop-blur"
          style={{ left: tip.x, top: tip.y }}
          role="presentation"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              {tooltipTime(tip.time)}
            </span>
            <span className={cn("num font-bold", tip.c >= tip.o ? "text-up" : "text-down")}>
              {tip.c >= tip.o ? "▲" : "▼"}
            </span>
          </div>
          <div className="num grid grid-cols-2 gap-x-2 gap-y-0.5">
            <TipRow label="Open" value={tip.o.toFixed(0)} />
            <TipRow label="High" value={tip.h.toFixed(0)} />
            <TipRow label="Low" value={tip.l.toFixed(0)} />
            <TipRow label="Close" value={tip.c.toFixed(0)} strong />
          </div>
          <div className="mt-1.5 border-t border-white/10 pt-1.5">
            <TipRow label="Volume" value={formatVolume(tip.v)} />
            {showSMARef.current && sma20 && <TipRow label="SMA20" value={sma20[dataRef.current.findIndex((d) => d.time === tip.time)]?.toFixed(0) ?? "—"} dot={C.series1} />}
            {showEMARef.current && ema20 && <TipRow label="EMA20" value={ema20[dataRef.current.findIndex((d) => d.time === tip.time)]?.toFixed(0) ?? "—"} dot={C.series2} />}
          </div>
        </div>
      )}
    </div>
  );
}

function TipRow({ label, value, strong, dot }: { label: string; value: string; strong?: boolean; dot?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-muted">
        {dot && <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} aria-hidden />}
        {label}
      </span>
      <span className={cn("num", strong ? "font-bold text-ink" : "font-semibold text-ink2")}>{value}</span>
    </div>
  );
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
