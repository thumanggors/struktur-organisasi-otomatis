import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SIDES, type Side } from "@/lib/layout";

const LINE_FIELDS = ["busY", "trunkX", "linkOff"] as const;
type Item = { id: string; posX: number; posY: number; linkSide: Side | null } & Record<
  (typeof LINE_FIELDS)[number],
  number | null
>;

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const valid = (i: Item) =>
  typeof i?.id === "string" &&
  num(i.posX) &&
  num(i.posY) &&
  LINE_FIELDS.every((f) => i[f] === null || num(i[f])) &&
  (i.linkSide === null || SIDES.includes(i.linkSide));

/** Saves a full snapshot of manual chart positions and line tweaks. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: unknown = body?.items;
  if (!Array.isArray(items) || !items.every(valid)) {
    return NextResponse.json({ error: "Data tata letak tidak valid" }, { status: 400 });
  }

  await db.$transaction(
    (items as Item[]).map(({ id, posX, posY, busY, trunkX, linkOff, linkSide }) =>
      db.person.updateMany({ where: { id }, data: { posX, posY, busY, trunkX, linkOff, linkSide } })
    )
  );
  return NextResponse.json({ ok: true });
}

/** Back to the automatic layout. */
export async function DELETE() {
  await db.person.updateMany({ data: { posX: null, posY: null, busY: null, trunkX: null, linkOff: null, linkSide: null } });
  return NextResponse.json({ ok: true });
}
