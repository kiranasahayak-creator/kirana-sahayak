import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeDecimals } from "../utils/money";

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { storeId: req.storeId! },
    orderBy: { currentStock: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      currentStock: true,
      reorderLevel: true,
      unit: true,
      packSize: true,
    },
  });
  res.json(serializeDecimals(products));
});

const adjustSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int(), // positive = restock, negative = correction/loss
  note: z.string().optional(),
});

export const adjustInventory = asyncHandler(async (req: Request, res: Response) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "productId and quantity (non-zero integer) required" });
  }
  const { productId, quantity, note } = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: req.storeId! },
  });
  if (!product) return res.status(404).json({ error: "Product not found in this store" });

  const [updated] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } },
    }),
    prisma.inventoryTransaction.create({
      data: {
        storeId: req.storeId!,
        productId,
        type: "ADJUSTMENT",
        quantity,
        referenceId: note,
      },
    }),
  ]);

  res.json(serializeDecimals(updated));
});
