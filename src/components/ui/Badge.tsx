import type { HTMLAttributes, ReactNode } from "react";
import { C, tint } from "../../lib/colors";
import { cn } from "../../lib/utils";

export type BadgeVariant =
  | "neutral"
  | "outline"
  | "accent"
  | "good"
  | "warn"
  | "serious"
  | "critical";

const VARIANT_STYLE: Record<BadgeVariant, { fg: string; bg: string }> = {
  neutral: { fg: C.ink2, bg: "rgba(255,255,255,0.08)" },
  outline: { fg: C.ink2, bg: "rgba(255,255,255,0.03)" },
  accent: { fg: C.accent, bg: tint(C.accent) },
  good: { fg: C.good, bg: tint(C.good) },
  warn: { fg: C.warn, bg: tint(C.warn) },
  serious: { fg: C.serious, bg: tint(C.serious) },
  critical: { fg: C.critical, bg: tint(C.critical) },
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
  className?: string;
}

/** Small pill badge. Status colors always ship with an icon + label. */
export function Badge({ variant = "neutral", icon, className, children, ...props }: BadgeProps) {
  const s = VARIANT_STYLE[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        className,
      )}
      style={{ color: s.fg, backgroundColor: s.bg }}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
