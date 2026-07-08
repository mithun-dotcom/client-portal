"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DomainPanel from "@/components/DomainPanel";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Copy, RefreshCw, X, Settings2 } from "lucide-react";

type Domain = {
  id: string;
  name: string;
  status: string;
  nameservers: string[];
};

type Mailbox = { id: string; domainId: string };

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [checkingId, setCheckingId] = useState("");
  const [selected, setSelected] = useState<Domain | null>(null);

  async function load() {
    const res = await fetch("/api/domains");
    if (res.ok) setDomains(await res.json());
    const mres = await fetch("/api/mailboxes");
    if (mres.ok) setMailboxes(await mres.json());
  }

  useEffect(() => {
    load();
  }, []);

  function mailboxCount(domainId: string) {
    return mailboxes.filter((m) => m.domainId === domainId).length;
  }

  async function connectDomains() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: input }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
      if (failed.length > 0) {
        setMessage(
          failed
            .map((f: { name: string; error: string }) => f.name + ": " + f.error)
            .join(" | ")
        );
      } else {
        setModalOpen(false);
        setInput("");
      }
      load();
    } else {
      setMessage("Something went wrong");
    }
  }

  async function checkStatus(id: string) {
    setCheckingId(id);
    await fetch("/api/domains/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCheckingId("");
    load();
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
              <h1 className="text-lg font-semibold text-gray-900">Domains</h1>
              <UserButton />
            </div>

            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Domains</h2>
                  <p className="text-sm text-gray-500">
                    Manage your domains, DNS records, and nameserver health
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  + Connect Existing
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Domain Name</th>
                      <th className="px-6 py-4 font-medium">Mailboxes</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Check</th>
                      <th className="px-6 py-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                          No domains yet — click Connect Existing to add some
                        </td>
                      </tr>
                    )}
                    {domains.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {d.name}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {mailboxCount(d.id)}
                        </td>
                        <td className="px-6 py-4">
                          {d.status === "active" ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              ✓ Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                              Not Connected
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => checkStatus(d.id)}
                            disabled={checkingId === d.id}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <RefreshCw
                              size={13}
                              className={checkingId === d.id ? "animate-spin" : ""}
                            />
                            Check
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelected(d)}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Settings2 size={13} />
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>

          {/* Connect Existing modal */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Connect existing domains
                  </h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Paste your domains — one per line or separated by commas.
                </p>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={"example.com\nanotherdomain.io"}
                  rows={6}
                  className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-700"
                />
                {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={connectDomains}
                    disabled={saving || !input.trim()}
                    className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {saving ? "Connecting..." : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manage panel */}
          {selected && (
            <DomainPanel
              domain={selected}
              
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </Show>
    </>
  );
}