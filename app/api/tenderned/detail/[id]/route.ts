import { NextResponse } from "next/server";

async function tryJson(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // laat Vercel niet cachen zodat we echte response zien
    cache: "no-store",
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text(); // als het geen JSON is, toon raw text
  }
  return { ok: res.ok, status: res.status, url, body };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "25";

  // We proberen meerdere bekende (publieke) paden:
  const urls = [
    // v2 feed (soms actief)
    `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?page=${page}&size=${size}`,
    // v1 feed (meest voorkomend)
    `https://www.tenderned.nl/papi/tenderned-rs-tns/publicaties?page=${page}&size=${size}`,
    // soms zit listing onder /info/api (afhankelijk van publicatie/omgeving)
    `https://www.tenderned.nl/info/api/publicaties?page=${page}&size=${size}`,
  ];

  const results = [];
  for (const url of urls) {
    try {
      const r = await tryJson(url);
      // haal alvast aantal items uit bekende plekken (als het JSON is)
      let inferredCount: number | null = null;
      if (typeof r.body === "object" && r.body) {
        // Meest gebruikelijke structuur
        const items = r.body?._embedded?.publicaties ?? r.body?.publicaties ?? [];
        if (Array.isArray(items)) inferredCount = items.length;
      }
      results.push({
        url: r.url,
        status: r.status,
        ok: r.ok,
        inferredCount,
        sample:
          typeof r.body === "object"
            ? (Array.isArray(r.body?._embedded?.publicaties)
                ? r.body._embedded.publicaties.slice(0, 2)
                : r.body)
            : String(r.body).slice(0, 200),
      });
      if (r.ok) break; // als we een OK hebben, stoppen we met proberen
    } catch (e: any) {
      results.push({ url, status: "fetch_error", ok: false, error: e?.message });
    }
  }

  // Probeer items te normaliseren als we een OK + embedded publicaties hebben
  const okResult = results.find((r: any) => r.ok);
  if (okResult && typeof okResult.sample === "object" && okResult.sample) {
    // sample kan het hele body zijn; pak body opnieuw uit results door opnieuw te fetchen (met cache: no-store ok)
    const chosen = urls[results.findIndex((r: any) => r.ok)];
    const chosenRes = await fetch(chosen, { headers: { Accept: "application/json" }, cache: "no-store" });
    const data = await chosenRes.json();
    const items =
      data?._embedded?.publicaties ??
      data?.publicaties ??
      [];
    const simplified = Array.isArray(items)
      ? items.map((p: any) => ({
          publicatieId: p.publicatieId ?? p.id ?? null,
          titel: p.titel ?? p.title ?? null,
          publicatieDatum: p.publicatieDatum ?? p.datum ?? null,
          link: p?._links?.self?.href ?? null,
        }))
      : [];
    return NextResponse.json({
      tried: results,
      count: simplified.length,
      items: simplified,
    });
  }

  // Geen OK-resultaten: return diagnose
  return NextResponse.json(
    {
      error: "No OK response from TNS listing endpoints",
      tried: results,
      hint:
        "Als alles 404/204/empty is: TenderNed kan tijdelijk leeg zijn of dit project heeft IP-regio issues. Probeer later opnieuw of check handmatig /aankondigingen.",
    },
    { status: 502 }
  );
}
