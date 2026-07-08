import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getRole(): Promise<{
  userId: string | null;
  role: "client" | "team" | "admin";
}> {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: "client" };

  let record = await prisma.userRole.findUnique({ where: { userId } });

  if (!record) {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";
    record = await prisma.userRole.create({
      data: { userId, email, role: "client" },
    });
  }

  const cleanRole = (record.role || "client").trim() as "client" | "team" | "admin";
  return { userId, role: cleanRole };
}

export async function getEffectiveUserId(): Promise<string | null> {
  const { userId, role } = await getRole();
  if (!userId) return null;

  if (role === "admin" || role === "team") {
    const cookieStore = await cookies();
    const impersonated = cookieStore.get("impersonate_user_id")?.value;
    if (impersonated) return impersonated;
  }

  return userId;
}

export async function getImpersonation(): Promise<{
  active: boolean;
  targetUserId?: string;
  targetEmail?: string;
}> {
  const { userId, role } = await getRole();
  if (!userId || (role !== "admin" && role !== "team")) return { active: false };

  const cookieStore = await cookies();
  const target = cookieStore.get("impersonate_user_id")?.value;
  if (!target) return { active: false };

  const record = await prisma.userRole.findUnique({ where: { userId: target } });
  return {
    active: true,
    targetUserId: target,
    targetEmail: record?.email || "unknown",
  };
}

export async function requireStaff() {
  const { userId, role } = await getRole();
  if (!userId || (role !== "admin" && role !== "team")) return null;
  return { userId, role };
}

export async function requireAdmin() {
  const { userId, role } = await getRole();
  if (!userId || role !== "admin") return null;
  return { userId, role };
}
