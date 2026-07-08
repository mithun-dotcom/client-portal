"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Globe, Mail, Activity, GitBranch, Download,
  Flame, BarChart3, Wallet, CalendarClock, Settings, Zap,
} from "lucide-react";

const mainNav = [
  { name: "Home", icon: Home, href: "/" },
  { name: "Domains", icon: Globe, href: "/domains" },
  { name: "Mailboxes", icon: Mail, href: "/mailboxes" },
  { name: "Warmup", icon: Activity, href: "#", badge: "New" },
  { name: "Sequencers", icon: GitBranch, href: "#" },
  { name: "Exports", icon: Download, href: "#" },
  { name: "Prewarm", icon: Flame, href: "#", badge: "New" },
  { name: "Email Insights", icon: BarChart3, href: "#" },
];

const workspaceNav = [
  { name: "Wallet Logs", icon: Wallet, href: "#" },
  { name: "Renewals", icon: CalendarClock, href: "#", badge: "New" },
  { name: "Settings", icon: Settings, href: "#" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-sm font-bold text-rose-500">
          CY
        </div>
        <span className="text-lg font-semibold text-gray-900">Cyber Plan</span>
      </div>

      <div className="px-4 pt-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
          <Zap size={16} /> Quick Setup
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-gray-400">
          MAIN
        </p>
        {mainNav.map((item) => (
          <NavItem key={item.name} {...item} active={pathname === item.href} />
        ))}

        <p className="px-3 pb-2 pt-6 text-xs font-semibold tracking-wider text-gray-400">
          WORKSPACE
        </p>
        {workspaceNav.map((item) => (
          <NavItem key={item.name} {...item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-gray-100 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
          MI
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            Mithun Pramanik
          </p>
          <p className="truncate text-xs text-gray-500">
            mithunpk124604@gm...
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  name,
  icon: Icon,
  href,
  active,
  badge,
}: {
  name: string;
  icon: React.ElementType;
  href: string;
  active?: boolean;
  badge?: string;
}) {
  const base =
    "mb-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ";
  const colors = active
    ? "bg-gray-100 text-gray-900"
    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900";

  return (
    <Link href={href} className={base + colors}>
      <span className="flex items-center gap-3">
        <Icon size={18} /> {name}
      </span>
      {badge && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {badge}
        </span>
      )}
    </Link>
  );
}