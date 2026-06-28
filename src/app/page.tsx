import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Film } from "lucide-react";

export default function HomePage() {
  return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-3xl font-bold mb-3">Track everything you watch.</h1>
        <p className="text-muted-foreground mb-8">
          Movies first. Games and anime coming soon.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/search">
            <Button>Search Movies</Button>
          </Link>
          <Link href="/library">
            <Button variant="outline">View Library</Button>
          </Link>
        </div>
      </div>
  );
}