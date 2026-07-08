import { NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mailboxes = await prisma.mailbox.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(mailboxes);
}

export async function POST(request: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const items: {
    firstName: string;
    lastName: string;
    username: string;
    domainId: string;
    platform: string;
  }[] = body.items || [];

  if (items.length === 0) {
    return NextResponse.json({ error: "No mailboxes in cart" }, { status: 400 });
  }

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const item of items) {
    const firstName = (item.firstName || "").trim();
    const lastName = (item.lastName || "").trim();
    const username = (item.username || "").trim().toLowerCase();

    if (!firstName || !lastName || !username || !item.domainId) {
      results.push({ email: username, ok: false, error: "Missing fields" });
      continue;
    }

    const domain = await prisma.domain.findFirst({
      where: { id: item.domainId, userId },
    });
    if (!domain) {
      results.push({ email: username, ok: false, error: "Domain not found" });
      continue;
    }
    if (domain.status !== "active") {
      results.push({
        email: username + "@" + domain.name,
        ok: false,
        error: "Domain is not active yet",
      });
      continue;
    }

    const email = username + "@" + domain.name;

    try {
      await prisma.mailbox.create({
        data: {
          firstName,
          lastName,
          username,
          domainId: domain.id,
          email,
          platform: item.platform || "google",
          userId,
        },
      });
      results.push({ email, ok: true });
    } catch {
      results.push({ email, ok: false, error: "Mailbox already exists" });
    }
  }

  return NextResponse.json({ results }, { status: 201 });
}
