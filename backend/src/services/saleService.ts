import { prisma } from "../config/prisma";
import { ApiError } from "../middleware/errorHandler";

export interface CartItemInput {
  productId: string;
  quantity: number;
}

/**
 * Records a sale for a store: validates products belong to that store and
 * have enough stock, then in a single DB transaction creates the Sale +
 * SaleItems, decrements Product.currentStock, and logs an
 * InventoryTransaction per item.
 *
 * This is what the SEND button ultimately calls. It never trusts anything
 * about product ownership from the client beyond the productId — every
 * product is re-verified as belonging to `storeId` inside the transaction.
 */
export async function recordSale(
  storeId: string,
  items: CartItemInput[],
  source: "voice" | "search" | "quickadd" | "mixed" = "mixed"
) {
  if (!items.length) {
    throw new ApiError(400, "Cart is empty");
  }
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new ApiError(400, `Invalid quantity for product ${item.productId}`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, storeId }, // storeId scoping — see note above
    });

    if (products.length !== new Set(productIds).size) {
      throw new ApiError(400, "One or more products were not found in this store's catalog");
    }

    const productById = new Map(products.map((p) => [p.id, p]));

    let totalItems = 0;
    let totalValue = 0;
    const saleItemsData = items.map((item) => {
      const product = productById.get(item.productId)!;
      if (product.currentStock < item.quantity) {
        throw new ApiError(
          400,
          `Not enough stock for ${product.name}: have ${product.currentStock}, need ${item.quantity}`
        );
      }
      const sellingPrice = Number(product.sellingPrice);
      const costPrice = Number(product.costPrice);
      const subtotal = sellingPrice * item.quantity;
      totalItems += item.quantity;
      totalValue += subtotal;

      return {
        productId: product.id,
        quantity: item.quantity,
        sellingPrice,
        costPrice,
        subtotal,
      };
    });

    const sale = await tx.sale.create({
      data: {
        storeId,
        totalItems,
        totalValue,
        source,
        items: { create: saleItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of saleItemsData) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          storeId,
          productId: item.productId,
          type: "SALE",
          quantity: -item.quantity,
          referenceId: sale.id,
        },
      });
    }

    return sale;
  });
}
