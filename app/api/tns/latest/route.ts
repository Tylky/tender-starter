import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "0";
  const size = searchParams.get("size") ?? "10";
  const url = `https://www.tenderned.nl/papi/tenderned-rs-tns/publicaties?page=${page}&size=${size}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    return NextResponse.json({ error: "TNS upstream error" }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json({
    count: data?.page?.totalElements ?? 0,
    items:
      data?._embedded?.publicaties?.map((p: any) => ({
        publicatieId: p.publicatieId,
        titel: p.titel,
        publicatiedatum: p.publicatieDatum,
        link: p._links?.self?.href
      })) ?? []
  });
}
