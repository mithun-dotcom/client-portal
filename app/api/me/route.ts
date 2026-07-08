import { NextResponse } from "next/server";
import { getRole } from "@/lib/roles";

export async function GET() {
  const { userId, role } = await getRole();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ role });
}
