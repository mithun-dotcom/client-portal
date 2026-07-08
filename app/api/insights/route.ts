import { NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const CF = "https://api.cloudflare.com/client/v4";

type CfRecord = { type: string; name: string; content: string };

async function getZoneRecords(zoneId: string): Promise<CfRecord[]> {
  const res = await fetch(CF + "/zones/" + zoneId + "/dns_records?per_page=100", {
    headers: { Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN },
  });
  const data = await res.json();
  return data.success ? data.result : [];
}

function scoreDomain(records: CfRecord[], active: boolean) {
  const hasSPF = records.some((r) => r.type === "TXT" && r.content.includes("v=spf1"));
  const hasDKIM = records.some(
    (r) =>
      (r.type === "TXT" && r.content.includes("v=DKIM1")) ||
      r.name.includes("domainkey")
  );
  const hasDMARC = records.some(
    (r) =>
      r.type === "TXT" &&
      r.name.startsWith("_dmarc") &&
      r.content.toUpperCase().includes("V=DMARC1")
  );
  const hasMX = records.some((r) => r.type === "MX");

  // simple transparent scoring out of 100
  let score = 0;
  if (active) score += 20;
  if (hasSPF) score += 20;
  if (hasDKIM) score += 25;
  if (hasDMARC) score += 25;
  if (hasMX) score += 10;

  let grade: "excellent" | "good" | "poor" | "critical";
  if (score >= 90) grade = "excellent";
  else if (score >= 65) grade = "good";
  else if (score >= 40) grade = "poor";
  else grade = "critical";

  return { score, grade, hasSPF, hasDKIM, hasDMARC, hasMX };
}

function scoreMailbox(stats: { sent: number; replies: number; bounces: number }[]) {
  const sent = stats.reduce((a, s) => a + s.sent, 0);
  const replies = stats.reduce((a, s) => a + s.replies, 0);
  const bounces = stats.reduce((a, s) => a + s.bounces, 0);

  if (sent === 0) {
    return { status: "no_data" as const, sent, replyRate: 0, bounceRate: 0 };
  }

  const replyRate = (replies / sent) * 100;
  const bounceRate = (bounces / sent) * 100;

  let status: "healthy" | "warning" | "at_risk";
  if (bounceRate > 5) status = "at_risk"; // high bounces poison reputation
  else if (bounceRate > 2 || sent > 50 * stats.length) status = "warning"; // bounce creep or too-high daily volume
  else status = "healthy";

  return { status, sent, replyRate, bounceRate };
}

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const mailboxes = await prisma.mailbox.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const stats = await prisma.emailStat.findMany({
    where: { userId, date: { gte: since } },
  });

  // domain reputation (live from Cloudflare)
  const domainReports = [];
  for (const d of domains) {
    if (!d.zoneId) continue;
    const records = await getZoneRecords(d.zoneId);
    const rep = scoreDomain(records, d.status === "active");
    domainReports.push({ id: d.id, name: d.name, status: d.status, ...rep });
  }

  // mailbox health (from 7-day sending pattern)
  const mailboxReports = mailboxes.map((m) => {
    const mStats = stats.filter((s) => s.mailboxId === m.id);
    const health = scoreMailbox(mStats);
    return {
      id: m.id,
      email: m.email,
      firstName: m.firstName,
      lastName: m.lastName,
      ...health,
    };
  });

  return NextResponse.json({ domains: domainReports, mailboxes: mailboxReports });
}
