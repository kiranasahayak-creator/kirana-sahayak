"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getStoreName, isAuthed } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      router.replace("/login");
      return;
    }
    setStoreName(getStoreName());
    setReady(true);
  }, [router]);

  if (!ready) return null;

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  const tabs = [
    { href: "/app/cart", label: "Cart" },
    { href: "/app/recommendation", label: "Recommendation" },
  ];

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-paper-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center">
            <span className="font-display text-lg font-extrabold tracking-tight text-brand-800">
              Kirana Sahayak
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-paper-600 sm:inline">{storeName}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-paper-600 transition hover:text-paper-900"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-b-2 border-brand-500 text-brand-700"
                    : "border-b-2 border-transparent text-paper-400 hover:text-paper-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}