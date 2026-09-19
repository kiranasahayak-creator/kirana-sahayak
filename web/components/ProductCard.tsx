import { Product } from "@/lib/types";

export function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-500">
          {product.brand ? `${product.brand} · ` : ""}
          {product.packSize} · ₹{product.sellingPrice}
        </p>
      </div>
      <button
        onClick={onAdd}
        aria-label={`Add ${product.name}`}
        className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-semibold leading-none text-white transition hover:bg-brand-600"
      >
        +
      </button>
    </div>
  );
}
