import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const CF = "https://api.cloudflare.com/client/v4";

function cfHeaders() {
  return {
    Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
    "Content-Type": "application/json",
  };
}

async function getOwnedDomain(id: string, userId: string) {
  return prisma.domain.findFirst({ where: { id, userId } });
}

// GET — live DNS records from Cloudflare
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const domain = await getOwnedDomain(id, userId);
  if (!domain || !domain.zoneId)
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const res = await fetch(CF + "/zones/" + domain.zoneId + "/dns_records?per_page=100", {
    headers: cfHeaders(),
  });
  const data = await res.json();
  if (!data.success)
    return NextResponse.json({ error: "Cloudflare error" }, { status: 502 });

  return NextResponse.json(data.result);
}

// POST — create a DNS record on Cloudflare
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const domain = await getOwnedDomain(id, userId);
  if (!domain || !domain.zoneId)
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const body = await request.json();

  const res = await fetch(CF + "/zones/" + domain.zoneId + "/dns_records", {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({
      type: body.type,
      name: body.name,
      content: body.content,
      ttl: Number(body.ttl) || 3600,
      priority: body.priority !== undefined ? Number(body.priority) : undefined,
      proxied: false,
    }),
  });
  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.[0]?.message || "Cloudflare error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json(data.result, { status: 201 });
}