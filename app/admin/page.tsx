"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Globe, Mail, Users, Trash2, LogIn } from "lucide-react";

type PortalUser = {
  userId: string;
  email: string;
  role: string;
  domainCount: number;
  activeDomains: number;
  mailboxCount: number;
  activeMailboxes: number;
  createdAt: string;
};

type Archived = {
  id: string;
  email: string;
  domainCount: number;
  mailboxCount: number;
  note: string | null;
  deletedAt: string;
};

type Stats = {
  totalClients: number;
  totalDomains: number;
  activeDomains: number;
  totalMailboxes: number;
  activeMailboxes: number;
};

export default function AdminPage() {
  const [myRole, setMyRole] = useState("");
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [archived, setArchived] = useState<Archived[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [deleting, setDeleting] = useState("");

  const load = useCallback(async () => {
    const meRes = await fetch("/api/me");
    if (meRes.ok) setMyRole((await meRes.json()).role);

    const uRes = await fetch("/api/admin/users");
    if (uRes.ok) setUsers(await uRes.json());

    const sRes = await fetch("/api/admin/stats");
    if (sRes.ok) setStats(await sRes.json());

    const aRes = await fetch("/api/admin/archived");
    if (aRes.ok) setArchived(await aRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function accessClient(userId: string) {
    await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    window.location.href = "/";
  }

  async function deleteClient(u: PortalUser) {
    const sure = confirm(
      "Delete " +
        u.email +
        "?\n\nTheir login will be revoked and all their domains and mailboxes removed from the portal. Their history stays in your archive. This cannot be undone."
    );
    if (!sure) return;

    const note =
      prompt(
        "Reason / note for the archive (e.g. 'delayed payment 3 times'):"
      ) || "";

    setDeleting(u.userId);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.userId, note }),
    });
    setDeleting("");

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Delete failed");
    }
    load();
  }

  async function changeRole(userId: string, role: string) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    load();
  }

  const isStaff = myRole === "admin" || myRole === "team";
  const isAdmin = myRole === "admin";

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
              <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
              <UserButton />
            </div>

            {!isStaff ? (
              <div className="flex h-96 items-center justify-center text-gray-400">
                {myRole === "" ? "Checking access..." : "You don't have access to this page."}
              </div>
            ) : (
              <div className="px-8 py-6">
                {/* ===== Platform stats ===== */}
                <p className="pb-3 text-xs font-semibold tracking-wider text-gray-400">
                  PLATFORM OVERVIEW
                </p>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  <StatCard icon={Users} label="Clients" value={stats?.totalClients} />
                  <StatCard icon={Globe} label="Total Domains" value={stats?.totalDomains} />
                  <StatCard icon={Globe} label="Active Domains" value={stats?.activeDomains} accent />
                  <StatCard icon={Mail} label="Total Mailboxes" value={stats?.totalMailboxes} />
                  <StatCard icon={Mail} label="Active Mailboxes" value={stats?.activeMailboxes} accent />
                </div>

                {/* ===== Clients ===== */}
                <p className="pb-3 pt-8 text-xs font-semibold tracking-wider text-gray-400">
                  CLIENTS ({users.length})
                </p>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-100 text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Email</th>
                        <th className="px-6 py-4 font-medium">Role</th>
                        <th className="px-6 py-4 font-medium">Domains</th>
                        <th className="px-6 py-4 font-medium">Mailboxes</th>
                        <th className="px-6 py-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.userId} className="border-b border-gray-50">
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {u.email}
                          </td>
                          <td className="px-6 py-4">
                            {isAdmin ? (
                              <select
                                value={u.role}
                                onChange={(e) => changeRole(u.userId, e.target.value)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                              >
                                <option value="client">client</option>
                                <option value="team">team</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              <span className="text-gray-600">{u.role}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-emerald-700">
                              {u.activeDomains}
                            </span>
                            <span className="text-gray-400"> / {u.domainCount}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-emerald-700">
                              {u.activeMailboxes}
                            </span>
                            <span className="text-gray-400"> / {u.mailboxCount}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => accessClient(u.userId)}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                              >
                                <LogIn size={13} /> Access
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => deleteClient(u)}
                                  disabled={deleting === u.userId}
                                  className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 size={13} />
                                  {deleting === u.userId ? "Deleting..." : "Delete"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ===== Archived / deleted clients ===== */}
                <p className="pb-3 pt-8 text-xs font-semibold tracking-wider text-gray-400">
                  DELETED CLIENTS — HISTORY ({archived.length})
                </p>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-100 text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Email</th>
                        <th className="px-6 py-4 font-medium">Had Domains</th>
                        <th className="px-6 py-4 font-medium">Had Mailboxes</th>
                        <th className="px-6 py-4 font-medium">Note</th>
                        <th className="px-6 py-4 font-medium">Deleted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archived.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                            No deleted clients yet
                          </td>
                        </tr>
                      )}
                      {archived.map((a) => (
                        <tr key={a.id} className="border-b border-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{a.email}</td>
                          <td className="px-6 py-4 text-gray-700">{a.domainCount}</td>
                          <td className="px-6 py-4 text-gray-700">{a.mailboxCount}</td>
                          <td className="px-6 py-4 text-gray-600">{a.note || "—"}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(a.deletedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </Show>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value?: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className={
          "mt-2 text-3xl font-bold " +
          (accent ? "text-emerald-700" : "text-gray-900")
        }
      >
        {value ?? "…"}
      </p>
    </div>
  );
}