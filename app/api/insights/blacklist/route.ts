import { NextResponse } from "next/server";
import { promises as dns } from "dns";
import { getEffectiveUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Domain-based blacklists (DNSBL for domains)
const DOMAIN_BLACKLISTS = [
  { name: "Spamhaus DBL", zone: "dbl.spamhaus.org" },
  { name: "SURBL", zone: "multi.surbl.org" },
  { name: "URIBL", zone: "multi.uribl.com" },
  { name: "Spam Eating Monkey", zone: "fresh.spameatingmonkey.net" },
];

type ListResult = {
  list: string;
  status: "clean" | "listed" | "error";
};

async function checkDomainOnList(
  domain: string,
  zone: string
): Promise<"clean" | "listed" | "error"> {
  const query = domain + "." + zone;
  try {
    const result = await dns.resolve4(query);
    // Any answer = listed. Some lists use 127.255.255.x codes for
    // "blocked query / not allowed" — treat those as error, not listed.
    if (result.some((ip) => ip.startsWith("127.255.255."))) return "error";
    return result.length > 0 ? "listed" : "clean";
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
      return "clean"; // no record = not on the list
    }
    return "error"; // timeout / refused / blocked
  }
}

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const reports = [];

  for (const d of domains) {
    const results: ListResult[] = await Promise.all(
      DOMAIN_BLACKLISTS.map(async (bl) => ({
        list: bl.name,
        status: await checkDomainOnList(d.name, bl.zone),
      }))
    );

    const listedCount = results.filter((r) => r.status === "listed").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    let verdict: "clean" | "listed" | "partial";
    if (listedCount > 0) verdict = "listed";
    else if (errorCount === results.length) verdict = "partial"; // nothing checkable
    else verdict = "clean";

    reports.push({
      id: d.id,
      name: d.name,
      verdict,
      listedCount,
      checkedCount: results.length - errorCount,
      results,
    });
  }

  return NextResponse.json(reports);
}
