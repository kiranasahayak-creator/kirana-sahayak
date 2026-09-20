"use client";

import { useEffect, useMemo, useState } from "react";
import { CartLine as CartLineComponent } from "@/components/CartLine";
import { CategorySidebar } from "@/components/CategorySidebar";
import { ProductCard } from "@/components/ProductCard";
import { VoiceButton } from "@/components/VoiceButton";
import { api, ApiError } from "@/lib/api";
import { CartLine, Product, VoiceItem, VoiceTranscribeResponse } from "@/lib/types";

type Source = "voice" | "search" | "quickadd" | "mixed";

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sourcesUsed, setSourcesUsed] = useState<Set<Source>>(new Set());
  const [transcript, setTranscript] = useState<string | null>(null);
  const [ambiguousQueue, setAmbiguousQueue] = useState<VoiceItem[]>([]);
  const [unmatchedNotes, setUnmatchedNotes] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ type: "success" | "info" | "error"; text: string } | null>(
    null
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .listProducts(activeCategory ?? undefined)
      .then(setProducts)
      .catch((err) =>
        setBanner({
          type: "error",
          text:
            err instanceof ApiError
              ? `Couldn't load products: ${err.message}`
              : "Couldn't reach the backend — is it running?",
        })
      );
  }, [activeCategory]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => {
      api.searchProducts(q).then(setSearchResults).catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const totalItems = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const totalValue = useMemo(
    () => cart.reduce((s, l) => s + l.quantity * l.product.sellingPrice, 0),
    [cart]
  );

  function addToCart(product: Product, quantity: number, source: Source) {
    setSourcesUsed((prev) => new Set(prev).add(source));
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      return [...prev, { product, quantity }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function handleVoiceResult(data: VoiceTranscribeResponse) {
    setTranscript(data.transcript);
    const stillAmbiguous: VoiceItem[] = [];
    const stillUnmatched: string[] = [];

    for (const item of data.items) {
      if (item.status === "confident" && item.matches[0]) {
        const m = item.matches[0];
        const product = products.find((p) => p.id === m.productId);
        if (product) {
          addToCart(product, item.quantity, "voice");
          continue;
        }
      }
      if (item.status === "ambiguous" && item.matches.length > 0) {
        stillAmbiguous.push(item);
      } else {
        stillUnmatched.push(item.rawText);
      }
    }

    if (stillAmbiguous.length) setAmbiguousQueue(stillAmbiguous);
    if (stillUnmatched.length) setUnmatchedNotes(stillUnmatched);
    if (!stillAmbiguous.length && !stillUnmatched.length) {
      setBanner({ type: "success", text: "Added from voice — review below and press SEND." });
    }
  }

  function resolveAmbiguous(item: VoiceItem, chosenProductId: string | null) {
    if (chosenProductId) {
      const match = item.matches.find((m) => m.productId === chosenProductId);
      const product = products.find((p) => p.id === chosenProductId);
      if (match && product) addToCart(product, item.quantity, "voice");
    }
    setAmbiguousQueue((prev) => prev.filter((i) => i !== item));
  }

  async function handleSend() {
    if (cart.length === 0) return;
    setSending(true);
    setBanner(null);
    try {
      const source: Source = sourcesUsed.size > 1 ? "mixed" : [...sourcesUsed][0] || "search";
      await api.createSale(
        cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        source
      );
      setCart([]);
      setSourcesUsed(new Set());
      setTranscript(null);
      setBanner({ type: "success", text: "Sale recorded successfully" });
      api.listProducts(activeCategory ?? undefined).then(setProducts).catch(() => {});
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof ApiError ? err.message : "Couldn't record the sale. Try again.",
      });
    } finally {
      setSending(false);
    }
  }

  const displayProducts = searchResults ?? products;

  return (
    <div className="space-y-5 pb-28">
      {banner && (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
            banner.type === "success"
              ? "bg-brand-50 text-brand-700"
              : banner.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-accent-50 text-accent-700"
          }`}
        >
          {banner.text}
        </div>
      )}

      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search products (e.g. Lay's, Coke, Maggi)"
        className="w-full rounded-2xl border border-paper-200 bg-white px-4 py-3.5 text-sm shadow-card placeholder:text-paper-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <div className="flex flex-col gap-6 sm:flex-row">
        <CategorySidebar
          active={searchResults ? null : activeCategory}
          onSelect={(c) => {
            setSearchQuery("");
            setSearchResults(null);
            setActiveCategory(c);
          }}
        />

        <div className="min-w-0 flex-1 space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-paper-400">
              {searchResults ? "Search results" : activeCategory ?? "All products"}
            </h2>
            {displayProducts.length === 0 ? (
              <p className="text-sm text-paper-400">No products found.</p>
            ) : (
              <div className="space-y-2.5">
                {displayProducts.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={() => addToCart(p, 1, "quickadd")} />
                ))}
              </div>
            )}
          </div>

          {transcript !== null && (
            <div className="rounded-xl bg-paper-100 p-3.5 text-sm text-paper-700">
              <span className="font-semibold text-paper-500">You said: </span>
              {transcript || "(nothing recognized)"}
            </div>
          )}

          {unmatchedNotes.length > 0 && (
            <div className="rounded-xl border border-accent-200 bg-accent-50 p-3.5 text-sm text-accent-700">
              Couldn&apos;t match: {unmatchedNotes.join(", ")}. Try searching for these manually.
            </div>
          )}

          {ambiguousQueue[0] && (
            <div className="rounded-2xl border border-paper-200 bg-white p-4 shadow-card">
              <p className="mb-3 text-sm font-semibold text-paper-800">
                Which product did you mean for &ldquo;{ambiguousQueue[0].rawText}&rdquo;?
              </p>
              <div className="flex flex-wrap gap-2">
                {ambiguousQueue[0].matches.map((m) => (
                  <button
                    key={m.productId}
                    onClick={() => resolveAmbiguous(ambiguousQueue[0], m.productId)}
                    className="rounded-xl border border-paper-200 px-3.5 py-2 text-sm font-medium transition hover:border-brand-500 hover:text-brand-700"
                  >
                    {m.name}
                  </button>
                ))}
                <button
                  onClick={() => resolveAmbiguous(ambiguousQueue[0], null)}
                  className="rounded-xl px-3.5 py-2 text-sm text-paper-400 hover:text-paper-600"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-paper-100 bg-white shadow-card">
            <div className="border-b border-paper-100 px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-paper-800">Cart</h2>
            </div>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-14 text-center">
                <p className="font-display text-base font-semibold text-paper-800">Cart is empty</p>
                <p className="text-sm text-paper-400">Add products using search, quick add, or voice.</p>
              </div>
            ) : (
              <div className="px-5">
                {cart.map((line) => (
                  <CartLineComponent
                    key={line.product.id}
                    line={line}
                    onChangeQuantity={(q) => updateQuantity(line.product.id, q)}
                    onRemove={() => removeFromCart(line.product.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-paper-100 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="text-sm text-paper-700">
            <span className="font-display font-semibold text-paper-900">{totalItems}</span> items ·{" "}
            <span className="font-display font-semibold text-paper-900">₹{totalValue}</span>
          </div>
          <button
            onClick={handleSend}
            disabled={cart.length === 0 || sending}
            className="rounded-xl bg-brand-500 px-7 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-paper-400"
          >
            {sending ? "Sending..." : "SEND"}
          </button>
        </div>
      </div>

      <div className="fixed bottom-24 right-4 sm:right-6">
        <VoiceButton
          onResult={handleVoiceResult}
          onFallbackToSearch={(msg) => setBanner({ type: "info", text: msg })}
        />
      </div>
    </div>
  );
}
