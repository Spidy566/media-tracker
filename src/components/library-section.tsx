"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MediaCard } from "@/components/media-card";
import type { StatusOption } from "@/lib/media-status";

interface LibraryItem {
  id: string;
  title: string;
  status: string;
}

interface LibrarySectionProps<T extends LibraryItem> {
  items: T[] | undefined;
  isLoading: boolean;
  statuses: StatusOption[];
  hrefBase: string;
  getImageUrl: (item: T) => string | null;
}

export function LibrarySection<T extends LibraryItem>({
  items,
  isLoading,
  statuses,
  hrefBase,
  getImageUrl,
}: LibrarySectionProps<T>) {
  if (isLoading) return <p className="text-gray-500 mt-4">Loading...</p>;

  return (
    <Tabs defaultValue="ALL" className="mt-4">
      <TabsList>
        {statuses.map((s) => (
          <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
        ))}
      </TabsList>

      {statuses.map((s) => {
        const filtered = s.value === "ALL" ? items : items?.filter((i) => i.status === s.value);
        return (
          <TabsContent key={s.value} value={s.value}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {filtered?.map((item) => (
                <MediaCard
                  key={item.id}
                  title={item.title}
                  imageUrl={getImageUrl(item)}
                  href={`${hrefBase}/${item.id}`}
                  status={item.status}
                />
              ))}
            </div>
            {filtered?.length === 0 && <p className="text-gray-500 mt-4">Nothing here yet.</p>}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}