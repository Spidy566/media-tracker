"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface MediaCardProps {
  title: string;
  imageUrl: string | null;
  href?: string;
  status?: string;
  subtitle?: string;
  actionButton?: ReactNode;
}

export function MediaCard({
  title,
  imageUrl,
  href,
  status,
  subtitle,
  actionButton,
}: MediaCardProps) {
  const [hasError, setHasError] = useState(false);

  const cardContent = (
    <Card className="hover:opacity-80 transition h-full flex flex-col">
      <CardContent className="p-2 grow">
        {imageUrl && !hasError ? (
          <Image
            src={imageUrl}
            alt={title}
            width={300}
            height={450}
            loading="eager"
            fetchPriority="high"
            className="rounded-md mb-2 object-cover aspect-2/3 w-full"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="bg-gray-200 aspect-2/3 rounded-md mb-2 flex items-center justify-center text-sm text-gray-500 w-full">
            No image
          </div>
        )}

        <p className="text-sm font-medium line-clamp-2">{title}</p>

        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}

        {status && (
          <Badge variant="secondary" className="mt-1">
            {status.replace(/_/g, " ")}
          </Badge>
        )}
      </CardContent>

      {actionButton && <div className="p-2 pt-0 mt-auto">{actionButton}</div>}
    </Card>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}
