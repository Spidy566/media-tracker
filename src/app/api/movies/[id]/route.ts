import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMovieSchema = z.object({
    status: z.enum(["PLAN_TO_WATCH", "WATCHING", "COMPLETED", "DROPPED", "ON_HOLD"]).optional(),
    rating: z.number().min(1).max(10).nullable().optional(),
    notes: z.string().nullable().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const movie = await prisma.movie.findUnique({ where: { id } });

    if (!movie) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(movie);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateMovieSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    try {
        const movie = await prisma.movie.update({
            where: { id },
            data: parsed.data,
        });
        return NextResponse.json(movie);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.movie.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}