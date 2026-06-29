import { NextRequest, NextResponse } from "next/server";
import { igdbFetch } from "@/lib/igdb";

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("query");

    if (!query) {
        return NextResponse.json(
            { error: "Query parameter is required" },
            { status: 400 }
        );
    }

    try {
        // Apicalypse query: search by name, ask for the fields we need
        const body = `search "${query}"; fields name,cover.url,first_release_date,summary,genres.name; limit 20;`;
        const data = await igdbFetch("/games", body);
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch from IGDB" },
            { status: 500 }
        );
    }
}