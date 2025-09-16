import { NextResponse } from "next/server";

/**
 * VEILIGE PROXY NAAR TENDERNED SWAGGER-ENDPOINTS
 * Gebruik:
 *   /api/tenderned/proxy?path=/papi/tenderned-rs-xml/publicaties/365844/public-xml
 * of:
 *   /api/tenderned/proxy?path=/info/api/publicaties?page=0&size=25
 *
 * - Alleen paden die met onderstaande whitelisted prefixes beginnen worden doorgelaten.
 * - Stuurt Basic Auth headers mee op basis van Vercel env vars.
 */

const ALLOWED_PREFIXES = [
  "/papi/tenderned-rs-xml/",
  "/papi/tenderned-rs-tns/",
  "/info/api/"
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  const { TENDER_USER, TENDER_PASS } = process.env as Record<string, string>;

  if (!ALLOWED_PREFIXES.some(p => path.startsWith(p))) {
    return NextResponse.json(
      { error: "Path not allowed", path, allowed: ALLOWED_PREFIXES },
      { status: 400 }
    );
  }

  if (!TENDER_USER || !TENDER_PASS) {
    return NextResponse.json({ error: "Missing TenderNed credentials" }, { status: 500 });
  }

  const auth = "Basic " + Buffer.from(`${TENDER_USER}:${TENDER_PASS}`).toString("base64");
  const url = `https://www.tenderned.nl${path}`;

  const res = await fetch(url, {
    headers: {
      Authorization: auth,
      Accept: "*/*",
      "User-Agent": "TenderStarter/1.0 (+vercel)"
    },
    cache: "no-store"
  });

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const body = await res.text();

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upstream error", status: res.status, url, preview: body.slice(0, 800) },
      { status: res.status }
    );
  }

  return new NextResponse(body, { headers: { "Content-Type": contentType } });
}
