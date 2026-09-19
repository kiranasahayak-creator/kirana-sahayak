"use client";

import { useEffect, useMemo, useState } from "react";
import { CartLine as CartLineComponent } from "@/components/CartLine";
import { ProductCard } from "@/components/ProductCard";
import { VoiceButton } from "@/components/VoiceButton";
import { api, ApiError } from "@/lib/api";
import { CartLine, Product, VoiceItem, VoiceTranscribeResponse } from "@/lib/types";

type Source = "voice" | "search" | "quickadd" | "mixed";

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
    api.listProducts().then(setProducts).catch(() => setBanner({ type: "error", text: "Couldn't load products." }));
  }, []);

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
      // Refresh product list so quick-add cards reflect the new stock levels.
      api.listProducts().then(setProducts).catch(() => {});
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof ApiError ? err.message : "Couldn't record the sale. Try again.",
      });
    } finally {
      setSending(false);
    }
  }

  const displayProducts = searchResults ?? products.slice(0, 12);
  const currentAmbiguous = ambiguousQueue[0];

  return (
    <div className="space-y-6 pb-28">
      {banner && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            banner.type === "success"
              ? "bg-green-50 text-green-700"
              : banner.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Search */}
      <div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products (e.g. Lay's, Coke, Maggi)"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Quick add grid */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-500">
          {searchResults ? "Search results" : "Quick add"}
        </h2>
        {displayProducts.length === 0 ? (
          <p className="text-sm text-gray-400">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => addToCart(p, 1, "quickadd")} />
            ))}
          </div>
        )}
      </div>

      {/* Voice transcript feedback */}
      {transcript !== null && (
        <div className="rounded-xl bg-gray-100 p-3 text-sm text-gray-600">
          <span className="font-medium text-gray-500">You said: </span>
          {transcript || "(nothing recognized)"}
        </div>
      )}

      {unmatchedNotes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Couldn&apos;t match: {unmatchedNotes.join(", ")}. Try searching for these manually.
        </div>
      )}

      {/* Ambiguous match resolution */}
      {currentAmbiguous && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-gray-800">
            Which product did you mean for &ldquo;{currentAmbiguous.rawText}&rdquo;?
          </p>
          <div className="flex flex-wrap gap-2">
            {currentAmbiguous.matches.map((m) => (
              <button
                key={m.productId}
                onClick={() => resolveAmbiguous(currentAmbiguous, m.productId)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:border-brand-500 hover:text-brand-600"
              >
                {m.name}
              </button>
            ))}
            <button
              onClick={() => resolveAmbiguous(currentAmbiguous, null)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Cart */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-medium text-gray-700">Cart</h2>
        </div>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
            <p className="text-base font-medium text-gray-700">Cart is empty</p>
            <p className="text-sm text-gray-400">Add products using search, quick add, or voice.</p>
          </div>
        ) : (
          <div className="px-4">
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

      {/* Totals + SEND */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{totalItems}</span> items ·{" "}
            <span className="font-medium text-gray-900">₹{totalValue}</span>
          </div>
          <button
            onClick={handleSend}
            disabled={cart.length === 0 || sending}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {sending ? "Sending..." : "SEND"}
          </button>
        </div>
      </div>

      {/* Voice button, floating */}
      <div className="fixed bottom-24 right-4">
        <VoiceButton
          onResult={handleVoiceResult}
          onFallbackToSearch={(msg) => setBanner({ type: "info", text: msg })}
        />
      </div>
    </div>
  );
}
