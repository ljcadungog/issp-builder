import { cn } from "@/lib/utils";
import type { SectionStatus } from "@/lib/store";

/**
 * A small colored dot indicating the completion status of an ISSP section.
 *
 * | status        | color  | meaning                    |
 * |---------------|--------|----------------------------|
 * | `"empty"`     | gray   | Section not yet touched    |
 * | `"in_progress"` | amber | Section has content but not marked done |
 * | `"done"`      | green  | User has marked section done |
 *
 * Used in `EditorSidebar` nav items and `PartCard` section lists.
 * Status is derived from `SectionMeta` via `computeStatus()` in `src/lib/sections.ts`.
 */
interface StatusDotProps {
  status: SectionStatus;
  /** Dot diameter in px. Default: 7 */
  size?: number;
  className?: string;
}

const COLOR: Record<SectionStatus, string> = {
  done:        "bg-success",
  in_progress: "bg-warning",
  empty:       "bg-muted-foreground/30",
};

export function StatusDot({ status, size = 7, className }: StatusDotProps) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full", COLOR[status], className)}
      style={{ width: size, height: size }}
      aria-label={status.replace("_", " ")}
    />
  );
}
