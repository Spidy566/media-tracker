import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Film, Gamepad2 } from "lucide-react";

export default function HomePage() {
  return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="flex justify-center gap-4 mb-4 text-muted-foreground">
          <Film className="w-12 h-12" />
          <Gamepad2 className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Track what you watch and play.</h1>
        <p className="text-muted-foreground mb-8">
          Manage your personal movie collection and video game backlog in one unified dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/search/movies">
            <Button>Search Movies</Button>
          </Link>
          <Link href="/search/games">
            <Button variant="secondary">Search Games</Button>
          </Link>
          <Link href="/library">
            <Button variant="outline">View Library</Button>
          </Link>
        </div>
      </div>
  );
}