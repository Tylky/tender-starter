export const runtime = "edge";
export const preferredRegion = ["fra1","cdg1","dub1","arn1"];

function simplify(json: any) {
  const arr = json?._embedded?.publicaties ?? json?.publicaties ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((p: any) => ({
    publicatieId: p.publicatieId ?? p.id ?? null,
    titel: p.titel ?? p.title ?? null,
    publicatiedatum: p.publicatieDatum ?? p.datum ?? null,
    link: p?._links?.self?.href ?? null,
  }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "25";

  // probeer v2, val terug op v1, daarna /info/api
  const bases = [
    `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?page=${page}&size=${size}`,
    `https://www.tenderned.nl/papi/tenderned-rs-tns/publicaties?page=${page}&size=${size}`,
    `https://www.tenderned.nl/info/api/publicaties?page=${page}&size=${size}`,
  ];

  for (const url of bases) {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TenderStarter/1.0 (+vercel)"
      },
      cache: "no-store",
    });

    if (!res.ok) continue;

    try {
      const data = await res.json();
      const items = simplify(data);
      if (items.length > 0) {
        return new Response(JSON.stringify({ from: url, count: items.length, items }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // ignore parse error and try next
    }
  }

  // geen items gevonden — geef een korte hint + link naar debug
  return new Response(JSON.stringify({
    count: 0,
    items: [],
    hint: "Geen items gevonden op v2/v1/info. Check /api/tns/debug voor ruwe responses.",
    debug: "/api/tns/debug?page=0&size=25"
  }), { headers: { "Content-Type": "application/json" }});
}
