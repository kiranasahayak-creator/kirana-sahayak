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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              K
            </div>
            <span className="text-sm font-semibold text-gray-900">Kirana Sahayak</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{storeName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-b-2 border-brand-500 text-brand-600"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
