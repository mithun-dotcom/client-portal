import { NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const CF_API = "https://api.cloudflare.com/client/v4";

async function createCloudflareZone(name: string) {
  const res = await fetch(CF_API + "/zones", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      account: { id: process.env.CLOUDFLARE_ACCOUNT_ID },
      type: "full",
    }),
  });

  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.[0]?.message || "Cloudflare error";
    throw new Error(msg);
  }

  return {
    zoneId: data.result.id as string,
    nameservers: (data.result.name_servers || []) as string[],
    status: data.result.status as string,
  };
}

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(domains);
}

export async function POST(request: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const raw: string = body.names || "";

  const names = raw
    .split(/[\n,\s]+/)
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  const domainPattern = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
  const results: { name: string; ok: boolean; error?: string }[] = [];

  for (const name of names) {
    if (!domainPattern.test(name)) {
      results.push({ name, ok: false, error: "Invalid domain format" });
      continue;
    }

    try {
      const zone = await createCloudflareZone(name);
      await prisma.domain.create({
        data: {
          name,
          userId,
          status: zone.status === "active" ? "active" : "pending",
          nameservers: zone.nameservers,
          zoneId: zone.zoneId,
        },
      });
      results.push({ name, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      results.push({ name, ok: false, error: msg });
    }
  }

  return NextResponse.json({ results }, { status: 201 });
}
