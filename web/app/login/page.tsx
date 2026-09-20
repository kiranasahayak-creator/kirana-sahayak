"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [storeCode, setStoreCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, store } = await api.login(storeCode.trim(), password);
      saveSession(token, store.storeName);
      router.push("/app/cart");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-elevated ring-1 ring-paper-100">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-800 text-xl font-bold text-white shadow-card">
            K
          </div>
          <h1 className="font-display text-xl font-bold text-paper-900">Kirana Sahayak</h1>
          <p className="mt-1 text-sm text-paper-600">Sign in with your store ID</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-paper-800">Store ID</label>
            <input
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              placeholder="STORE001"
              autoCapitalize="characters"
              className="w-full rounded-xl border border-paper-200 bg-paper-25 px-4 py-3 text-sm text-paper-900 placeholder:text-paper-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-paper-800">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-paper-200 bg-paper-25 px-4 py-3 text-sm text-paper-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-paper-400">
          Demo: STORE001 / STORE002 / STORE003 — password demo123
        </p>
      </div>
    </div>
  );
}
