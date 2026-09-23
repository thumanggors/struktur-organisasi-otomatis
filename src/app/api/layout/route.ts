import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Item = { id: string; posX: number; posY: number; busY: number | null };

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Saves a full snapshot of manual chart positions. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: unknown = body?.items;
  if (
    !Array.isArray(items) ||
    !items.every(
      (i: Item) => typeof i?.id === "string" && num(i.posX) && num(i.posY) && (i.busY === null || num(i.busY))
    )
  ) {
    return NextResponse.json({ error: "Data tata letak tidak valid" }, { status: 400 });
  }

  await db.$transaction(
    (items as Item[]).map((i) =>
      db.person.updateMany({ where: { id: i.id }, data: { posX: i.posX, posY: i.posY, busY: i.busY } })
    )
  );
  return NextResponse.json({ ok: true });
}

/** Back to the automatic layout. */
export async function DELETE() {
  await db.person.updateMany({ data: { posX: null, posY: null, busY: null } });
  return NextResponse.json({ ok: true });
}
