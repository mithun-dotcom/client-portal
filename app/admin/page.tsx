"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

type PortalUser = {
  userId: string;
  email: string;
  role: string;
  domainCount: number;
  mailboxCount: number;
  createdAt: string;
};

type Mailbox = {
  id: string;
  email: string;
  status: string;
  platform: string;
};

type Domain = { id: string; name: string; status: string };

export default function AdminPage() {
  const [myRole, setMyRole] = useState<string>("");
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [selected, setSelected] = useState<PortalUser | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);

  const load = useCallback(async () => {
    const meRes = await fetch("/api/me");
    if (meRes.ok) {
      const me = await meRes.json();
      setMyRole(me.role);
    }
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openClient(u: PortalUser) {
    setSelected(u);
    const dres = await fetch("/api/admin/domains?userId=" + u.userId);
    if (dres.ok) setDomains(await dres.json());
    const mres = await fetch("/api/admin/mailboxes?userId=" + u.userId);
    if (mres.ok) setMailboxes(await mres.json());
  }

  async function changeRole(userId: string, role: string) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    load();
  }

  async function changeMailboxStatus(id: string, status: string) {
    await fetch("/api/admin/mailboxes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (selected) openClient(selected);
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
              <h1 className="text-lg font-semibold text-gray-900">
                Admin Panel
              </h1>
              <UserButton />
            </div>

            {myRole !== "admin" && myRole !== "team" ? (
              <div className="flex h-96 items-center justify-center text-gray-400">
                {myRole === ""
                  ? "Checking access..."
                  : "You don't have access to this page."}
              </div>
            ) : (
              <div className="px-8 py-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Clients ({users.length})
                </h2>
                <p className="text-sm text-gray-500">
                  Every user of the portal · your role: {myRole}
                </p>

                <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-100 text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Email</th>
                        <th className="px-6 py-4 font-medium">Role</th>
                        <th className="px-6 py-4 font-medium">Domains</th>
                        <th className="px-6 py-4 font-medium">Mailboxes</th>
                        <th className="px-6 py-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.userId} className="border-b border-gray-50">
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {u.email}
                          </td>
                          <td className="px-6 py-4">
                            {myRole === "admin" ? (
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  changeRole(u.userId, e.target.value)
                                }
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
                          <td className="px-6 py-4 text-gray-700">
                            {u.domainCount}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {u.mailboxCount}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => openClient(u)}
                              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              View Data
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Selected client detail */}
                {selected && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selected.email} — details
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Domains */}
                      <div className="rounded-2xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">
                          Domains ({domains.length})
                        </p>
                        <div className="mt-3 space-y-2">
                          {domains.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-2.5 text-sm"
                            >
                              <span className="font-medium text-gray-900">
                                {d.name}
                              </span>
                              <span
                                className={
                                  "rounded-full px-3 py-1 text-xs font-medium " +
                                  (d.status === "active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-yellow-50 text-yellow-700")
                                }
                              >
                                {d.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mailboxes */}
                      <div className="rounded-2xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">
                          Mailboxes ({mailboxes.length})
                        </p>
                        <div className="mt-3 space-y-2">
                          {mailboxes.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-2.5 text-sm"
                            >
                              <span className="truncate font-medium text-gray-900">
                                {m.email}
                              </span>
                              {myRole === "admin" ? (
                                <select
                                  value={m.status}
                                  onChange={(e) =>
                                    changeMailboxStatus(m.id, e.target.value)
                                  }
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                >
                                  <option value="pending">pending</option>
                                  <option value="provisioning">
                                    provisioning
                                  </option>
                                  <option value="active">active</option>
                                  <option value="failed">failed</option>
                                </select>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  {m.status}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </Show>
    </>
  );
}