import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fetchMonthlyCalendarReleases } from "@/lib/calendar-releases";

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must match YYYY-MM")
    .refine((val) => {
      const [yearStr, monthStr] = val.split("-");
      const year = Number.parseInt(yearStr, 10);
      const month = Number.parseInt(monthStr, 10);
      if (month < 1 || month > 12) return false;

      const currentYear = new Date().getUTCFullYear();
      return year >= 1990 && year <= currentYear + 3;
    }, "Month must fall between 1990-01 and three years from now"),
  type: z.enum(["all", "movie", "tv", "game"]).default("all"),
  lang: z.string().default("all"),
  depth: z.enum(["top", "all"]).default("top"),
});

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse({
    month: searchParams.get("month") ?? "",
    type: searchParams.get("type") || "all",
    lang: searchParams.get("lang") || "all",
    depth: searchParams.get("depth") || "top",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { response, revalidateSeconds, allFailed } = await fetchMonthlyCalendarReleases(
    parsed.data,
  );

  if (allFailed) {
    return NextResponse.json({ error: "All calendar sources failed to load" }, { status: 502 });
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": `public, s-maxage=${revalidateSeconds}, stale-while-revalidate=86400`,
    },
  });
}
