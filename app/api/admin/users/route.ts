import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/roles";

// GET — list all users with their counts (team + admin)
export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.userRole.findMany({ orderBy: { createdAt: "desc" } });
  const domains = await prisma.domain.findMany({
    select: { userId: true },
  });
  const mailboxes = await prisma.mailbox.findMany({
    select: { userId: true },
  });

  const result = users.map((u) => ({
    id: u.id,
    userId: u.userId,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    domainCount: domains.filter((d) => d.userId === u.userId).length,
    mailboxCount: mailboxes.filter((m) => m.userId === u.userId).length,
  }));

  return NextResponse.json(result);
}

// PATCH { userId, role } — change a user's role (admin only)
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = await request.json();
  if (!["client", "team", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (userId === admin.userId) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const updated = await prisma.userRole.update({
    where: { userId },
    data: { role },
  });
  return NextResponse.json(updated);
}
