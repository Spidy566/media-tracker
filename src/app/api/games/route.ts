import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addGameSchema } from "@/lib/validations/game";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const parsed = addGameSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { igdbId, title, coverUrl, releaseDate, summary, genres } = parsed.data;

    try {
        const game = await prisma.game.create({
            data: {
                igdbId,
                title,
                coverUrl,
                releaseDate: releaseDate ? new Date(releaseDate) : null,
                summary,
                genres,
            },
        });
        return NextResponse.json(game, { status: 201 });
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "Game already in your library" },
                { status: 409 }
            );
        }
        console.error(error);
        return NextResponse.json({ error: "Failed to add game" }, { status: 500 });
    }
}

export async function GET() {
    const games = await prisma.game.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(games);
}