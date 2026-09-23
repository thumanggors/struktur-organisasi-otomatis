import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const people = await db.person.findMany({ orderBy: { nama: "asc" } });
  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nama, jabatan, divisi, jobdesk, fotoUrl, atasanId } = body;

  if (!nama || !jabatan) {
    return NextResponse.json({ error: "Nama dan Jabatan wajib diisi" }, { status: 400 });
  }

  const created = await db.person.create({
    data: { nama, jabatan, divisi: divisi ?? null, jobdesk: jobdesk ?? null, fotoUrl: fotoUrl ?? null, atasanId: atasanId ?? null },
  });

  return NextResponse.json(created, { status: 201 });
}
