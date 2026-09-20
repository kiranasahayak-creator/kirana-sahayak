import { Minus, Plus, X } from "lucide-react";
import { CartLine as CartLineType } from "@/lib/types";

export function CartLine({
  line,
  onChangeQuantity,
  onRemove,
}: {
  line: CartLineType;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const subtotal = line.product.sellingPrice * line.quantity;

  return (
    <div className="flex items-center gap-3 border-b border-paper-100 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-semibold text-paper-900">{line.product.name}</p>
        <p className="text-sm text-paper-600">₹{line.product.sellingPrice} each</p>
      </div>

      <div className="flex items-center gap-1 rounded-full bg-paper-50 p-1">
        <button
          onClick={() => (line.quantity <= 1 ? onRemove() : onChangeQuantity(line.quantity - 1))}
          aria-label="Decrease quantity"
          className="flex h-9 w-9 items-center justify-center rounded-full text-paper-800 transition hover:bg-white hover:shadow-card"
        >
          <Minus size={16} />
        </button>
        <span className="w-7 text-center font-display font-semibold text-paper-900">
          {line.quantity}
        </span>
        <button
          onClick={() => onChangeQuantity(line.quantity + 1)}
          aria-label="Increase quantity"
          className="flex h-9 w-9 items-center justify-center rounded-full text-paper-800 transition hover:bg-white hover:shadow-card"
        >
          <Plus size={16} />
        </button>
      </div>

      <p className="w-16 shrink-0 text-right font-display font-semibold text-paper-900">
        ₹{subtotal}
      </p>
      <button
        onClick={onRemove}
        aria-label="Remove item"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-paper-400 transition hover:bg-red-50 hover:text-red-500"
      >
        <X size={16} />
      </button>
    </div>
  );
}
