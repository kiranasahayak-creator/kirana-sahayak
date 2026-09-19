import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeDecimals } from "../utils/money";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;

  const products = await prisma.product.findMany({
    where: { storeId: req.storeId!, ...(category ? { category } : {}) },
    orderBy: { name: "asc" },
  });

  res.json(serializeDecimals(products));
});

export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.json([]);

  const products = await prisma.product.findMany({
    where: {
      storeId: req.storeId!,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { aliases: { some: { alias: { contains: q, mode: "insensitive" } } } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  res.json(serializeDecimals(products));
});
