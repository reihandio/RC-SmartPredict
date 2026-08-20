import { cn } from "../../lib/utils";
import { actionTypeLabel } from "./actionMeta";

export interface ChipOption {
  id: string;
  label: string;
  count?: number;
}

interface ChipRowProps {
  /** Small uppercase row caption, e.g. "Jenis" / "Sumber". */
  caption: string;
  options: ChipOption[];
  /** Empty set = "Semua" (no filter). */
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
}

function ChipRow({ caption, options, selected, onToggle, onReset }: ChipRowProps) {
  const allActive = selected.size === 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-12 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {caption}
      </span>
      <button
        onClick={onReset}
        aria-pressed={allActive}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
          allActive
            ? "border-accent/40 bg-accent/15 text-accent"
            : "border-white/10 text-muted hover:border-white/25 hover:text-ink2",
        )}
      >
        Semua
      </button>
      {options.map((opt) => {
        const active = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
              active
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-white/10 text-muted hover:border-white/25 hover:text-ink2",
            )}
          >
            {opt.label}
            {typeof opt.count === "number" && (
              <span className={cn("num ml-1", active ? "text-accent/70" : "text-muted/70")}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface CorporateActionFilterChipsProps {
  /** Unique action types present in the data (already in display order). */
  types: string[];
  /** Counts per type (optional, shown next to the chip label). */
  typeCounts?: Record<string, number>;
  /** Selected types; empty = all. */
  selectedTypes: ReadonlySet<string>;
  onToggleType: (type: string) => void;
  /** Clears the type row ("Semua"). */
  onClearTypes: () => void;
  /** Unique source names present in the data. */
  sources: string[];
  sourceCounts?: Record<string, number>;
  /** Selected sources; empty = all. */
  selectedSources: ReadonlySet<string>;
  onToggleSource: (source: string) => void;
  /** Clears the source row ("Semua"). */
  onClearSources: () => void;
  className?: string;
}

/**
 * Filter chips for the Corporate Action Radar (Section 14): one row for
 * event-type categories, one row for news sources. Multi-select toggles;
 * "Semua" clears the row.
 */
export function CorporateActionFilterChips({
  types,
  typeCounts,
  selectedTypes,
  onToggleType,
  onClearTypes,
  sources,
  sourceCounts,
  selectedSources,
  onToggleSource,
  onClearSources,
  className,
}: CorporateActionFilterChipsProps) {
  const typeOptions: ChipOption[] = types.map((t) => ({
    id: t,
    label: actionTypeLabel(t),
    count: typeCounts?.[t],
  }));
  const sourceOptions: ChipOption[] = sources.map((s) => ({
    id: s,
    label: s,
    count: sourceCounts?.[s],
  }));

  return (
    <div className={cn("space-y-2", className)}>
      <ChipRow
        caption="Jenis"
        options={typeOptions}
        selected={selectedTypes}
        onToggle={onToggleType}
        onReset={onClearTypes}
      />
      <ChipRow
        caption="Sumber"
        options={sourceOptions}
        selected={selectedSources}
        onToggle={onToggleSource}
        onReset={onClearSources}
      />
    </div>
  );
}
