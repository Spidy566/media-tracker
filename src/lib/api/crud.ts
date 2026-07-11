import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { desc, eq, type AnyColumn } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { ZodSchema } from "zod";

export async function listAll(table: PgTable, orderColumn: AnyColumn) {
  const rows = await db.select().from(table).orderBy(desc(orderColumn));
  return NextResponse.json(rows);
}

export async function getById(table: PgTable, idColumn: AnyColumn, id: string) {
  const [row] = await db.select().from(table).where(eq(idColumn, id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function createOne<T>(
  table: PgTable,
  schema: ZodSchema<T>,
  body: unknown,
  duplicateMessage: string,
  transform?: (data: T) => Record<string, unknown>
) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const values = transform ? transform(parsed.data) : parsed.data;
    const [row] = await db.insert(table).values(values as never).returning();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: duplicateMessage }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function updateById<T>(
  table: PgTable,
  idColumn: AnyColumn,
  schema: ZodSchema<T>,
  id: string,
  body: unknown
) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(table)
      .set({ ...parsed.data, updatedAt: new Date() } as never)
      .where(eq(idColumn, id))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function deleteById(table: PgTable, idColumn: AnyColumn, id: string) {
  try {
    await db.delete(table).where(eq(idColumn, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}