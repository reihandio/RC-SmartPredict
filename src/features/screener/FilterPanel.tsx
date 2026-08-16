import { useState } from "react";
import type { ReactNode } from "react";
import { Flame, Newspaper, PiggyBank, Rocket, RotateCcw, Star } from "lucide-react";
import type { Signal } from "../../types";
import { cn } from "../../lib/utils";

/** All screener filter state lives here — simple and easy to extend. */
export interface ScreenerFilters {
  search: string;
  minMarketCap1T: boolean; // mandatory default: > Rp 1T
  minChange: number; // %, 0 = any
  minVolumeRatio: number; // 0 = any
  minMoneyFlow: number; // 0-100, 0 = any
  minAccumulation: number; // 0 = any
  minCatalyst: number; // 0 = any
  maxRisk: number; // 100 = any
  minScore: number; // 0 = any
  signal: Signal | "ANY";
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  search: "",
  minMarketCap1T: true,
  minChange: 0,
  minVolumeRatio: 0,
  minMoneyFlow: 0,
  minAccumulation: 0,
  minCatalyst: 0,
  maxRisk: 100,
  minScore: 0,
  signal: "ANY",
};

export interface Preset {
  id: string;
  label: string;
  icon: typeof Flame;
  /** Constraints applied on top of the defaults. */
  patch: Partial<ScreenerFilters>;
}

export const PRESETS: Preset[] = [
  { id: "big-money", label: "Big Money", icon: Flame, patch: { minMoneyFlow: 70 } },
  {
    id: "breakout",
    label: "Breakout",
    icon: Rocket,
    patch: { minChange: 3, minVolumeRatio: 1.5 },
  },
  { id: "accumulation", label: "Accumulation", icon: PiggyBank, patch: { minAccumulation: 70 } },
  { id: "catalyst", label: "Corporate Catalyst", icon: Newspaper, patch: { minCatalyst: 65 } },
  { id: "high-score", label: "High Score", icon: Star, patch: { minScore: 70 } },
];

const SIGNAL_OPTIONS: Array<Signal | "ANY"> = [
  "ANY",
  "STRONG BUY",
  "BUY",
  "WATCH",
  "HOLD",
  "REDUCE",
  "SELL",
  "AVOID",
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const controlCls =
  "w-full rounded-lg border border-white/10 bg-surface2 px-2.5 py-1.5 text-sm text-ink transition placeholder:text-muted/70 hover:border-white/20 focus:border-accent focus:outline-none";

/** min slider: 0 = any · max slider: max = any */
function Slider({
  value,
  max,
  direction,
  onChange,
  label,
}: {
  value: number;
  max: number;
  direction: "min" | "max";
  onChange: (v: number) => void;
  label: string;
}) {
  const isAny = direction === "min" ? value === 0 : value === max;
  const display = isAny ? "Any" : `${direction === "min" ? "≥" : "≤"} ${value}`;
  return (
    <Field label={label}>
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
        />
        <span className={cn("num w-10 shrink-0 text-right text-xs font-semibold", isAny ? "text-muted" : "text-accent")}>
          {display}
        </span>
      </div>
    </Field>
  );
}

interface FilterPanelProps {
  filters: ScreenerFilters;
  onChange: (f: ScreenerFilters) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  /** Manual edits clear any active preset. */
  const set = (patch: Partial<ScreenerFilters>) => {
    setActivePreset(null);
    onChange({ ...filters, ...patch });
  };

  const applyPreset = (preset: Preset) => {
    setActivePreset(activePreset === preset.id ? null : preset.id);
    onChange({
      ...DEFAULT_FILTERS,
      search: filters.search,
      ...(activePreset === preset.id ? {} : preset.patch),
    });
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Presets</span>
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                activePreset === preset.id
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-white/10 bg-surface2 text-ink2 hover:border-white/20 hover:text-ink",
              )}
              aria-pressed={activePreset === preset.id}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {preset.label}
            </button>
          );
        })}
        <button
          onClick={() => {
            setActivePreset(null);
            onChange({ ...DEFAULT_FILTERS, search: filters.search });
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition hover:text-ink2"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 xl:grid-cols-4">
        <Field label="Search">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Ticker or company…"
            className={controlCls}
          />
        </Field>

        <Field label="Market Cap">
          <label className="flex h-[34px] cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-surface2 px-2.5 text-sm text-ink2 transition hover:border-white/20">
            <input
              type="checkbox"
              checked={filters.minMarketCap1T}
              onChange={(e) => set({ minMarketCap1T: e.target.checked })}
              className="h-3.5 w-3.5 rounded accent-accent"
            />
            &gt; Rp 1T
          </label>
        </Field>

        <Field label="Daily Change">
          <select
            value={filters.minChange}
            onChange={(e) => set({ minChange: Number(e.target.value) })}
            className={controlCls}
          >
            <option value={0}>Any</option>
            <option value={2}>≥ +2%</option>
            <option value={3}>≥ +3%</option>
            <option value={5}>≥ +5%</option>
          </select>
        </Field>

        <Field label="Volume Ratio">
          <select
            value={filters.minVolumeRatio}
            onChange={(e) => set({ minVolumeRatio: Number(e.target.value) })}
            className={controlCls}
          >
            <option value={0}>Any</option>
            <option value={1.5}>≥ 1.5×</option>
            <option value={2.5}>≥ 2.5×</option>
          </select>
        </Field>

        <Field label="Signal">
          <select
            value={filters.signal}
            onChange={(e) => set({ signal: e.target.value as Signal | "ANY" })}
            className={controlCls}
          >
            {SIGNAL_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ANY" ? "Any" : s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Min Overall Score">
          <select
            value={filters.minScore}
            onChange={(e) => set({ minScore: Number(e.target.value) })}
            className={controlCls}
          >
            <option value={0}>Any</option>
            <option value={50}>≥ 50</option>
            <option value={60}>≥ 60</option>
            <option value={70}>≥ 70</option>
            <option value={80}>≥ 80</option>
          </select>
        </Field>

        <Field label="Min Catalyst">
          <select
            value={filters.minCatalyst}
            onChange={(e) => set({ minCatalyst: Number(e.target.value) })}
            className={controlCls}
          >
            <option value={0}>Any</option>
            <option value={60}>≥ 60</option>
            <option value={70}>≥ 70</option>
            <option value={80}>≥ 80</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-white/5 pt-3 md:grid-cols-3">
        <Slider label="Min Money Flow" direction="min" value={filters.minMoneyFlow} max={100} onChange={(v) => set({ minMoneyFlow: v })} />
        <Slider label="Min Accumulation" direction="min" value={filters.minAccumulation} max={100} onChange={(v) => set({ minAccumulation: v })} />
        <Slider label="Max Manipulation Risk" direction="max" value={filters.maxRisk} max={100} onChange={(v) => set({ maxRisk: v })} />
      </div>
    </div>
  );
}
