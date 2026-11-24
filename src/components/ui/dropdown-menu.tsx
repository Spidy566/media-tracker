"use client";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-44 overflow-hidden rounded-xl border border-white/10 bg-[#16181D] p-1 text-[#ECEDEF] shadow-[0_8px_24px_-8px_rgba(0,0,0,.6)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-120",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-80",
          "motion-reduce:animate-none",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-[#ECEDEF] outline-none transition-colors duration-150",
        "data-highlighted:bg-white/6 data-highlighted:text-[#ECEDEF]",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
