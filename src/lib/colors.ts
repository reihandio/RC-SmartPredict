/**
 * Design tokens — validated data-viz palette (see dataviz references).
 * Dark theme only. All categorical / status / delta colors were checked
 * against the `bg`/`surface` values with the palette validator.
 */
export const C = {
  // surfaces & ink
  bg: "#0a0d14",
  surface: "#10141d",
  surface2: "#151b29",
  surface3: "#1c2434",
  ink: "#ffffff",
  ink2: "#c3c2b7",
  muted: "#898781",

  // deltas (IDX convention: green up, red down)
  up: "#0ca30c",
  down: "#e66767",

  // categorical series slots (fixed order)
  series1: "#3987e5", // blue
  series2: "#d95926", // orange
  series3: "#199e70", // aqua

  // status (reserved: good → critical)
  good: "#0ca30c",
  warn: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",

  // interaction accent
  accent: "#3987e5",
} as const;

/** Tone-on-tone fill (12-15% alpha) for badges. */
export function tint(hex: string, alpha = "1f"): string {
  return `${hex}${alpha}`;
}
