import type * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-white/8 bg-[#16181D] px-3 py-1 text-sm text-[#ECEDEF] placeholder:text-[#A1A5AD] transition-colors outline-none focus-visible:border-[#7B7FEB] focus-visible:ring-1 focus-visible:ring-[#7B7FEB] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
