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

// PUT — update a record
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recordId } = await params;
  const domain = await prisma.domain.findFirst({ where: { id, userId } });
  if (!domain || !domain.zoneId)
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const body = await request.json();

  const res = await fetch(
    CF + "/zones/" + domain.zoneId + "/dns_records/" + recordId,
    {
      method: "PUT",
      headers: cfHeaders(),
      body: JSON.stringify({
        type: body.type,
        name: body.name,
        content: body.content,
        ttl: Number(body.ttl) || 3600,
        priority: body.priority !== undefined ? Number(body.priority) : undefined,
        proxied: false,
      }),
    }
  );
  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.[0]?.message || "Cloudflare error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json(data.result);
}

// DELETE — remove a record
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, recordId } = await params;
  const domain = await prisma.domain.findFirst({ where: { id, userId } });
  if (!domain || !domain.zoneId)
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const res = await fetch(
    CF + "/zones/" + domain.zoneId + "/dns_records/" + recordId,
    { method: "DELETE", headers: cfHeaders() }
  );
  const data = await res.json();
  if (!data.success)
    return NextResponse.json({ error: "Cloudflare error" }, { status: 400 });

  return NextResponse.json({ ok: true });
}