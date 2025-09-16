export const runtime = "edge";
// Run near EU for public gov endpoints
export const preferredRegion = ["fra1","cdg1","dub1","arn1"];

async function tryFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      // sommige endpoints weigeren requests zonder UA
      "User-Agent": "TenderStarter/1.0 (+vercel)"
    },
    cache: "no-store",
  });
  let text = await res.text();
  // truncate for safety
  const preview = text.slice(0, 800);
  // probeer JSON te parsen voor extra hint
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  // tel items als we de bekende structuur zien
  let inferredCount: number | null = null;
  const items = json?._embedded?.publicaties ?? json?.publicaties ?? null;
  if (Array.isArray(items)) inferredCount = items.length;

  return { url, status: res.status, ok: res.ok, inferredCount, previewType: json ? "json" : "text", preview };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "25";

  const urls = [
    `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?page=${page}&size=${size}`,
    `https://www.tenderned.nl/papi/tenderned-rs-tns/publicaties?page=${page}&size=${size}`,
    `https://www.tenderned.nl/info/api/publicaties?page=${page}&size=${size}`,
  ];

  const results = [];
  for (const u of urls) results.push(await tryFetch(u));

  return new Response(JSON.stringify({ tried: results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
