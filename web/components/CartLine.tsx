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
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{line.product.name}</p>
        <p className="text-xs text-gray-500">₹{line.product.sellingPrice} each</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => (line.quantity <= 1 ? onRemove() : onChangeQuantity(line.quantity - 1))}
          aria-label="Decrease quantity"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          -
        </button>
        <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
        <button
          onClick={() => onChangeQuantity(line.quantity + 1)}
          aria-label="Increase quantity"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          +
        </button>
      </div>

      <p className="ml-4 w-16 shrink-0 text-right text-sm font-semibold text-gray-900">
        ₹{subtotal}
      </p>
      <button
        onClick={onRemove}
        aria-label="Remove item"
        className="ml-2 text-gray-400 hover:text-red-500"
      >
        ✕
      </button>
    </div>
  );
}
