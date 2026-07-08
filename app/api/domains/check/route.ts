import { NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  const domain = await prisma.domain.findFirst({
    where: { id, userId },
  });
  if (!domain || !domain.zoneId) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const res = await fetch(
    "https://api.cloudflare.com/client/v4/zones/" + domain.zoneId,
    {
      headers: {
        Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
      },
    }
  );
  const data = await res.json();

  if (!data.success) {
    return NextResponse.json({ error: "Cloudflare check failed" }, { status: 502 });
  }

  const status = data.result.status === "active" ? "active" : "pending";

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: { status },
  });

  return NextResponse.json(updated);
}
