"use client";

import type { CalendarItem } from "@/app/api/calendar/route";
import type { MediaStatus } from "@/db/schema";
import { formatDayHeading, relativeLabel } from "@/lib/calendar-dates";
import { CalendarRow } from "../calendar-row";

interface AgendaListViewProps {
  sortedAgendaDays: Array<{ day: string; items: CalendarItem[] }>;
  todayYmd: string;
  view: "grid" | "list";
  myStatus: Record<string, MediaStatus>;
  isMutatingStatus?: boolean;
  onQuickStatus: (media: CalendarItem, status: "want_to" | "doing" | "done") => void;
  agendaContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function AgendaListView({
  sortedAgendaDays,
  todayYmd,
  view,
  myStatus,
  isMutatingStatus = false,
  onQuickStatus,
  agendaContainerRef,
}: AgendaListViewProps) {
  if (sortedAgendaDays.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-border rounded-3xl p-6">
        <p className="text-sm font-semibold text-foreground font-sans">No releases found</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No releases match your current filters for this month. Try changing language or release type.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={agendaContainerRef}
      className={`${view === "grid" ? "block md:hidden" : "block"} space-y-8`}
    >
      {sortedAgendaDays.map(({ day, items }) => {
        const isPast = day < todayYmd;
        const headingLabel = formatDayHeading(day);
        const relText = relativeLabel(day, todayYmd);

        return (
          <section
            key={`agenda-group-${day}`}
            id={`agenda-day-${day}`}
            className={`space-y-3 ${isPast ? "opacity-60" : ""}`}
          >
            {/* Sticky day header */}
            <div className="sticky top-32 z-10 bg-background/95 backdrop-blur-md border-b border-border py-2 px-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-foreground font-sans flex items-center gap-2">
                {day === todayYmd && (
                  <span className="size-2 rounded-full bg-brand animate-pulse" />
                )}
                <span>{headingLabel}</span>
              </h3>
              {relText && (
                <span className="text-xs font-medium text-muted-foreground font-mono">{relText}</span>
              )}
            </div>

            {/* Release items */}
            <div className="space-y-2">
              {items.map((item) => (
                <CalendarRow
                  key={`agenda-item-${item.externalId}`}
                  item={item}
                  todayYmd={todayYmd}
                  myStatus={myStatus[item.externalId]}
                  onStatusChange={(status) => onQuickStatus(item, status)}
                  isMutating={isMutatingStatus}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
