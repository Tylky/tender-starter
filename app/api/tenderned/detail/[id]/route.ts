import { NextResponse } from "next/server";

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

  // Bouw de Basic Auth header
  const auth =
    "Basic " +
    Buffer.from(`${TENDER_USER}:${TENDER_PASS}`).toString("base64");

  // Gebruik het juiste endpoint voor Publicatie XML
  const url = `https://www.tenderned.nl/papi/tenderned-rs-xml/publicaties/${params.id}/public-xml`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: auth,
        Accept: "application/xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "TenderNed XML API error", status: res.status },
        { status: res.status }
      );
    }

    const xml = await res.text();
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Fetch failed", details: err.message },
      { status: 500 }
    );
  }
}
