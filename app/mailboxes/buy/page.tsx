"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";

type Domain = { id: string; name: string; status: string };

type CartItem = {
  firstName: string;
  lastName: string;
  username: string;
  domainId: string;
  platform: string;
};

const emptyItem: CartItem = {
  firstName: "",
  lastName: "",
  username: "",
  domainId: "",
  platform: "google",
};

const PRICE_PER_MAILBOX = 3.99;

export default function BuyMailboxPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [items, setItems] = useState<CartItem[]>([{ ...emptyItem }]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/domains").then(async (res) => {
      if (res.ok) {
        const all: Domain[] = await res.json();
        setDomains(all.filter((d) => d.status === "active"));
      }
    });
  }, []);

  function update(index: number, field: keyof CartItem, value: string) {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: value };
    setItems(copy);
  }

  function addRow() {
    setItems([...items, { ...emptyItem }]);
  }

  function removeRow(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function domainName(id: string) {
    return domains.find((d) => d.id === id)?.name || "";
  }

  async function checkout() {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/mailboxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    setSaving(false);

    if (res.ok) {
      const data = await res.json();
      const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
      if (failed.length > 0) {
        setMessage(
          failed
            .map((f: { email: string; error: string }) => f.email + ": " + f.error)
            .join(" | ")
        );
      } else {
        router.push("/mailboxes");
      }
    } else {
      const data = await res.json();
      setMessage(data.error || "Something went wrong");
    }
  }

  const validItems = items.filter(
    (i) => i.firstName && i.lastName && i.username && i.domainId
  );

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
                Mailboxes › Buy Mailbox
              </h1>
              <UserButton />
            </div>

            <div className="flex gap-6 px-8 py-6">
              {/* Left: mailbox forms */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">Buy mailbox</h2>
                <p className="text-sm text-gray-500">
                  Buy mailboxes to assign to your domains
                </p>

                {domains.length === 0 && (
                  <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
                    You need at least one <b>active</b> domain before creating
                    mailboxes. Go to Domains, connect a domain, and update your
                    nameservers first.
                  </div>
                )}

                {items.map((item, i) => (
                  <div
                    key={i}
                    className="mt-6 rounded-2xl border border-gray-200 bg-white p-6"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">#{i + 1}</p>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeRow(i)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>

                    {/* Platform */}
                    <p className="mt-4 text-xs font-semibold tracking-wider text-gray-400">
                      PLATFORM
                    </p>
                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => update(i, "platform", "google")}
                        className={
                          "rounded-xl border px-5 py-2.5 text-sm font-medium " +
                          (item.platform === "google"
                            ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50")
                        }
                      >
                        Google — $3.99/mo
                      </button>
                      <button
                        onClick={() => update(i, "platform", "ms365")}
                        className={
                          "rounded-xl border px-5 py-2.5 text-sm font-medium " +
                          (item.platform === "ms365"
                            ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50")
                        }
                      >
                        MS 365 — $3.99/mo
                      </button>
                    </div>

                    {/* Names */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          First name*
                        </label>
                        <input
                          value={item.firstName}
                          onChange={(e) => update(i, "firstName", e.target.value)}
                          placeholder="Matt"
                          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-700"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Last name*
                        </label>
                        <input
                          value={item.lastName}
                          onChange={(e) => update(i, "lastName", e.target.value)}
                          placeholder="Welsh"
                          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-700"
                        />
                      </div>
                    </div>

                    {/* Username + domain */}
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-700">
                        Username*
                      </label>
                      <div className="mt-1 flex gap-3">
                        <input
                          value={item.username}
                          onChange={(e) => update(i, "username", e.target.value)}
                          placeholder="mattwelsh"
                          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-700"
                        />
                        <select
                          value={item.domainId}
                          onChange={(e) => update(i, "domainId", e.target.value)}
                          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-700"
                        >
                          <option value="">@ Select domain</option>
                          {domains.map((d) => (
                            <option key={d.id} value={d.id}>
                              @{d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addRow}
                  className="mt-6 w-full rounded-2xl bg-emerald-900 py-4 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  + Add More Mailboxes
                </button>
              </div>

              {/* Right: cart */}
              <div className="w-80 shrink-0">
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <p className="text-xs font-semibold tracking-wider text-gray-400">
                    YOUR CART
                  </p>

                  {validItems.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center text-sm text-gray-400">
                      No mailboxes configured yet
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {validItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate text-gray-700">
                            {item.username}@{domainName(item.domainId)}
                          </span>
                          <span className="text-gray-500">
                            ${PRICE_PER_MAILBOX}/mo
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900">
                        Total: ${(validItems.length * PRICE_PER_MAILBOX).toFixed(2)}/mo
                      </div>
                    </div>
                  )}

                  {message && (
                    <p className="mt-3 text-sm text-red-600">{message}</p>
                  )}

                  <button
                    onClick={checkout}
                    disabled={saving || validItems.length === 0}
                    className="mt-5 w-full rounded-xl bg-emerald-900 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {saving ? "Processing..." : "Checkout"}
                  </button>
                  <p className="mt-2 text-center text-xs text-gray-400">
                    Payment integration coming next — orders are queued as
                    Pending for now
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </Show>
    </>
  );
}