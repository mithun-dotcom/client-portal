import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/roles";

export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const archived = await prisma.archivedClient.findMany({
    orderBy: { deletedAt: "desc" },
  });
  return NextResponse.json(archived);
}
