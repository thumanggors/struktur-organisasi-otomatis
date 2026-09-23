import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wouldCreateCycle } from "@/lib/cycle";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { nama, jabatan, divisi, jobdesk, fotoUrl, atasanId } = body;

  if (!nama || !jabatan) {
    return NextResponse.json({ error: "Nama dan Jabatan wajib diisi" }, { status: 400 });
  }

  if (atasanId !== undefined && atasanId !== null) {
    const all = await db.person.findMany({ select: { id: true, atasanId: true } });
    if (wouldCreateCycle(id, atasanId, all)) {
      return NextResponse.json({ error: "Pilihan atasan ini akan membuat siklus" }, { status: 400 });
    }
  }

  const updated = await db.person.update({
    where: { id },
    data: { nama, jabatan, divisi: divisi ?? null, jobdesk: jobdesk ?? null, fotoUrl: fotoUrl ?? null, atasanId: atasanId ?? null },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.person.updateMany({
    where: { atasanId: id },
    data: { atasanId: null },
  });

  await db.person.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
