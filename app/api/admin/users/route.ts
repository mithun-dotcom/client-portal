import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/roles";

// GET — all users with domain/mailbox counts (total + active)
export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.userRole.findMany({ orderBy: { createdAt: "desc" } });
  const domains = await prisma.domain.findMany({
    select: { userId: true, status: true },
  });
  const mailboxes = await prisma.mailbox.findMany({
    select: { userId: true, status: true },
  });

  const result = users.map((u) => ({
    id: u.id,
    userId: u.userId,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    domainCount: domains.filter((d) => d.userId === u.userId).length,
    activeDomains: domains.filter(
      (d) => d.userId === u.userId && d.status === "active"
    ).length,
    mailboxCount: mailboxes.filter((m) => m.userId === u.userId).length,
    activeMailboxes: mailboxes.filter(
      (m) => m.userId === u.userId && m.status === "active"
    ).length,
  }));

  return NextResponse.json(result);
}

// PATCH { userId, role } — change role (admin only)
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

// DELETE { userId, note } — archive counts, purge data, revoke login (admin only)
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, note } = await request.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (userId === admin.userId) {
    return NextResponse.json(
      { error: "You cannot delete yourself" },
      { status: 400 }
    );
  }

  const record = await prisma.userRole.findUnique({ where: { userId } });
  if (!record) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const domainCount = await prisma.domain.count({ where: { userId } });
  const mailboxCount = await prisma.mailbox.count({ where: { userId } });

  // 1) archive the history
  await prisma.archivedClient.create({
    data: {
      userId,
      email: record.email,
      domainCount,
      mailboxCount,
      note: note || null,
    },
  });

  // 2) purge their data from the portal
  await prisma.mailbox.deleteMany({ where: { userId } });
  await prisma.domain.deleteMany({ where: { userId } });
  await prisma.userRole.delete({ where: { userId } });

  // 3) delete their login so the same credentials can't sign in
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch {
    // Clerk user may already be gone — archive and purge still succeeded
  }

  return NextResponse.json({ ok: true });
}
