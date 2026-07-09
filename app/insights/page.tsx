"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

type MailboxReport = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "healthy" | "warning" | "at_risk" | "no_data";
  sent: number;
  replyRate: number;
  bounceRate: number;
};

type BlacklistReport = {
  id: string;
  name: string;
  checkedIp: string | null;
  listedOn: string[];
  totalLists: number;
  errorCount: number;
  checkedAt: string | null;
  verdict: "clean" | "listed" | "unchecked";
};

const healthStyles: Record<string, string> = {
  healthy: "bg-emerald-50 text-emerald-700",
  warning: "bg-yellow-50 text-yellow-700",
  at_risk: "bg-red-50 text-red-600",
  no_data: "bg-gray-100 text-gray-500",
};

const healthLabels: Record<string, string> = {
  healthy: "✓ Healthy",
  warning: "⚠ Warning",
  at_risk: "✗ At Risk",
  no_data: "No data yet",
};

export default function InsightsPage() {
  const [mailboxes, setMailboxes] = useState<MailboxReport[]>([]);
  const [mbLoading, setMbLoading] = useState(true);
  const [blacklists, setBlacklists] = useState<BlacklistReport[]>([]);
  const [checkingId, setCheckingId] = useState("");
  const [checkingAll, setCheckingAll] = useState(false);

  useEffect(() => {
    fetch("/api/insights").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setMailboxes(data.mailboxes);
      }
      setMbLoading(false);
    });

    loadBlacklists();
  }, []);

  async function loadBlacklists() {
    const res = await fetch("/api/insights/blacklist");
    if (res.ok) setBlacklists(await res.json());
  }

  async function checkDomain(domainId: string) {
    setCheckingId(domainId);
    const res = await fetch("/api/insights/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBlacklists((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
    }
    setCheckingId("");
  }

  async function checkAll() {
    setCheckingAll(true);
    for (const b of blacklists) {
      await checkDomain(b.id);
    }
    setCheckingAll(false);
  }

  return (
    <>
      <Show when="signed-out">
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <SignInButton mode="modal">
            <button className="rounded-xl bg-emerald-900 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
              Sign in with Google
            </button>
          </SignInButton>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="flex h-screen bg-gray-50">
          <Sidebar />

          <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
              <h1 className="text-lg font-semibold text-gray-900">Email Insights</h1>
              <UserButton />
            </div>

            <div className="px-8 py-6">
              <h2 className="text-2xl font-bold text-gray-900">Email Insights</h2>
              <p className="text-sm text-gray-500">
                Domain blacklist status and mailbox health (last 7 days)
              </p>

              {/* ===== Blacklist Status ===== */}
              <div className="flex items-center justify-between pb-3 pt-8">
                <p className="text-xs font-semibold tracking-wider text-gray-400">
                  DOMAIN BLACKLIST STATUS
                </p>
                {blacklists.length > 0 && (
                  <button
                    onClick={checkAll}
                    disabled={checkingAll || checkingId !== ""}
                    className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {checkingAll ? "Checking all..." : "Check all domains"}
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {blacklists.length === 0 && (
                  <p className="px-6 py-10 text-center text-sm text-gray-400">
                    No domains to check
                  </p>
                )}
                {blacklists.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between border-b border-gray-50 px-6 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{b.name}</p>
                      {b.checkedAt && (
                        <p className="text-xs text-gray-400">
                          {b.totalLists} lists checked · IP {b.checkedIp}
                          {b.errorCount > 0 && " · " + b.errorCount + " unreachable"}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {b.verdict === "clean" && (
                        <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
                          ✓ Good health
                        </span>
                      )}
                      {b.verdict === "listed" && (
                        <span className="max-w-md truncate rounded-full bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600">
                          ✗ Blacklisted in {b.listedOn.join(", ")}
                        </span>
                      )}
                      {b.verdict === "unchecked" && (
                        <span className="rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-500">
                          Not checked yet
                        </span>
                      )}
                      <button
                        onClick={() => checkDomain(b.id)}
                        disabled={checkingId === b.id || checkingAll}
                        className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {checkingId === b.id ? "Checking..." : "Check now"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ===== Mailbox Health ===== */}
              <p className="pb-3 pt-8 text-xs font-semibold tracking-wider text-gray-400">
                MAILBOX HEALTH — SENDING PATTERN (7 DAYS)
              </p>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Mailbox</th>
                      <th className="px-6 py-4 font-medium">Health</th>
                      <th className="px-6 py-4 font-medium">Sent (7d)</th>
                      <th className="px-6 py-4 font-medium">Reply Rate</th>
                      <th className="px-6 py-4 font-medium">Bounce Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mbLoading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                          Loading...
                        </td>
                      </tr>
                    )}
                    {!mbLoading && mailboxes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                          No mailboxes yet
                        </td>
                      </tr>
                    )}
                    {!mbLoading &&
                      mailboxes.map((m) => (
                        <tr key={m.id} className="border-b border-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">
                              {m.firstName} {m.lastName}
                            </p>
                            <p className="text-gray-500">{m.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={
                                "rounded-full px-3 py-1 text-xs font-medium " +
                                healthStyles[m.status]
                              }
                            >
                              {healthLabels[m.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{m.sent}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {m.status === "no_data"
                              ? "—"
                              : m.replyRate.toFixed(1) + "%"}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {m.status === "no_data"
                              ? "—"
                              : m.bounceRate.toFixed(1) + "%"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Blacklist checks query 40+ domain and IP blacklists live (Spamhaus,
                Barracuda, SORBS, SURBL and more). Results are cached until you
                re-check. Sending stats populate automatically once warmup and
                sequencer integrations are connected.
              </p>
            </div>
          </main>
        </div>
      </Show>
    </>
  );
}