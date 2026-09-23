import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings ?? { companyName: null, logoUrl: null });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { companyName, logoUrl } = body;

  const saved = await saveSettings({
    companyName: companyName || null,
    logoUrl: logoUrl || null,
  });

  return NextResponse.json(saved);
}
