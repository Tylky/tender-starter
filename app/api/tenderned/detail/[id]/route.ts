import { NextResponse } from "next/server";

async function tryFetch(url: string, auth: string) {
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/xml" },
    cache: "no-store",
  });
  const text = await res.text(); // lees body altijd voor debug
  return { ok: res.ok, status: res.status, url, body: text };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { TENDER_USER, TENDER_PASS } = process.env as Record<string, string>;
  if (!TENDER_USER || !TENDER_PASS) {
    return NextResponse.json(
      { error: "Missing TenderNed credentials" },
      { status: 500 }
    );
  }

  const auth = "Basic " + Buffer.from(`${TENDER_USER}:${TENDER_PASS}`).toString("base64");
  const id = encodeURIComponent(params.id);

  // 1) Base vanuit Swagger (/info/api/...)
  const urlInfoApi = `https://www.tenderned.nl/info/api/publicaties/${id}/public-xml`;

  // 2) Alternatieve base (/papi/tenderned-rs-xml/...)
  const urlPapi = `https://www.tenderned.nl/papi/tenderned-rs-xml/publicaties/${id}/public-xml`;

  // Probeer in volgorde en rapporteer precies wat er gebeurde
  const a = await tryFetch(urlInfoApi, auth);
  if (a.ok) {
    return new NextResponse(a.body, { headers: { "Content-Type": "application/xml" } });
  }

  const b = await tryFetch(urlPapi, auth);
  if (b.ok) {
    return new NextResponse(b.body, { headers: { "Content-Type": "application/xml" } });
  }

  // Niets gelukt: geef diagnose terug
  return NextResponse.json(
    {
      error: "No XML found for this publicatieId",
      attempts: [
        { url: a.url, status: a.status },
        { url: b.url, status: b.status },
      ],
      hint:
        a.status === 401 || b.status === 401
          ? "401 = credentials/verificatie klopt niet."
          : "404 = dit ID heeft geen public-xml of bestaat niet. Probeer een ander publicatieId (liefst recente EU-aanbesteding).",
    },
    { status: 404 }
  );
}
