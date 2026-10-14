import { ArrowLeft, Film } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mb-6 shadow-xs">
        <Film className="w-8 h-8 stroke-[1.5]" />
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        404 — Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        Lost in the archives?
      </h1>

      <p className="text-sm text-muted-foreground max-w-md mb-8">
        We couldn&apos;t find the title, member, or page you were looking for. It might have been
        removed or the link is incorrect.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-bold hover:opacity-90 transition shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </Link>
    </main>
  );
}
