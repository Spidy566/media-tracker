"use client";

import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"button"> & { href?: string };

function PaginationLink({
  className,
  isActive,
  size = "icon",
  href,
  ...props
}: PaginationLinkProps) {
  const linkClasses = cn(
    "size-9 rounded-lg text-sm transition-colors",
    isActive
      ? "border-brand bg-card text-foreground font-medium"
      : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground",
    className,
  );

  if (href) {
    return (
      <Button asChild variant={isActive ? "outline" : "ghost"} size={size} className={linkClasses}>
        <a
          href={href}
          aria-current={isActive ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...(props as unknown as React.ComponentProps<"a">)}
        />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "ghost"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn("cursor-pointer", linkClasses)}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Previous page"
      size="default"
      className={cn(
        "size-9 p-0 sm:w-auto sm:px-3 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed border border-border",
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon className="size-4" />
      <span className="hidden sm:inline text-xs">{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Next page"
      size="default"
      className={cn(
        "size-9 p-0 sm:w-auto sm:px-3 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed border border-border",
        className,
      )}
      {...props}
    >
      <span className="hidden sm:inline text-xs">{text}</span>
      <ChevronRightIcon className="size-4" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center text-muted-foreground", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
