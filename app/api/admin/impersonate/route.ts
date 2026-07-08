import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireStaff, getImpersonation } from "@/lib/roles";

// GET — who am I impersonating (if anyone)?
export async function GET() {
  const info = await getImpersonation();
  return NextResponse.json(info);
}

// POST { userId } — start impersonating a client
export async function POST(request: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const cookieStore = await cookies();
  cookieStore.set("impersonate_user_id", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // auto-expires after 4 hours
  });

  return NextResponse.json({ ok: true });
}

// DELETE — stop impersonating
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_user_id");
  return NextResponse.json({ ok: true });
}
