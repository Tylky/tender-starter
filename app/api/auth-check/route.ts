import { NextResponse } from "next/server";

export async function GET() {
  const u = process.env.TENDER_USER || "";
  const p = process.env.TENDER_PASS || "";
  return NextResponse.json({
    ok: Boolean(u && p),
    user_preview: u ? u.slice(0, 2) + "***" : null
  });
}
