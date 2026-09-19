import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { recordSale } from "../services/saleService";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeDecimals } from "../utils/money";

const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  source: z.enum(["voice", "search", "quickadd", "mixed"]).optional(),
});

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid cart payload", details: parsed.error.flatten() });
  }

  const sale = await recordSale(req.storeId!, parsed.data.items, parsed.data.source);
  res.status(201).json(serializeDecimals(sale));
});

export const listSales = asyncHandler(async (req: Request, res: Response) => {
  const sales = await prisma.sale.findMany({
    where: { storeId: req.storeId! },
    orderBy: { transactionDate: "desc" },
    take: 50,
    include: { items: { include: { product: true } } },
  });
  res.json(serializeDecimals(sales));
});
