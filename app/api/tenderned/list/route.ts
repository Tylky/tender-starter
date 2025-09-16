import { NextResponse } from "next/server";

/**
 * Proxy voor Swagger: GET /info/api/publicaties?page=&size=
 * Let op: Dit endpoint is doorgaans openbaar (zonder auth). Sommige omgevingen vereisen alsnog auth.
 * We proberen eerst zonder auth, en vallen dan terug op Basic Auth.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "25";

  const base = `https://www.tenderned.nl/info/api/publicaties?page=${page}&size=${size}`;

  // 1) Probeer zonder auth
  let res = await fetch(base, {
    headers: { Accept: "application/json", "User-Agent": "TenderStarter/1.0 (+vercel)" },
    cache: "no-store"
  });

  // 2) Als dat niet lukt, probeer met auth (sommige omgevingen)
  if (!res.ok) {
    const { TENDER_USER, TENDER_PASS } = process.env as Record<string, string>;
    if (TENDER_USER && TENDER_PASS) {
      const auth = "Basic " + Buffer.from(`${TENDER_USER}:${TENDER_PASS}`).toString("base64");
      res = await fetch(base, {
        headers: { Accept: "application/json", Authorization: auth, "User-Agent": "TenderStarter/1.0 (+vercel)" },
        cache: "no-store"
      });
    }
  }

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: "Listing error", status: res.status, preview: text.slice(0, 800) },
      { status: res.status }
    );
  }

  // Probeer te normaliseren
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }

  const items =
    (json?._embedded?.publicaties ?? json?.publicaties ?? []).map((p: any) => ({
      publicatieId: p.publicatieId ?? p.id ?? null,
      titel: p.titel ?? p.title ?? null,
      publicatieDatum: p.publicatieDatum ?? p.datum ?? null,
      link: p?._links?.self?.href ?? null
    }));

  return NextResponse.json({ from: base, count: Array.isArray(items) ? items.length : 0, items });
}
