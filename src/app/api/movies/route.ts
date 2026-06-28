import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMovieSchema } from "@/lib/validations/movie";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const parsed = addMovieSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { tmdbId, title, posterPath, releaseDate, overview } = parsed.data;

    try {
        const movie = await prisma.movie.create({
            data: {
                tmdbId,
                title,
                posterPath,
                releaseDate: releaseDate ? new Date(releaseDate) : null,
                overview,
            },
        });
        return NextResponse.json(movie, { status: 201 });
    } catch (error: any) {
        if (error.code === "P2002") {
            // Prisma's unique constraint violation code
            return NextResponse.json(
                { error: "Movie already in your library" },
                { status: 409 }
            );
        }
        console.error(error);
        return NextResponse.json({ error: "Failed to add movie" }, { status: 500 });
    }
}

export async function GET() {
    const movies = await prisma.movie.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(movies);
}