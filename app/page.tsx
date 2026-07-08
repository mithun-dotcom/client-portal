"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import AddDomainModal from "@/components/AddDomainModal";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Globe, Mail, Link2, Download } from "lucide-react";

type Domain = {
  id: string;
  name: string;
  status: string;
};

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);

  async function loadDomains() {
    const res = await fetch("/api/domains");
    if (res.ok) {
      setDomains(await res.json());
    }
  }

  useEffect(() => {
    loadDomains();
  }, []);

  return (
    <>
      {/* ============ LOGGED OUT: sign-in screen ============ */}
      <Show when="signed-out">
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900 text-xl font-bold text-white">
            CP
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <p className="text-gray-500">
            Sign in to manage your email infrastructure
          </p>
          <SignInButton mode="modal">
            <button className="rounded-xl bg-emerald-900 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
              Sign in with Google
            </button>
          </SignInButton>
        </div>
      </Show>

      {/* ============ LOGGED IN: the dashboard ============ */}
      <Show when="signed-in">
        <div className="flex h-screen bg-gray-50">
          <Sidebar />

          <main className="flex-1 overflow-y-auto">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
              <h1 className="text-lg font-semibold text-gray-900">Home</h1>
              <div className="flex items-center gap-4">
                <span className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700">
                  🔴 0 credits
                </span>
                <UserButton />
              </div>
            </div>

            <div className="px-8 py-6">
              {/* Quick actions */}
              <p className="pb-3 text-xs font-semibold tracking-wider text-gray-400">
                QUICK ACTIONS
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div onClick={() => setModalOpen(true)}>
                  <ActionCard
                    icon={Globe}
                    title="Add Domain"
                    subtitle="Register new domains"
                  />
                </div>
                <ActionCard
                  icon={Mail}
                  title="Add Mailbox"
                  subtitle="Create email accounts"
                />
                <ActionCard
                  icon={Link2}
                  title="Connect Sequencer"
                  subtitle="Link to your outreach tool"
                />
                <ActionCard
                  icon={Download}
                  title="Exports"
                  subtitle="Export mailboxes to tools"
                />
              </div>

              {/* Infrastructure stats */}
              <p className="pb-3 pt-8 text-xs font-semibold tracking-wider text-gray-400">
                YOUR INFRASTRUCTURE
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <StatCard
                  title="Domains"
                  value={String(domains.length)}
                  label="total domains"
                  detail={
                    domains.length > 0
                      ? domains.map((d) => d.name).join(" · ")
                      : "No domains yet — click Add Domain to start"
                  }
                  percent={domains.length > 0 ? 100 : 0}
                />
                <StatCard
                  title="Mailboxes"
                  value="0"
                  label="total mailboxes"
                  detail="0 In Use · 0 Available · 0 Warming Up"
                  percent={0}
                />
              </div>

              {/* Activity placeholder */}
              <p className="pb-3 pt-8 text-xs font-semibold tracking-wider text-gray-400">
                YOUR ACTIVITY
              </p>
              <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-400">
                Sending activity chart coming soon 📈
              </div>
            </div>
          </main>

          {/* Add Domain popup */}
          <AddDomainModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onAdded={loadDomains}
          />
        </div>
      </Show>
    </>
  );
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <button className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left hover:border-gray-300 hover:shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </button>
  );
}

function StatCard({
  title,
  value,
  label,
  detail,
  percent,
}: {
  title: string;
  value: string;
  label: string;
  detail: string;
  percent: number;
}) {
  const barWidth = percent + "%";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">View All ›</span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
        <span className="text-sm font-medium text-red-700">{percent}%</span>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-red-700"
          style={{ width: barWidth }}
        />
      </div>
      <p className="mt-3 text-sm text-gray-500">{detail}</p>
    </div>
  );
}