import { NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const CF = "https://api.cloudflare.com/client/v4";

function cfHeaders() {
  return {
    Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
    "Content-Type": "application/json",
  };
}

async function ensureRecord(
  zoneId: string,
  type: string,
  name: string,
  content: string
) {
  await fetch(CF + "/zones/" + zoneId + "/dns_records", {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({ type, name, content, ttl: 1, proxied: true }),
  });
}

async function deletePortalPageRules(zoneId: string) {
  const res = await fetch(CF + "/zones/" + zoneId + "/pagerules", {
    headers: cfHeaders(),
  });
  const data = await res.json();
  if (!data.success) return;
  for (const rule of data.result || []) {
    const isForwarding = (rule.actions || []).some(
      (a: { id: string }) => a.id === "forwarding_url"
    );
    if (isForwarding) {
      await fetch(CF + "/zones/" + zoneId + "/pagerules/" + rule.id, {
        method: "DELETE",
        headers: cfHeaders(),
      });
    }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const domain = await prisma.domain.findFirst({ where: { id, userId } });
  if (!domain || !domain.zoneId)
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const body = await request.json();
  const url = (body.url || "").trim();

  if (!/^https?:\/\/.+/.test(url)) {
    return NextResponse.json(
      { error: "Enter a full URL starting with https://" },
      { status: 400 }
    );
  }

  await ensureRecord(domain.zoneId, "A", domain.name, "192.0.2.1");
  await ensureRecord(domain.zoneId, "CNAME", "www." + domain.name, domain.name);

  await deletePortalPageRules(domain.zoneId);

  const res = await fetch(CF + "/zones/" + domain.zoneId + "/pagerules", {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({
      targets: [
        {
          target: "url",
          constraint: { operator: "matches", value: "*" + domain.name + "/*" },
        },
      ],
      actions: [
        {
          id: "forwarding_url",
          value: { url: url, status_code: 301 },
        },
      ],
      status: "active",
    }),
  });
  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.[0]?.message || "Cloudflare page rule error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: { forwardingUrl: url },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const domain = await prisma.domain.findFirst({ where: { id, userId } });
  if (!domain || !domain.zoneId)
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  await deletePortalPageRules(domain.zoneId);

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: { forwardingUrl: null },
  });

  return NextResponse.json(updated);
}
