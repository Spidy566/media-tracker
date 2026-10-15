import { type NextRequest, NextResponse } from "next/server";
import { getMediaDetails } from "@/lib/media-details";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv" && type !== "game") {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  try {
    const details = await getMediaDetails(type, id);
    if (!details) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch media details";
    console.error("Media details error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
