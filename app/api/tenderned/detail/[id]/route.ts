import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "25";

  // v2 feed (publiek). Geeft recente publicaties met publicatieId.
  const url = `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?page=${page}&size=${size}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    return NextResponse.json({ error: "TNS upstream error", status: res.status }, { status: 502 });
  }
  const data = await res.json();

  // Normaliseer output
  const items = data?._embedded?.publicaties?.map((p: any) => ({
    publicatieId: p.publicatieId,
    titel: p.titel,
    publicatiedatum: p.publicatieDatum,
    link: p?._links?.self?.href
  })) ?? [];

  return NextResponse.json({ count: data?.page?.totalElements ?? items.length, items });
}
