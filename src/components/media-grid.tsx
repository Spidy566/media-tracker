import type * as React from "react";
import { cn } from "@/lib/utils";

export const MEDIA_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 sm:gap-5";

export function MediaGrid({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn(MEDIA_GRID_CLASS, className)} {...props}>
      {children}
    </div>
  );
}
