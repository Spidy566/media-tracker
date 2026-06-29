import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateGameSchema = z.object({
    status: z.enum(["PLAN_TO_PLAY", "PLAYING", "COMPLETED", "DROPPED", "ON_HOLD"]).optional(),
    rating: z.number().min(1).max(10).nullable().optional(),
    notes: z.string().nullable().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(game);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateGameSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid input", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    try {
        const game = await prisma.game.update({ where: { id }, data: parsed.data });
        return NextResponse.json(game);
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
        await prisma.game.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}