import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";

/** Centered loading state with spinner. */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Centered error state with a retry action. */
export function ErrorState({
  message = "Unable to load data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircle className="h-8 w-8 text-critical" aria-hidden />
      <div>
        <p className="text-sm font-medium text-ink">{message}</p>
        <p className="mt-1 text-xs text-muted">Please try again later.</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-surface2 px-3 py-1.5 text-xs font-semibold text-ink2 transition hover:border-white/20 hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </button>
      )}
    </div>
  );
}

/** Centered empty state. */
export function EmptyState({
  title = "Nothing here",
  detail,
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full border border-white/10 bg-surface2 p-3">
        <Inbox className="h-5 w-5 text-muted" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink2">{title}</p>
      {detail && <p className="max-w-sm text-xs text-muted">{detail}</p>}
      {action}
    </div>
  );
}
