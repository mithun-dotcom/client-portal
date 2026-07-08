import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";

export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    totalClients,
    totalDomains,
    activeDomains,
    totalMailboxes,
    activeMailboxes,
  ] = await Promise.all([
    prisma.userRole.count(),
    prisma.domain.count(),
    prisma.domain.count({ where: { status: "active" } }),
    prisma.mailbox.count(),
    prisma.mailbox.count({ where: { status: "active" } }),
  ]);

  return NextResponse.json({
    totalClients,
    totalDomains,
    activeDomains,
    totalMailboxes,
    activeMailboxes,
  });
}
