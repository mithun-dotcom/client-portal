"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ImpersonationBanner() {
  const router = useRouter();
  const [info, setInfo] = useState<{ active: boolean; targetEmail?: string }>({
    active: false,
  });

  useEffect(() => {
    fetch("/api/admin/impersonate").then(async (res) => {
      if (res.ok) setInfo(await res.json());
    });
  }, []);

  if (!info.active) return null;

  async function exit() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
    window.location.href = "/admin";
  }

  return (
    <div className="flex items-center justify-center gap-4 bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950">
      👁 You are viewing as <span className="underline">{info.targetEmail}</span> —
      every change you make applies to their account
      <button
        onClick={exit}
        className="rounded-lg bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-900"
      >
        Exit client view
      </button>
    </div>
  );
}