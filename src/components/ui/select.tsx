"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group data-slot="select-group" className={cn("p-1", className)} {...props} />
  );
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group flex h-9 w-fit items-center justify-between gap-2.5 rounded-lg border border-white/8 bg-[#16181D] px-3 text-sm font-medium text-[#ECEDEF] whitespace-nowrap transition-colors outline-none select-none hover:border-white/16 focus-visible:ring-2 focus-visible:ring-[#7B7FEB]/40 data-[state=open]:border-[#7B7FEB]/60 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 text-[#A1A5AD] shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 6,
  align = "start",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "relative z-50 max-h-80 min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-white/10 bg-[#16181D] p-1 text-[#ECEDEF] shadow-[0_8px_24px_-8px_rgba(0,0,0,.6)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-120",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-80",
          "motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2.5 py-1.5 text-xs font-medium text-[#A1A5AD]", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  count,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  count?: number | string;
}) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex h-9 w-full cursor-pointer select-none items-center justify-between gap-4 rounded-lg px-3 text-sm font-medium text-[#A1A5AD] outline-none transition-colors duration-150",
        "data-highlighted:bg-white/6 data-highlighted:text-[#ECEDEF]",
        "data-[state=checked]:text-[#7B7FEB]",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <div className="flex items-center gap-2 shrink-0">
        {count !== undefined && (
          <span className="text-xs text-[#A1A5AD] font-mono tabular-nums">{count}</span>
        )}
        <span className="flex size-4 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <CheckIcon className="size-4 text-[#7B7FEB] stroke-2" />
          </SelectPrimitive.ItemIndicator>
        </span>
      </div>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-white/8", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-[#16181D] py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4 text-[#A1A5AD]" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-[#16181D] py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4 text-[#A1A5AD]" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
