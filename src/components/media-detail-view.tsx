"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { StatusOption } from "@/lib/media-status";

interface MediaDetailViewProps {
  title: string;
  imageUrl: string | null;
  subtitle: string | null;
  description: string | null;
  tags?: string[];
  status: string;
  rating: number | null;
  notes: string | null;
  statuses: StatusOption[];
  backHref: string;
  onStatusChange: (status: string) => void;
  onRatingChange: (rating: number) => void;
  onNotesBlur: (notes: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function MediaDetailView({
  title,
  imageUrl,
  subtitle,
  description,
  tags,
  status,
  rating,
  notes,
  statuses,
  backHref,
  onStatusChange,
  onRatingChange,
  onNotesBlur,
  onDelete,
  isDeleting,
}: MediaDetailViewProps) {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Button
        variant="ghost"
        onClick={() => router.push(backHref)}
        className="mb-4"
      >
        ← Back to Library
      </Button>

      <div className="flex gap-6">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={title}
            width={300}
            height={450}
            loading="eager"
            fetchPriority="high"
            className="rounded-md w-40"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {tags && tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {description && <p className="text-sm mt-2">{description}</p>}
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Status</label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">
            Rating (1-10)
          </label>
          <Select
            value={rating?.toString() ?? ""}
            onValueChange={(v) => onRatingChange(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Not rated" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Notes</label>
          <Textarea
            defaultValue={notes ?? ""}
            onBlur={(e) => onNotesBlur(e.target.value)}
            placeholder="Your thoughts..."
            rows={4}
          />
        </div>

        <Button variant="destructive" disabled={isDeleting} onClick={onDelete}>
          Remove from Library
        </Button>
      </div>
    </div>
  );
}
