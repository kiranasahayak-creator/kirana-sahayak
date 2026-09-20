import { getCategoryIcon } from "@/lib/categories";
import { Product } from "@/lib/types";

export function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const Icon = getCategoryIcon(product.category);

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-paper-100 bg-white p-4 shadow-card transition hover:shadow-elevated">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50">
        <Icon size={22} className="text-brand-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-semibold text-paper-900">
          {product.name}
        </p>
        <p className="mt-0.5 truncate text-sm text-paper-600">
          {product.brand ? `${product.brand} · ` : ""}
          {product.packSize} · <span className="font-medium text-paper-800">₹{product.sellingPrice}</span>
        </p>
      </div>
      <button
        onClick={onAdd}
        aria-label={`Add ${product.name}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl font-semibold leading-none text-white shadow-card transition hover:bg-brand-600 active:scale-95"
      >
        +
      </button>
    </div>
  );
}
