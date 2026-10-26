"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { CalendarItem } from "@/app/api/calendar/route";
import type { MediaStatus } from "@/components/media-card";
import { formatFullDay, parseYMD, relativeLabel, toYMD } from "@/lib/calendar-dates";
import { CalendarRow } from "./calendar-row";

interface DayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYmd: string | null;
  onSelectYmd: (ymd: string) => void;
  monthYm: string;
  items: CalendarItem[];
  todayYmd: string;
  myStatus: Record<string, MediaStatus>;
  onStatusChange: (item: CalendarItem, status: "want_to" | "doing" | "done") => void;
}

export function DayPanel({
  isOpen,
  onClose,
  selectedYmd,
  onSelectYmd,
  monthYm,
  items,
  todayYmd,
  myStatus,
  onStatusChange,
}: DayPanelProps) {
  if (!selectedYmd) return null;

  const dayItems = items.filter((item) => item.releaseDate === selectedYmd);

  // Month boundary checks for prev/next day chevrons
  const currentDate = parseYMD(selectedYmd);
  const [yearStr, monthStr] = monthYm.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  const prevDate = new Date(currentDate);
  prevDate.setDate(currentDate.getDate() - 1);
  const canGoPrev = prevDate.getMonth() === month - 1;

  const nextDate = new Date(currentDate);
  nextDate.setDate(currentDate.getDate() + 1);
  const canGoNext = nextDate.getMonth() === month - 1 && nextDate.getDate() <= lastDayOfMonth;

  const handlePrev = () => {
    if (canGoPrev) {
      onSelectYmd(toYMD(prevDate));
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onSelectYmd(toYMD(nextDate));
    }
  };

  const fullDateLabel = formatFullDay(selectedYmd);
  const relativeText = relativeLabel(selectedYmd, todayYmd);
  const releaseCount = dayItems.length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />

        {/* Content: Floating Card on md+, Bottom Sheet below md */}
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 bg-popover border border-border shadow-2xl flex flex-col justify-between overflow-hidden outline-none duration-300
            max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-3xl max-md:p-5
            max-md:data-[state=open]:animate-in max-md:data-[state=closed]:animate-out
            max-md:data-[state=closed]:fade-out-0 max-md:data-[state=open]:fade-in-0
            max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom
            md:top-3 md:right-3 md:bottom-3 md:w-104 md:rounded-3xl md:p-6
            md:data-[state=open]:animate-in md:data-[state=closed]:animate-out
            md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0
            md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            {/* Prev / Next day buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                aria-label="Previous day"
                className="size-9 rounded-full border border-border bg-card/80 hover:bg-card text-foreground flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                aria-label="Next day"
                className="size-9 rounded-full border border-border bg-card/80 hover:bg-card text-foreground flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Close button */}
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close day panel"
                className="size-9 rounded-full border border-border bg-card/80 hover:bg-card text-foreground transition cursor-pointer shadow-2xs flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4.5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Date info title */}
          <div className="pt-4 pb-3">
            <Dialog.Title className="text-xl font-semibold tracking-tight text-foreground">
              {fullDateLabel}
            </Dialog.Title>
            <Dialog.Description className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              {relativeText && <span>{relativeText}</span>}
              {relativeText && <span>•</span>}
              <span>
                {releaseCount} {releaseCount === 1 ? "release" : "releases"}
              </span>
            </Dialog.Description>
          </div>

          {/* Body: list of releases */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-2.5">
            {releaseCount === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                No releases scheduled for this date.
              </div>
            ) : (
              dayItems.map((item) => (
                <CalendarRow
                  key={item.externalId}
                  item={item}
                  todayYmd={todayYmd}
                  myStatus={myStatus[item.externalId]}
                  onStatusChange={(status) => onStatusChange(item, status)}
                />
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
