"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, GitBranch, Users, Settings, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Struktur Organisasi", icon: Network, active: "bg-sky-600", idle: "text-sky-400" },
  { href: "/divisi", label: "Per Divisi", icon: GitBranch, active: "bg-violet-600", idle: "text-violet-400" },
  { href: "/orang", label: "Kelola Orang", icon: Users, active: "bg-emerald-600", idle: "text-emerald-400" },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, active: "bg-amber-600", idle: "text-amber-400" },
];

const HIDDEN_KEY = "sidebar-hidden";
const HIDDEN_EVENT = "sidebar-hidden-change";
function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeHidden(cb: () => void) {
  window.addEventListener(HIDDEN_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(HIDDEN_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Desktop only: collapse the sidebar to give the chart the full width. Remembered per browser.
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, () => false);
  const toggleHidden = (next: boolean) => {
    try {
      localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(HIDDEN_EVENT));
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 px-4 py-3 md:hidden">
        <span className="flex items-center gap-2 font-semibold text-white">
          <Network className="h-5 w-5 text-sky-400" aria-hidden="true" />
          OrgChart
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          className="cursor-pointer rounded p-2 text-white hover:bg-white/10"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {hidden && (
        <button
          type="button"
          onClick={() => toggleHidden(false)}
          aria-label="Tampilkan menu"
          title="Tampilkan menu"
          className="fixed top-4 left-0 z-30 hidden h-10 w-6 cursor-pointer items-center justify-center rounded-r-lg bg-slate-900 text-white shadow-lg hover:w-8 hover:bg-slate-800 md:flex"
        >
          <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-gradient-to-b from-slate-900 to-indigo-950 text-slate-100 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${hidden ? "md:hidden" : ""} ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
          <Network className="h-6 w-6 text-sky-400" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight text-white">OrgChart</span>
          <button
            type="button"
            onClick={() => toggleHidden(true)}
            aria-label="Sembunyikan menu"
            title="Sembunyikan menu"
            className="ml-auto hidden cursor-pointer rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:block"
          >
            <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon, active, idle }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? `${active} text-white shadow-sm` : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : idle}`} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-xs text-slate-500">by. Pictor R. Tumanggor</p>
        </div>
      </aside>
    </>
  );
}
