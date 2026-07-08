"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

type Mailbox = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  platform: string;
  status: string;
};

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);

  useEffect(() => {
    fetch("/api/mailboxes").then(async (res) => {
      if (res.ok) setMailboxes(await res.json());
    });
  }, []);

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
              <h1 className="text-lg font-semibold text-gray-900">Mailboxes</h1>
              <UserButton />
            </div>

            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Mailboxes</h2>
                  <p className="text-sm text-gray-500">
                    Manage your email mailboxes and sender reputation
                  </p>
                </div>
                <Link
                  href="/mailboxes/buy"
                  className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  + Buy Mailboxes
                </Link>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Mailbox</th>
                      <th className="px-6 py-4 font-medium">Platform</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mailboxes.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-gray-400">
                          No mailboxes yet — click Buy Mailboxes to create some
                        </td>
                      </tr>
                    )}
                    {mailboxes.map((m) => (
                      <tr key={m.id} className="border-b border-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-gray-500">{m.email}</p>
                        </td>
                        <td className="px-6 py-4 capitalize text-gray-700">
                          {m.platform}
                        </td>
                        <td className="px-6 py-4">
                          {m.status === "active" ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              ✓ Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </Show>
    </>
  );
}