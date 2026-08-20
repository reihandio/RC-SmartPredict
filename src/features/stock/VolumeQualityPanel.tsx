import { EmptyState } from "../../components/states";

/**
 * Volume Quality tab (Section 13b) — placeholder while the volume
 * authenticity scoring ships in the next step. Never shows fabricated data.
 */
export function VolumeQualityPanel({ ticker: _ticker }: { ticker: string }) {
  return (
    <EmptyState
      title="Volume authenticity analysis coming soon"
      detail="Real-vs-fake volume scoring for this ticker is not available yet."
    />
  );
}
