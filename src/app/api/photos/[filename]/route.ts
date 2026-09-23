import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!/^[\w-]+\.(jpg|png)$/.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = filename.split(".").pop()!;
  const filePath = path.join(process.cwd(), "uploads", filename);

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
