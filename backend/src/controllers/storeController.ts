import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const getStoreProfile = asyncHandler(async (req: Request, res: Response) => {
  const [store, salesCount, config] = await Promise.all([
    prisma.store.findUnique({
      where: { id: req.storeId! },
      select: { storeCode: true, storeName: true, location: true, createdAt: true },
    }),
    prisma.sale.count({ where: { storeId: req.storeId! } }),
    prisma.storeForecastConfig.findUnique({ where: { storeId: req.storeId! } }),
  ]);

  if (!store) return res.status(404).json({ error: "Store not found" });

  res.json({
    store,
    modelStatus: {
      salesRecorded: salesCount,
      dataMaturity: config?.dataMaturity ?? "cold_start",
      modelVersion: config?.modelVersion ?? null,
      lastTrainedAt: config?.lastTrainedAt ?? null,
      trainingDataFrom: config?.trainingDataFrom ?? null,
      trainingDataTo: config?.trainingDataTo ?? null,
      evaluationMAE: config?.evaluationMAE ?? null,
      evaluationRMSE: config?.evaluationRMSE ?? null,
      evaluationMAPE: config?.evaluationMAPE ?? null,
    },
  });
});
