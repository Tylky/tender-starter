import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { TENDER_USER, TENDER_PASS } = process.env as Record<string, string>;
  if (!TENDER_USER || !TENDER_PASS) {
    return NextResponse.json({ error: "Missing TenderNed credentials" }, { status: 500 });
  }

  const auth = "Basic " + Buffer.from(`${TENDER_USER}:${TENDER_PASS}`).toString("base64");

  // LET OP: dit endpoint moet je nog vervangen met het exacte TenderNed XML pad
  const url = `https://www.tenderned.nl/papi/tenderned-rs-xml/publicaties/${params.id}`;

  const res = await fetch(url, {
    headers: {
      Authorization: auth,
      Accept: "application/xml"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "TenderNed XML API error", status: res.status },
      { status: 502 }
    );
  }

  const xml = await res.text();
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" }
  });
}
