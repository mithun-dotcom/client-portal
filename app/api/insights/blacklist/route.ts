import { NextResponse } from "next/server";
import { promises as dns } from "dns";
import { getEffectiveUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// IP-based DNSBLs — checked against the domain's resolved sending IP.
// (reverse the IP, prepend to the zone, resolve; an answer = listed)
const IP_BLACKLISTS = [
  { name: "Spamhaus ZEN", zone: "zen.spamhaus.org" },
  { name: "Barracuda", zone: "b.barracudacentral.org" },
  { name: "SPAMCOP", zone: "bl.spamcop.net" },
  { name: "SORBS", zone: "dnsbl.sorbs.net" },
  { name: "UCEPROTECTL1", zone: "dnsbl-1.uceprotect.net" },
  { name: "UCEPROTECTL2", zone: "dnsbl-2.uceprotect.net" },
  { name: "PSBL", zone: "psbl.surriel.com" },
  { name: "BACKSCATTERER", zone: "ips.backscatterer.org" },
  { name: "BLOCKLIST.DE", zone: "bl.blocklist.de" },
  { name: "DRONE BL", zone: "dnsbl.dronebl.org" },
  { name: "Hostkarma Black", zone: "hostkarma.junkemailfilter.com" },
  { name: "MAILSPIKE BL", zone: "bl.mailspike.net" },
  { name: "MAILSPIKE Z", zone: "z.mailspike.net" },
  { name: "s5h.net", zone: "all.s5h.net" },
  { name: "SEM BLACK", zone: "backscatter.spameatingmonkey.net" },
  { name: "0SPAM", zone: "bl.0spam.org" },
  { name: "Anonmails DNSBL", zone: "spam.dnsbl.anonmails.de" },
  { name: "INTERSERVER", zone: "rbl.interserver.net" },
  { name: "ivmSIP", zone: "sip.invaluement.com" },
  { name: "LASHBACK", zone: "ubl.unsubscore.com" },
  { name: "NoSolicitado", zone: "bl.nosolicitado.org" },
  { name: "Suomispam", zone: "bl.suomispam.net" },
  { name: "SWINOG", zone: "dnsrbl.swinog.ch" },
  { name: "TRUNCATE", zone: "truncate.gbudb.net" },
  { name: "Woodys SMTP", zone: "blacklist.woody.ch" },
  { name: "Konstant", zone: "spamrbl.imp.ch" },
  { name: "SERVICESNET", zone: "spam.pedantic.org" },
  { name: "DAN TOR", zone: "tor.dan.me.uk" },
  { name: "RATS Spam", zone: "spam.spamrats.com" },
  { name: "RATS Dyna", zone: "dyna.spamrats.com" },
  { name: "RATS NoPtr", zone: "noptr.spamrats.com" },
  { name: "MSRBL Spam", zone: "spam.dnsbl.sorbs.net" },
];

// Domain-name blacklists — checked against the domain name itself.
const DOMAIN_BLACKLISTS = [
  { name: "Spamhaus DBL", zone: "dbl.spamhaus.org" },
  { name: "SURBL multi", zone: "multi.surbl.org" },
  { name: "URIBL", zone: "multi.uribl.com" },
  { name: "SEM Fresh", zone: "fresh.spameatingmonkey.net" },
  { name: "SEM URI", zone: "uribl.spameatingmonkey.net" },
  { name: "SORBS RHSBL", zone: "rhsbl.sorbs.net" },
  { name: "Nordspam DBL", zone: "dbl.nordspam.com" },
  { name: "ivmURI", zone: "uri.invaluement.com" },
  { name: "IBM DNS", zone: "dnsbl.cobion.com" },
];

async function resolveIp(domain: string): Promise<string | null> {
  try {
    const ips = await dns.resolve4(domain);
    return ips[0] || null;
  } catch {
    return null;
  }
}

async function query(host: string): Promise<"clean" | "listed" | "error"> {
  try {
    const res = await dns.resolve4(host);
    if (res.some((ip) => ip.startsWith("127.255.255."))) return "error";
    return res.length > 0 ? "listed" : "clean";
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOTFOUND" || err.code === "ENODATA") return "clean";
    return "error";
  }
}

async function runFullCheck(domainName: string) {
  const ip = await resolveIp(domainName);
  const listedOn: string[] = [];
  let errorCount = 0;
  let total = 0;

  // domain-name lists
  await Promise.all(
    DOMAIN_BLACKLISTS.map(async (bl) => {
      total++;
      const r = await query(domainName + "." + bl.zone);
      if (r === "listed") listedOn.push(bl.name);
      else if (r === "error") errorCount++;
    })
  );

  // IP lists (only if we resolved an IP)
  if (ip) {
    const reversed = ip.split(".").reverse().join(".");
    await Promise.all(
      IP_BLACKLISTS.map(async (bl) => {
        total++;
        const r = await query(reversed + "." + bl.zone);
        if (r === "listed") listedOn.push(bl.name);
        else if (r === "error") errorCount++;
      })
    );
  }

  return { ip: ip || "unresolved", listedOn, total, errorCount };
}

// GET — return cached results
export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const checks = await prisma.blacklistCheck.findMany({ where: { userId } });

  const reports = domains.map((d) => {
    const cached = checks.find((c) => c.domainId === d.id);
    return {
      id: d.id,
      name: d.name,
      checkedIp: cached?.checkedIp || null,
      listedOn: cached?.listedOn || [],
      totalLists: cached?.totalLists || 0,
      errorCount: cached?.errorCount || 0,
      checkedAt: cached?.checkedAt || null,
      verdict: cached
        ? cached.listedOn.length > 0
          ? "listed"
          : "clean"
        : "unchecked",
    };
  });

  return NextResponse.json(reports);
}

// POST { domainId } — run a fresh check for one domain and cache it
export async function POST(request: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domainId } = await request.json();
  const domain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
  });
  if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  const result = await runFullCheck(domain.name);

  const saved = await prisma.blacklistCheck.upsert({
    where: { domainId: domain.id },
    create: {
      domainId: domain.id,
      userId,
      checkedIp: result.ip,
      listedOn: result.listedOn,
      totalLists: result.total,
      errorCount: result.errorCount,
    },
    update: {
      checkedIp: result.ip,
      listedOn: result.listedOn,
      totalLists: result.total,
      errorCount: result.errorCount,
      checkedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: domain.id,
    name: domain.name,
    checkedIp: saved.checkedIp,
    listedOn: saved.listedOn,
    totalLists: saved.totalLists,
    errorCount: saved.errorCount,
    checkedAt: saved.checkedAt,
    verdict: saved.listedOn.length > 0 ? "listed" : "clean",
  });
}
