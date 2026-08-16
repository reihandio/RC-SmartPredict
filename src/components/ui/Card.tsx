import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/** Standard surface card with a hairline border. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}
