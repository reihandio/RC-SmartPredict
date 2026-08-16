import { useEffect, useRef } from "react";
import { useAsync } from "./useAsync";
import type { AsyncState } from "./useAsync";

/**
 * Async data with conservative polling (default 60s).
 * Only re-fetches when the browser tab is visible.
 */
export function usePolling<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[],
  intervalMs = 60_000,
): AsyncState<T> & { retry: () => void } {
  const result = useAsync(fn, deps);
  const retryRef = useRef(result.retry);
  retryRef.current = result.retry;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        retryRef.current();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return result;
}
