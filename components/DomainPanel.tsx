"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Trash2, Pencil, Plus } from "lucide-react";

type Domain = {
  id: string;
  name: string;
  status: string;
  nameservers: string[];
};

type DnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
};

const emptyForm = { type: "TXT", name: "", content: "", ttl: "3600", priority: "0" };

export default function DomainPanel({
  domain,
  mailboxCount,
  onClose,
}: {
  domain: Domain;
  mailboxCount: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "dns">("overview");
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/domains/" + domain.id + "/records");
      if (res.ok) setRecords(await res.json());
    } catch {
      // ignore, records stay empty
    }
    setLoading(false);
  }, [domain.id]);

  useEffect(() => {
    load();
  }, [load]);

  const hasSPF = records.some(
    (r) => r.type === "TXT" && r.content.includes("v=spf1")
  );
  const hasDMARC = records.some(
    (r) =>
      r.type === "TXT" &&
      r.name.startsWith("_dmarc") &&
      r.content.toUpperCase().includes("V=DMARC1")
  );
  const hasMX = records.some((r) => r.type === "MX");
  const hasDKIM = records.some(
    (r) =>
      (r.type === "TXT" && r.content.includes("v=DKIM1")) ||
      r.name.includes("domainkey")
  );

  function upd(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  function startEdit(r: DnsRecord) {
    setEditingId(r.id);
    setForm({
      type: r.type,
      name: r.name,
      content: r.content,
      ttl: String(r.ttl),
      priority: String(r.priority ?? 0),
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId("");
    setForm({ ...emptyForm });
    setMessage("");
  }

  async function saveRecord() {
    setSaving(true);
    setMessage("");

    const url = editingId
      ? "/api/domains/" + domain.id + "/records/" + editingId
      : "/api/domains/" + domain.id + "/records";

    try {
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        cancelEdit();
        load();
      } else {
        let msg = "Request failed with status " + res.status;
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch {
          // response had no JSON body — keep the status message
        }
        setMessage(msg);
      }
    } catch {
      setMessage("Network error — is the server running?");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm("Delete this DNS record? This updates Cloudflare immediately.")) return;
    await fetch("/api/domains/" + domain.id + "/records/" + id, {
      method: "DELETE",
    });
    load();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 className="text-xl font-bold text-gray-900">🌐 {domain.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-100 px-6">
          {(["overview", "dns"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "border-b-2 py-3 text-sm font-medium capitalize " +
                (tab === t
                  ? "border-emerald-800 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800")
              }
            >
              {t === "dns" ? "DNS" : t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ================= OVERVIEW ================= */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-400">
                  STATUS
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-700">Status</span>
                  {domain.status === "active" ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                      Pending
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-700">Mailboxes</span>
                  <span className="font-medium text-gray-900">{mailboxCount}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-400">
                  DNS RECORD HEALTH
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <HealthBadge label="SPF" ok={hasSPF} loading={loading} />
                  <HealthBadge label="DKIM" ok={hasDKIM} loading={loading} />
                  <HealthBadge label="DMARC" ok={hasDMARC} loading={loading} />
                  <HealthBadge label="MX" ok={hasMX} loading={loading} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Green = record found in Cloudflare · Red = missing, add it in the
                  DNS tab
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-400">
                  NAMESERVERS
                </p>
                <div className="mt-2 space-y-2">
                  {domain.nameservers.map((ns) => (
                    <div
                      key={ns}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700"
                    >
                      {ns}
                      <button
                        onClick={() => navigator.clipboard.writeText(ns)}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= DNS ================= */}
          {tab === "dns" && (
            <div>
              {/* Add / edit form */}
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  {editingId ? "Edit record" : "Add record"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <select
                    value={form.type}
                    onChange={(e) => upd("type", e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
                  >
                    {["A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    value={form.name}
                    onChange={(e) => upd("name", e.target.value)}
                    placeholder="Name (@ or subdomain)"
                    className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
                  />
                </div>
                <input
                  value={form.content}
                  onChange={(e) => upd("content", e.target.value)}
                  placeholder="Content / value"
                  className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    value={form.ttl}
                    onChange={(e) => upd("ttl", e.target.value)}
                    placeholder="TTL (3600)"
                    className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
                  />
                  <input
                    value={form.priority}
                    onChange={(e) => upd("priority", e.target.value)}
                    placeholder="Priority (MX/SRV only)"
                    className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
                  />
                </div>

                {message && <p className="mt-2 text-sm text-red-600">{message}</p>}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={saveRecord}
                    disabled={saving || !form.name || !form.content}
                    className="flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Plus size={15} />
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Record"
                      : "Add Record"}
                  </button>
                  {editingId && (
                    <button
                      onClick={cancelEdit}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Records list */}
              <p className="mt-6 text-sm font-semibold text-gray-900">
                {loading
                  ? "Loading records from Cloudflare..."
                  : records.length + " DNS records"}
              </p>
              <div className="mt-3 space-y-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  >
                    <span className="w-14 shrink-0 rounded-md bg-gray-100 px-2 py-1 text-center text-xs font-semibold text-gray-600">
                      {r.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{r.name}</p>
                      <p className="truncate text-gray-500">{r.content}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      TTL {r.ttl === 1 ? "Auto" : r.ttl}
                    </span>
                    <button
                      onClick={() => startEdit(r)}
                      className="shrink-0 text-gray-400 hover:text-gray-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteRecord(r.id)}
                      className="shrink-0 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthBadge({
  label,
  ok,
  loading,
}: {
  label: string;
  ok: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">
        {label} …
      </span>
    );
  }
  return ok ? (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      ✓ {label}
    </span>
  ) : (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
      ✗ {label}
    </span>
  );
}