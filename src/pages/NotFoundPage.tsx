import { Link } from "react-router-dom";
import { EmptyState } from "../components/states";

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        title="Page not found"
        detail="The page you are looking for does not exist."
        action={
          <Link
            to="/"
            className="rounded-lg border border-white/10 bg-surface2 px-3 py-1.5 text-xs font-semibold text-ink2 transition hover:border-white/20 hover:text-ink"
          >
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
