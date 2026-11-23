"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{ value?: string }>({});

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function Tabs({
  className,
  orientation = "horizontal",
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsContext.Provider value={{ value }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        value={value}
        className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex items-center text-muted-foreground",
  {
    variants: {
      variant: {
        default:
          "w-fit rounded-lg bg-muted p-[3px] group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
        line: "relative flex gap-2 border-b border-white/8 w-full justify-start rounded-none bg-transparent p-0 pb-1.5 overflow-x-auto scrollbar-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  const { value } = React.useContext(TabsContext);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState<{
    left: number;
    width: number;
    opacity: number;
    animate: boolean;
  }>({
    left: 0,
    width: 0,
    opacity: 0,
    animate: false,
  });
  const hasMeasuredRef = React.useRef(false);

  const measure = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const activeTab = list.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-state="active"]',
    );
    if (!activeTab) return;

    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;

    setIndicator((prev) => {
      const isInitial = !hasMeasuredRef.current;
      if (prev.left === left && prev.width === width && prev.opacity === 1) {
        return prev;
      }
      return {
        left,
        width,
        opacity: 1,
        animate: !isInitial && prev.opacity === 1,
      };
    });

    hasMeasuredRef.current = true;
  }, []);

  useIsomorphicLayoutEffect(() => {
    measure();
  }, [value, measure]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(list);

    const mutationObserver = new MutationObserver(() => {
      measure();
    });
    mutationObserver.observe(list, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [measure]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
      {variant === "line" && (
        <span
          data-slot="tabs-indicator"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-[#7B7FEB] motion-reduce:transition-none"
          style={{
            width: `${indicator.width}px`,
            transform: `translateX(${indicator.left}px)`,
            opacity: indicator.opacity,
            transition: indicator.animate
              ? "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), width 220ms cubic-bezier(0.2, 0.8, 0.2, 1)"
              : "none",
          }}
        />
      )}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "group/trigger relative inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-[#A1A5AD] outline-none cursor-pointer select-none transition-colors duration-150 rounded-md",
        // Hover on non-active tabs: text #ECEDEF and rounded-md bg-white/6 pill fades in behind label (150ms)
        "data-[state=inactive]:hover:bg-white/6 data-[state=inactive]:hover:text-[#ECEDEF]",
        // Active tab: text #ECEDEF, no pill
        "data-[state=active]:bg-transparent data-[state=active]:text-[#ECEDEF]",
        // Count text brightens slightly when tab is hovered
        "[&_.tab-count]:text-[#A1A5AD] [&_.tab-count]:transition-colors [&_.tab-count]:duration-150 hover:[&_.tab-count]:text-[#ECEDEF]/80",
        // Keyboard focus-visible: ring-2 ring-[#7B7FEB]/40 with a small radius
        "focus-visible:ring-2 focus-visible:ring-[#7B7FEB]/40 focus-visible:rounded-md",
        "disabled:pointer-events-none disabled:opacity-50",
        // Respect prefers-reduced-motion
        "motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
